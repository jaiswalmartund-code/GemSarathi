// Service: Tender Document Ingestion & Extraction Pipeline
// Handles PDF text extraction, scanned PDF detection, OCR fallback,
// AI tender understanding, storage persistence, and database persistence.

import { extractTextFromFile, performGeminiOcr } from "../documents/pdfExtractorService.js";
import { readFile, saveBuffer, saveUpload } from "../documents/fileStorageService.js";
import { documentUnderstandingService } from "../ai/documentUnderstandingService.js";
import { Tender, Requirement, Document } from "../../db/models.js";

async function ocrFallback(storagePathOrBuffer) {
  try {
    const buffer = Buffer.isBuffer(storagePathOrBuffer)
      ? storagePathOrBuffer
      : (typeof storagePathOrBuffer === "string" ? await readFile(storagePathOrBuffer) : null);
    if (buffer) {
      const ocrResult = await performGeminiOcr(buffer, "application/pdf");
      if (ocrResult && ocrResult.text && ocrResult.text.length >= 20) {
        return {
          text: ocrResult.text,
          pages: ocrResult.pages || 1,
          method: "gemini-ocr",
          scannedHint: false,
        };
      }
    }
  } catch (err) {
    console.error("[TenderIngestion Gemini OCR Error]:", err.message);
  }
  return {
    text: "",
    pages: null,
    method: "ocr-failed",
    scannedHint: true,
  };
}

export async function extractTenderContent(storagePath, options = {}) {
  try {
    const extracted = await extractTextFromFile(storagePath, options);
    const rawText = (extracted.text || "").trim();

    if (rawText.length < 50 || extracted.scannedHint) {
      const ocrResult = await ocrFallback(storagePath);
      if (ocrResult.text.trim().length >= 50) {
        return {
          text: ocrResult.text,
          pages: ocrResult.pages,
          extractionMethod: "ocr",
        };
      }
      return {
        text: rawText,
        pages: extracted.pages,
        extractionMethod: rawText.length > 0 ? "pdf_text" : "failed",
      };
    }

    const pageMap = {};
    if (rawText.includes("-- ")) {
      const pageBlocks = rawText.split(/--\s*(\d+)\s*of\s*\d+\s*--/i);
      for (let i = 1; i < pageBlocks.length; i += 2) {
        const pageNum = parseInt(pageBlocks[i], 10);
        const pageContent = pageBlocks[i + 1] || "";
        pageMap[pageNum] = pageContent.trim();
      }
    }

    return {
      text: rawText,
      pages: extracted.pages,
      pageMap,
      extractionMethod: "pdf_text",
    };
  } catch (error) {
    return {
      text: "",
      pages: null,
      pageMap: {},
      extractionMethod: "failed",
      error: error.message,
    };
  }
}

export async function ingestTenderPipeline({ filePath, buffer, originalFilename, mimeType = "application/pdf", user = null }) {
  const extraction = await extractTenderContent(filePath || buffer, { originalFilename, mimeType });
  if (extraction.extractionMethod === "failed" || !extraction.text || extraction.text.trim().length < 20) {
    return {
      success: false,
      error: "Failed to extract text from tender PDF. Scanned documents require an OCR provider.",
      stage: "extraction",
    };
  }

  const aiResult = await documentUnderstandingService.parseTenderNotice(extraction.text);
  if (!aiResult.success) {
    return aiResult;
  }

  const { tender: tenderData, requirements: reqData } = aiResult.data;

  // Persistence logic
  const tenderNumber = tenderData.tenderNumber || `GEM/2026/B/${Date.now()}`;
  let existingTender = await Tender.findOne({
    $or: [{ referenceNumber: tenderNumber }, { tender_number: tenderNumber }],
  });

  const tenderPayload = {
    referenceNumber: tenderNumber,
    tender_number: tenderNumber,
    title: tenderData.title,
    organization: tenderData.organization,
    department: tenderData.organization,
    description: tenderData.description,
    summary: tenderData.summary || tenderData.description,
    scope: tenderData.scope || tenderData.description,
    completionPeriod: tenderData.completionPeriodDays ? `${tenderData.completionPeriodDays} days` : (tenderData.completionPeriod || "90 days"),
    completion_period: tenderData.completionPeriodDays ? `${tenderData.completionPeriodDays} days` : (tenderData.completionPeriod || "90 days"),
    warrantyPeriod: tenderData.warrantyPeriod || "3 years",
    warranty_period: tenderData.warrantyPeriod || "3 years",
    estimatedValue: tenderData.estimatedValue ? parseFloat(tenderData.estimatedValue.replace(/[^0-9.]/g, "")) || 0 : 0,
    estimated_value: tenderData.estimatedValue ? parseFloat(tenderData.estimatedValue.replace(/[^0-9.]/g, "")) || 0 : 0,
    submissionDeadline: tenderData.submissionDeadline || new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
    submission_deadline: tenderData.submissionDeadline || new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
    status: "PUBLISHED",
    createdBy: user?.id || user?._id || "system",
  };

  let tenderId;
  if (existingTender) {
    tenderId = existingTender._id || existingTender.id;
    await Tender.findByIdAndUpdate(tenderId, tenderPayload);
  } else {
    const newTender = await Tender.create(tenderPayload);
    tenderId = newTender._id || newTender.id;
  }

  // Delete prior requirements if re-ingesting
  await Requirement.deleteMany({ $or: [{ tenderId }, { tender_id: tenderId }] });

  const reqDocsToInsert = reqData.map((r, idx) => ({
    tenderId,
    tender_id: tenderId,
    title: String(r.requirementName || "").slice(0, 95),
    requirement_name: String(r.requirementName || "").slice(0, 95),
    description: String(r.description || ""),
    category: String(r.requirementCategory || "").slice(0, 95),
    requirement_category: String(r.requirementCategory || "").slice(0, 95),
    requirementType: String(r.requirementType || "").slice(0, 95),
    requirement_type: String(r.requirementType || "").slice(0, 95),
    expectedValue: String(r.expectedValue || "").slice(0, 95),
    expected_value: String(r.expectedValue || "").slice(0, 95),
    expectedUnit: String(r.expectedUnit || "").slice(0, 95),
    expected_unit: String(r.expectedUnit || "").slice(0, 95),
    mandatory: r.mandatory,
    requiredDocumentType: String(r.requiredDocumentType || "").slice(0, 95),
    required_document_type: String(r.requiredDocumentType || "").slice(0, 95),
    verificationRule: String(r.verificationRule || "").slice(0, 95),
    verification_rule: String(r.verificationRule || "").slice(0, 95),
    sourcePage: r.sourcePage,
    source_page: r.sourcePage,
    sourceText: String(r.sourceText || ""),
    source_text: String(r.sourceText || ""),
    requirementOrder: idx + 1,
  }));

  const createdRequirements = await Requirement.insertMany(reqDocsToInsert);

  let savedFile;
  if (buffer) {
    savedFile = await saveBuffer(originalFilename || `${tenderNumber}.pdf`, buffer, mimeType, "tenders");
  } else {
    savedFile = await saveUpload({ path: filePath, originalname: originalFilename || `${tenderNumber}.pdf`, mimetype: mimeType }, "tenders");
  }

  const docRecord = await Document.create({
    tenderId,
    tender_id: tenderId,
    documentType: "TENDER_NOTICE",
    document_type: "TENDER_NOTICE",
    originalFilename: originalFilename || `${tenderNumber}.pdf`,
    filename: originalFilename || `${tenderNumber}.pdf`,
    storagePath: savedFile.storagePath,
    file_path: savedFile.storagePath,
    fileSize: savedFile.fileSize,
    mimeType,
  });

  tenderData.id = tenderId;
  tenderData._id = tenderId;
  tenderData.storagePath = savedFile.storagePath;

  return {
    success: true,
    tenderId,
    tenderNumber,
    tender: tenderData,
    requirements: reqData,
    requirementsCount: createdRequirements.length,
    extractionMethod: extraction.extractionMethod,
    extractedTextLength: (extraction.text || "").length,
    storagePath: savedFile.storagePath,
    documentId: docRecord._id || docRecord.id,
  };
}
