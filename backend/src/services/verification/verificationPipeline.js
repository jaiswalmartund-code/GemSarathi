// Verification Pipeline Coordinator
// Orchestrates: Tender + Bids -> text extraction -> document understanding AI adapter -> government verification -> deterministic scoring -> ComplianceResult rows.

import { extractTextFromFile } from "../documents/pdfExtractorService.js";
import { documentUnderstandingService } from "../ai/documentUnderstandingService.js";
import { governmentVerificationService } from "../government/governmentVerificationService.js";
import { calculateComplianceScore, KEY_TO_REQ } from "../scoring/scoringService.js";
import {
  Bid,
  ComplianceResult,
  Document,
  Evaluation as EvaluationModel,
  Requirement,
  Tender,
  Vendor,
} from "../../db/models.js";

const STATUTORY_DEFAULTS = [
  { title: "Udyam / MSME registration", category: "Statutory", mandatory: true },
  { title: "GST registration and return filing", category: "Statutory", mandatory: true },
  { title: "PAN and Income Tax compliance", category: "Statutory", mandatory: true },
  { title: "Debarment / blacklisting check", category: "Statutory", mandatory: true },
  { title: "EPFO / ESIC compliance", category: "Statutory", mandatory: false },
  { title: "Make in India local content declaration", category: "Statutory", mandatory: false },
];

async function ensureRequirements(tenderId, existing) {
  const titles = new Set(existing.map((r) => r.title.toLowerCase()));
  let order = existing.reduce((m, r) => Math.max(m, r.requirementOrder || 0), 0);
  for (const def of STATUTORY_DEFAULTS) {
    if (titles.has(def.title.toLowerCase())) continue;
    order += 1;
    const created = await Requirement.create({
      tenderId,
      title: def.title,
      description: `Auto-added statutory check: ${def.title}. Verified against portal snapshot + bid documents.`,
      category: def.category,
      mandatory: def.mandatory,
      requirementOrder: order,
    });
    existing.push(created.toObject ? created.toObject() : created);
  }
  return existing;
}

function requirementForCheck(check, requirements) {
  if (check.requirementId) return check.requirementId;
  for (const [regex, key] of KEY_TO_REQ) {
    if (check.key !== key) continue;
    const hit = requirements.find((r) => regex.test(`${r.title} ${r.description}`));
    if (hit) return hit._id || hit.id;
  }
  const fallback = requirements[0];
  return fallback ? fallback._id || fallback.id : null;
}

export async function analyzeEvaluation(evaluationId, actor) {
  const evaluation = await EvaluationModel.findById(evaluationId);
  if (!evaluation) {
    const error = new Error("Evaluation not found");
    error.status = 404;
    throw error;
  }
  const ev = evaluation.toObject ? evaluation.toObject() : evaluation;
  const tender = await Tender.findById(ev.tenderId).lean();
  if (!tender) {
    const error = new Error("Tender not found for evaluation");
    error.status = 404;
    throw error;
  }

  let requirements = await Requirement.find({ tenderId: tender._id }).sort({ requirementOrder: 1 }).lean();
  requirements = await ensureRequirements(tender._id, requirements);

  const tenderDocs = await Document.find({ tenderId: tender._id }).lean();
  let tenderText = tender.description || "";
  for (const doc of tenderDocs.filter((d) => !d.bidId)) {
    try {
      const extracted = await extractTextFromFile(doc.storagePath, doc);
      tenderText += `\n${extracted.text}`;
    } catch {
      // ignore
    }
  }

  const bids = await Bid.find({ tenderId: tender._id }).lean();
  if (!bids.length) {
    const error = new Error("No bids submitted for this tender yet. Ask vendors to submit via the Vendor portal first.");
    error.status = 409;
    throw error;
  }
  const vendors = await Vendor.find({ _id: { $in: bids.map((b) => b.vendorId) } }).lean();

  const mode = documentUnderstandingService.getMode();
  await ComplianceResult.deleteMany({ evaluationId: ev._id });

  const vendorSummaries = {};
  let totalResults = 0;

  for (const bid of bids) {
    const vendor = vendors.find((v) => v._id === bid.vendorId);
    const docs = await Document.find({ bidId: bid._id }).lean();
    let docText = "";
    let sourceDocumentId = null;
    for (const doc of docs) {
      try {
        const extracted = await extractTextFromFile(doc.storagePath, doc);
        docText += `\n--- ${doc.originalFilename} ---\n${extracted.text}`;
        if (!sourceDocumentId) sourceDocumentId = doc._id || doc.id;
      } catch {
        docText += `\n--- ${doc.originalFilename} (unreadable) ---\n`;
      }
    }
    docText += `\n--- bid form ---\n${JSON.stringify(bid.bidMetadata || {})}\nVendor: ${vendor?.legalName || ""} GSTIN:${vendor?.organization?.gstin || ""}`;

    // Government portal cross-checks via government verification service
    const portal = await governmentVerificationService.verifyVendorOnPortals(
      {
        udyamNo: vendor?.organization?.udyamNo,
        gstin: vendor?.organization?.gstin,
        pan: vendor?.organization?.pan,
        vendorCode: vendor?.vendorCode,
        legalName: vendor?.legalName,
      },
      { documentNames: docs.map((d) => d.originalFilename) }
    );

    const checks = [];
    const push = (c) => checks.push({ confidence: 0.85, ...c });

    for (const key of Object.keys(portal.results)) {
      const p = portal.results[key];
      push({
        key,
        mandatory: true,
        weight: 10,
        status: p.status === "verified" ? "compliant" : p.status === "mismatch" ? "non_compliant" : "needs_review",
        evidenceText: p.detail,
        exactQuote: p.detail,
        explanation: p.detail,
      });
    }

    // AI Adjudication for ambiguous items if LLM mode is active
    if (mode !== "heuristic") {
      for (const check of checks) {
        if (check.status !== "needs_review") continue;
        const ai = await documentUnderstandingService.adjudicate({
          requirementTitle: check.requirementTitle || check.key,
          requirementDesc: requirements.find((r) => (r._id || r.id) === check.requirementId)?.description || "",
          currentEvidence: check.evidenceText,
          docText,
        });
        check.geminiPrompt = ai?.prompt || null;
        check.geminiResponse = ai?.response || ai?.raw || ai?.error || null;
        if (ai && !ai.error && (ai.verdict === "compliant" || ai.verdict === "non_compliant")) {
          check.status = ai.verdict;
          check.confidence = ai.confidence;
          if (ai.quote) {
            check.exactQuote = ai.quote;
            check.evidenceText = `AI-verified: "${ai.quote}"`;
          }
          check.explanation = `AI adjudication (${ai.model}): ${ai.reasoning}`;
          check.determinationSource = "ai-adjudicated";
        }
      }
    }

    const scoring = calculateComplianceScore(checks, vendor);

    const hayOf = (d) => `${d.originalFilename || ""} ${d.documentType || ""}`.toLowerCase();
    const technicalDoc = docs.find((d) => /technical|proposal/i.test(hayOf(d))) || docs[0];

    const rows = checks.map((check) => ({
      evaluationId: ev._id,
      tenderId: tender._id,
      requirementId: requirementForCheck(check, requirements),
      vendorId: bid.vendorId,
      bidId: bid._id,
      status: check.status,
      evidenceText: check.evidenceText,
      sourceDocumentId: technicalDoc?._id || sourceDocumentId,
      pageNumber: null,
      explanation: check.explanation,
      confidence: check.confidence,
      determinationSource: check.determinationSource || (mode.startsWith("gemini") ? "ai-gemini" : "ai-heuristic"),
      geminiPrompt: check.geminiPrompt || null,
      geminiResponse: check.geminiResponse || null,
      humanReviewed: false,
    }));
    await ComplianceResult.insertMany(rows);
    totalResults += rows.length;

    vendorSummaries[bid.vendorId] = {
      vendorName: vendor?.legalName || bid.vendorId,
      bidId: bid._id,
      bidReference: bid.bidReference,
      score: scoring.score,
      riskLevel: scoring.riskLevel,
      recommendation: scoring.recommendation,
      eligible: scoring.eligible,
    };
  }

  const summary = {
    mode,
    generatedAt: new Date().toISOString(),
    generatedBy: actor?.id || "system",
    vendors: vendorSummaries,
    totalResults,
  };
  const evalDoc = await EvaluationModel.findById(ev._id);
  Object.assign(evalDoc, { overallSummary: JSON.stringify(summary) });
  await evalDoc.save();

  return { evaluation: evalDoc.toObject(), summary };
}
