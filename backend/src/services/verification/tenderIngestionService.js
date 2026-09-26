// Service: Tender Document Ingestion & Extraction Pipeline
// Handles PDF text extraction, scanned PDF detection, OCR fallback,
// AI tender understanding, storage persistence, and database persistence.

import { extractTextFromFile } from "../documents/pdfExtractorService.js";
import { documentUnderstandingService } from "../ai/documentUnderstandingService.js";
import { saveBuffer, saveUpload } from "../documents/fileStorageService.js";
import { Tender, Requirement, Document } from "../../db/models.js";

async function ocrFallback(storagePathOrBuffer) {
  return {
    text: "",
    pages: null,
    method: "ocr",
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
    title: r.requirementName,
    requirement_name: r.requirementName,
    description: r.description,
    category: r.requirementCategory,
    requirement_category: r.requirementCategory,
    requirementType: r.requirementType,
    requirement_type: r.requirementType,
    expectedValue: r.expectedValue,
    expected_value: r.expectedValue,
    expectedUnit: r.expectedUnit,
    expected_unit: r.expectedUnit,
    mandatory: r.mandatory,
    requiredDocumentType: r.requiredDocumentType,
    required_document_type: r.requiredDocumentType,
    verificationRule: r.verificationRule,
    verification_rule: r.verificationRule,
    sourcePage: r.sourcePage,
    source_page: r.sourcePage,
    sourceText: r.sourceText,
    source_text: r.sourceText,
    requirementOrder: idx + 1,
  }));

  const createdRequirements = await Requirement.insertMany(reqDocsToInsert);

  let savedFile;
  if (buffer) {
    savedFile = await saveBuffer(originalFilename || `${tenderNumber}.pdf`, buffer, mimeType);
  } else {
    savedFile = await saveUpload({ path: filePath, originalname: originalFilename || `${tenderNumber}.pdf`, mimetype: mimeType });
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

  return {
    success: true,
    tenderId,
    tenderNumber,
    tender: tenderData,
    requirementsCount: createdRequirements.length,
    documentId: docRecord._id || docRecord.id,
  };
}
