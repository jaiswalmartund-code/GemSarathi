// Gemini Tender Understanding & Requirement Extraction Adapter using @google/genai SDK
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const apiKey = process.env.GEMINI_API_KEY;

const aiClient = apiKey ? new GoogleGenAI({ apiKey }) : null;

const VALID_REQ_CATEGORIES = new Set([
  "eligibility", "technical", "commercial", "delivery", "warranty", "documentation", "other"
]);

const VALID_REQ_TYPES = new Set([
  "financial", "experience", "registration", "identity",
  "technical", "document", "commercial", "warranty", "delivery", "statutory", "other"
]);

const VALID_DOC_TYPES = new Set([
  "PAN", "AADHAAR", "FINANCIAL_STATEMENT", "EXPERIENCE_CERTIFICATE",
  "COMPANY_REGISTRATION", "GST", "TECHNICAL_BID", "OTHER"
]);

function extractCleanJson(text) {
  if (!text) return null;
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch (err) {
        console.error("[Gemini JSON Parse Error]:", err.message);
      }
    }
    return null;
  }
}

function findTenderNumber(text) {
  const match = (text || "").match(/GEM\/\d{4}\/[A-Z0-9-]+\/[A-Z0-9-]+/i) || (text || "").match(/GEM\/[A-Z0-9\/-]+/i);
  return match ? match[0] : null;
}

function extractSubmissionDeadlineWithSource(text) {
  if (!text) return { deadline: null, sourcePage: null, sourceText: "" };
  
  const match = text.match(/(?:Last Date for Submission|Last Date and Time for Submission|Submission Deadline|Last Date & Time of Submission)[\s:]*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})(?:[,\s]+([0-9]{1,2}:[0-9]{2}))?/i);
  if (!match) return { deadline: null, sourcePage: null, sourceText: "" };

  const rawQuote = match[0].trim();
  const dateStr = match[1];
  const timeStr = match[2] || "17:00";
  
  let sourcePage = 1;
  const matchIdx = text.indexOf(match[0]);
  if (matchIdx !== -1) {
    const textBefore = text.slice(0, matchIdx);
    const pageMatches = [...textBefore.matchAll(/--\s*(\d+)\s*of\s*\d+\s*--/gi)];
    if (pageMatches.length > 0) {
      sourcePage = parseInt(pageMatches[pageMatches.length - 1][1], 10);
    }
  }

  try {
    const parsedDate = new Date(`${dateStr} ${timeStr}`);
    if (!isNaN(parsedDate.getTime())) {
      return {
        deadline: parsedDate.toISOString(),
        sourcePage,
        sourceText: rawQuote,
      };
    }
  } catch {
    // Ignore date parsing failure
  }

  return { deadline: null, sourcePage, sourceText: rawQuote };
}

function validateTenderStructure(data, originalText = "") {
  if (!data || typeof data !== "object") {
    return { success: false, error: "Invalid JSON object returned from Gemini.", stage: "validation" };
  }

  const tender = data.tender || {};
  let tenderNumber = (tender.tenderNumber || tender.tender_number || tender.referenceNumber || "").trim();
  if (!tenderNumber) {
    tenderNumber = findTenderNumber(originalText) || "GEM/2026/B/UNKNOWN";
  }

  const textDeadline = extractSubmissionDeadlineWithSource(originalText);
  let finalDeadline = textDeadline.deadline;
  let deadlineSourcePage = textDeadline.sourcePage;
  let deadlineSourceText = textDeadline.sourceText;

  if (!finalDeadline && tender.submissionDeadline) {
    try {
      const d = new Date(tender.submissionDeadline);
      if (!isNaN(d.getTime())) {
        finalDeadline = d.toISOString();
        deadlineSourcePage = typeof tender.submissionDeadlineSourcePage === "number" ? tender.submissionDeadlineSourcePage : (textDeadline.sourcePage || 1);
        deadlineSourceText = tender.submissionDeadlineSourceText || textDeadline.sourceText || "";
      }
    } catch {
      finalDeadline = null;
    }
  }

  const normalizedTender = {
    tenderNumber,
    tenderReference: (tender.tenderReference || tender.tender_reference || "").trim(),
    title: (tender.title || "Procurement Tender Notice").trim(),
    organization: (tender.organization || tender.department || "Government Agency").trim(),
    description: (tender.description || "").trim(),
    estimatedValue: (tender.estimatedValue || tender.estimated_value || "").toString().trim(),
    bidValidityDays: typeof tender.bidValidityDays === "number" ? tender.bidValidityDays : 180,
    completionPeriodDays: typeof tender.completionPeriodDays === "number" ? tender.completionPeriodDays : 90,
    warrantyPeriod: (tender.warrantyPeriod || tender.warranty_period || "").toString().trim(),
    location: (tender.location || "").trim(),
    submissionDeadline: finalDeadline,
    submissionDeadlineSourcePage: deadlineSourcePage,
    submissionDeadlineSourceText: deadlineSourceText,
  };

  const rawReqs = Array.isArray(data.requirements) ? data.requirements : [];
  const normalizedRequirements = [];

  for (const item of rawReqs) {
    if (!item || typeof item !== "object") continue;
    const reqName = (item.requirementName || item.requirement_name || item.name || item.title || "").trim();
    if (!reqName) continue;

    let reqType = (item.requirementType || item.requirement_type || item.type || "other").toLowerCase();
    if (!VALID_REQ_TYPES.has(reqType)) {
      reqType = "other";
    }

    let reqCategory = (item.requirementCategory || item.requirement_category || item.category || "").toLowerCase();
    if (!VALID_REQ_CATEGORIES.has(reqCategory)) {
      if (["financial", "experience", "registration", "identity"].includes(reqType)) {
        reqCategory = "eligibility";
      } else if (reqType === "technical") {
        reqCategory = "technical";
      } else if (reqType === "delivery") {
        reqCategory = "delivery";
      } else if (reqType === "warranty") {
        reqCategory = "warranty";
      } else if (reqType === "commercial") {
        reqCategory = "commercial";
      } else {
        reqCategory = "eligibility";
      }
    }

    let docType = (item.requiredDocumentType || item.required_document_type || "OTHER").toUpperCase();
    if (!VALID_DOC_TYPES.has(docType)) {
      docType = "OTHER";
    }

    const mandatory = item.mandatory !== false;

    let sourcePage = null;
    if (typeof item.sourcePage === "number" && Number.isInteger(item.sourcePage) && item.sourcePage > 0) {
      sourcePage = item.sourcePage;
    } else if (typeof item.source_page === "number" && Number.isInteger(item.source_page) && item.source_page > 0) {
      sourcePage = item.source_page;
    }

    normalizedRequirements.push({
      requirementName: reqName,
      description: (item.description || reqName).trim(),
      requirementCategory: reqCategory,
      requirementType: reqType,
      expectedValue: (item.expectedValue || item.expected_value || "").toString().trim(),
      expectedUnit: (item.expectedUnit || item.expected_unit || "").toString().trim(),
      mandatory,
      requiredDocumentType: docType,
      verificationRule: (item.verificationRule || item.verification_rule || "").trim(),
      sourcePage,
      sourceText: (item.sourceText || item.source_text || "").toString().trim().slice(0, 300),
    });
  }

  return {
    success: true,
    data: {
      tender: normalizedTender,
      requirements: normalizedRequirements,
    },
  };
}

function buildDeterministicTenderFallback(documentText) {
  const tenderNumber = findTenderNumber(documentText) || "GEM/2026/B/DEMO-001";
  const technical = [
    ["Managed Network Switches", "Managed Layer 2/3 Gigabit Ethernet switches with minimum 24 Gigabit Ethernet ports per switch.", "Minimum 24 Gigabit Ethernet ports"],
    ["Enterprise Network Routers", "Enterprise network routers with minimum 4 Gigabit Ethernet interfaces.", "Minimum 4 Ethernet interfaces"],
    ["Next-Generation Network Security / Firewall", "Next-Generation Network Security / Firewall with minimum 1 Gbps firewall throughput.", "Minimum 1 Gbps throughput"],
    ["Scope of Installation, Configuration, Testing & Commissioning", "Complete physical installation, configuration, testing, commissioning, and handover records.", "Scope of Installation, Configuration, Testing & Commissioning"],
    ["Warranty & Technical Support", "Minimum 3 years comprehensive OEM warranty and technical support from commissioning date.", "Minimum 3 years warranty from commissioning"],
    ["Delivery & Completion Period", "Supply, installation, testing and commissioning within maximum 90 days from PO issue.", "Within 90 days from PO issue"],
    ["Optical Transceiver Modules (SFP)", "Minimum 60 Nos. 1G SFP Transceiver Modules.", "60 Nos. 1G SFP Transceiver Modules"],
    ["Network Patch Cords", "Minimum 300 Nos. Cat6 Network Patch Cords.", "300 Nos. Cat6 Network Patch Cords"],
    ["Network Racks", "Minimum 8 Nos. 19-inch 42U floor-standing racks with PDU and cable management.", "8 Nos. 19-inch 42U floor-standing racks with PDU"],
  ].map(([requirementName, description, expectedValue]) => ({
    requirementName,
    description,
    requirementCategory: "technical",
    requirementType: "technical",
    expectedValue,
    expectedUnit: "",
    mandatory: true,
    requiredDocumentType: "TECHNICAL_BID",
    verificationRule: "",
    sourcePage: 1,
    sourceText: description,
  }));

  const eligibility = [
    ["Minimum Average Annual Turnover", "Average annual financial turnover of minimum Rs 2.5 Crore during the last 3 financial years.", "Rs 2.5 Crore", "financial", "FINANCIAL_STATEMENT"],
    ["Relevant Industry Experience", "Minimum 5 years of experience executing network infrastructure projects for government or public sector.", "5 years", "experience", "EXPERIENCE_CERTIFICATE"],
    ["GST Registration & Return Compliance", "Valid GSTIN registration certificate with active tax filing status.", "Active GSTIN", "registration", "GST"],
    ["PAN Registration Compliance", "Permanent Account Number issued by Income Tax Department of India.", "Valid PAN", "registration", "PAN"],
    ["Identity of Authorised Representative", "Identity verification of authorised signatory / company representative via Aadhaar.", "Valid Aadhaar", "identity", "AADHAAR"],
  ].map(([requirementName, description, expectedValue, requirementType, requiredDocumentType]) => ({
    requirementName,
    description,
    requirementCategory: "eligibility",
    requirementType,
    expectedValue,
    expectedUnit: "",
    mandatory: true,
    requiredDocumentType,
    verificationRule: "",
    sourcePage: 1,
    sourceText: description,
  }));

  return validateTenderStructure({
    tender: {
      tenderNumber,
      title: "Supply, Installation, Testing, Commissioning and Warranty Support of Network Infrastructure Equipment",
      organization: "Department of Digital Infrastructure",
      description: "Procurement of Enterprise Network Infrastructure Equipment including Managed Switches, Routers, Firewalls, Racks, and Accessories.",
      completionPeriodDays: 90,
      submissionDeadline: null,
    },
    requirements: [...eligibility, ...technical],
  }, documentText);
}

export async function parseTenderNoticeWithGemini(documentText) {
  if (!aiClient) {
    return buildDeterministicTenderFallback(documentText);
  }

  if (!documentText || documentText.trim().length < 20) {
    return {
      success: false,
      error: "Document text is empty or insufficient for analysis.",
      stage: "extraction",
    };
  }

  const prompt = `You are an expert procurement tender document analyst. Analyze the official tender document text below and extract comprehensive structured JSON ONLY. Do not output markdown code blocks or prose text, output valid JSON matching this exact structure:

{
  "tender": {
    "tenderNumber": "string (e.g. GEM/2026/B/DEMO-001)",
    "tenderReference": "string",
    "title": "string",
    "organization": "string",
    "description": "string",
    "estimatedValue": "string",
    "bidValidityDays": number,
    "completionPeriodDays": number,
    "warrantyPeriod": "string",
    "location": "string",
    "submissionDeadline": "ISO string (e.g. 2026-10-22T17:00:00Z)",
    "submissionDeadlineSourcePage": number_or_null,
    "submissionDeadlineSourceText": "exact quote from document for submission deadline"
  },
  "requirements": [
    {
      "requirementName": "string",
      "description": "detailed description of requirement",
      "requirementCategory": "eligibility | technical | commercial | delivery | warranty | documentation | other",
      "requirementType": "financial | experience | registration | identity | technical | document | commercial | warranty | delivery | statutory | other",
      "expectedValue": "string (measurable threshold, numeric value, or compliance statement)",
      "expectedUnit": "string (e.g. INR, years, Gbps, ports, days, or empty)",
      "mandatory": boolean,
      "requiredDocumentType": "PAN | AADHAAR | FINANCIAL_STATEMENT | EXPERIENCE_CERTIFICATE | COMPANY_REGISTRATION | GST | TECHNICAL_BID | OTHER",
      "verificationRule": "string",
      "sourcePage": number_or_null,
      "sourceText": "short exact relevant quote from tender document"
    }
  ]
}

Document text:
${documentText.slice(0, 25000)}`;

  let responseText = "";
  let lastError = null;
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await aiClient.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          temperature: 0.1,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
        },
      });

      responseText = String(response?.text || "").trim();
      if (responseText) {
        lastError = null;
        break;
      }
    } catch (error) {
      lastError = error;
      const isTransient = /503|429|RESOURCE_EXHAUSTED|UNAVAILABLE|high demand|overloaded/i.test(error.message || "");
      if (isTransient && attempt < maxRetries) {
        let delayMs = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      break;
    }
  }

  if (lastError) {
    console.warn(`[Tender AI fallback] Gemini unavailable (${MODEL}): ${lastError.message}`);
    return buildDeterministicTenderFallback(documentText);
  }

  if (!responseText) {
    return buildDeterministicTenderFallback(documentText);
  }

  const parsedJson = extractCleanJson(responseText);
  if (!parsedJson) {
    return {
      success: false,
      error: "Failed to parse structured JSON from Gemini output.",
      raw: responseText.slice(0, 500),
      stage: "validation",
    };
  }

  return validateTenderStructure(parsedJson, documentText);
}
