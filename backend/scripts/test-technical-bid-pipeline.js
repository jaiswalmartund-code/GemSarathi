import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import {
  connectDatabase,
  Tender,
  Requirement,
  Vendor,
  Bid,
  Document,
  DocumentExtraction,
} from "../src/db/models.js";
import { extractTextFromFile } from "../src/services/documents/pdfExtractorService.js";
import { extractTechnicalBidFacts as understandTechnicalBid } from "../src/services/documents/documentExtractionService.js";
import { runBidVerificationPipeline, getBidComplianceMatrix } from "../src/services/verification/technicalVerificationService.js";
import { saveBuffer } from "../src/services/documents/fileStorageService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTechnicalBidTest() {
  console.log("=== V2 Technical Bid Pipeline Test ===");

  // 1. Target Technical Bid PDF Path Resolution
  const defaultPdfPath = path.resolve(__dirname, "../../demo-docs/bids/Apex_Network_Solutions_Technical_Bid.pdf");
  const pdfPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultPdfPath;

  console.log("\n=== CANONICAL PDF VERIFICATION & DIAGNOSTICS ===");
  console.log(`1. Absolute Resolved PDF Path: ${pdfPath}`);

  if (!fs.existsSync(pdfPath)) {
    console.error(`[FATAL ERROR] Canonical Technical Bid PDF not found at: ${pdfPath}`);
    process.exitCode = 1;
    return;
  }

  const filename = path.basename(pdfPath);
  const pdfBuffer = fs.readFileSync(pdfPath);
  const fileSize = pdfBuffer.length;
  const fileHash = crypto.createHash("sha256").update(pdfBuffer).digest("hex");

  console.log(`   Filename: ${filename}`);
  console.log(`   File Size: ${fileSize} bytes`);
  console.log(`   SHA-256 Hash: ${fileHash}`);

  await connectDatabase();

  // 2. Resolve Canonical Tender (GEM/2026/B/DEMO-001)
  const tenderNumber = "GEM/2026/B/DEMO-001";
  const tenderPdfPath = path.resolve(__dirname, "../../demo-docs/tenders/GEM_2026_B_DEMO_001_Tender.pdf");
  
  console.log(`\n2. Resolving canonical tender '${tenderNumber}' requirements...`);
  let tender = await Tender.findOne({
    $or: [{ tenderNumber }, { tender_number: tenderNumber }],
  });
  let tenderId = tender ? (tender._id || tender.id) : null;
  let requirements = tenderId ? await Requirement.find({
    $or: [{ tenderId }, { tender_id: tenderId }],
  }) : [];

  if (!tender || requirements.length < 5) {
    console.log("   Ingesting canonical tender requirements via Gemini AI...");
    const { ingestTenderPipeline } = await import("../src/services/verification/tenderIngestionService.js");
    const ingestRes = await ingestTenderPipeline({
      filePath: tenderPdfPath,
      originalFilename: "GEM_2026_B_DEMO_001_Tender.pdf",
      mimeType: "application/pdf",
      fileSize: fs.statSync(tenderPdfPath).size,
    });

    if (!ingestRes.success) {
      console.error(`[ERROR] Failed to ingest canonical tender: ${ingestRes.error}`);
      process.exitCode = 1;
      return;
    }

    tender = ingestRes.tender;
    tenderId = tender._id || tender.id;
    requirements = await Requirement.find({
      $or: [{ tenderId }, { tender_id: tenderId }],
    });
  }

  console.log(`\n2. Canonical Tender Resolved: ${tender.title || tender.referenceNumber}`);
  console.log(`   Tender ID: ${tenderId}`);
  console.log(`   Stored Requirements Count: ${requirements.length}`);

  // 3. Create or Find Vendor (Apex Network Solutions Private Limited)
  const vendorName = "Apex Network Solutions Private Limited";
  let vendor = await Vendor.findOne({
    $or: [
      { company_name: vendorName },
      { legalName: vendorName },
      { companyName: vendorName },
    ],
  });

  if (!vendor) {
    vendor = await Vendor.create({
      company_name: vendorName,
      legalName: vendorName,
      companyName: vendorName,
      contact_person: "Rahul Sharma",
      email: "rahul.sharma@apexnetworks.example",
      phone: "+91 98765 43210",
      status: "Active",
    });
  }

  const vendorId = vendor._id || vendor.id;
  console.log(`\n3. Bidder Vendor Resolved: ${vendor.legalName || vendor.companyName}`);
  console.log(`   Vendor ID: ${vendorId}`);

  // 4. Create or Find Bid Record
  let bid = await Bid.findOne({
    $or: [
      { tenderId, vendorId },
      { tender_id: tenderId, vendor_id: vendorId },
    ],
  });

  if (!bid) {
    bid = await Bid.create({
      tenderId,
      tender_id: tenderId,
      vendorId,
      vendor_id: vendorId,
      status: "DRAFT",
      submittedAt: new Date(),
      bidReference: "BID-APEX-001",
    });
  }

  const bidId = bid._id || bid.id;
  console.log(`\n4. Bid Record Resolved: ${bid.bidReference || bidId}`);
  console.log(`   Bid ID: ${bidId}`);

  // 5. Store PDF in Supabase / Storage and Create Document Record
  const storageResult = await saveBuffer(filename, pdfBuffer, "application/pdf");
  const normalizedStoragePath = (storageResult.storagePath || "").replace(/\\/g, "/");

  let doc = await Document.findOne({
    $or: [
      { bidId, documentType: "TECHNICAL_BID" },
      { bid_id: bidId, document_type: "TECHNICAL_BID" },
    ],
  });

  if (!doc) {
    doc = await Document.create({
      bidId,
      bid_id: bidId,
      tenderId,
      tender_id: tenderId,
      vendorId,
      vendor_id: vendorId,
      documentType: "TECHNICAL_BID",
      document_type: "TECHNICAL_BID",
      originalFilename: filename,
      original_filename: filename,
      storagePath: normalizedStoragePath,
      storage_path: normalizedStoragePath,
      mimeType: "application/pdf",
      mime_type: "application/pdf",
      fileSize,
      file_size: fileSize,
      fileHash,
      file_hash: fileHash,
      uploadStatus: "COMPLETED",
      upload_status: "COMPLETED",
      uploadedAt: new Date(),
    });
  }

  const docId = doc._id || doc.id;
  console.log(`\n5. Document Persisted: TECHNICAL_BID (${filename})`);
  console.log(`   Document ID: ${docId}`);
  console.log(`   Storage Path: ${normalizedStoragePath}`);

  // 6. PDF Text Extraction
  console.log("\n--- Step 1: PDF Text Extraction & Factual Validation ---");
  const pdfExtract = await extractTextFromFile(normalizedStoragePath, doc);
  const extractedText = pdfExtract.text || "";
  console.log(`- Extracted Text Length: ${extractedText.length} characters`);
  console.log(`- First ~500 characters of Extracted Text:\n--------------------------------------------------\n${extractedText.slice(0, 500)}\n--------------------------------------------------`);

  // Assert expected canonical document facts in extracted text
  const requiredTokens = ["ANS-SW48G-L3", "ANS-R8200", "ANS-FW2000", "30", "8", "6", "90 days"];
  const missingTokens = requiredTokens.filter((token) => !extractedText.includes(token));

  if (missingTokens.length > 0) {
    console.error(`[FATAL ERROR] Extracted text is missing required canonical tokens: ${missingTokens.join(", ")}`);
    console.error("Stopping test because the source text does not match the canonical Technical Bid PDF!");
    process.exitCode = 1;
    return;
  }
  console.log("✓ Text Validation Passed: Extracted PDF text contains all 7 canonical tokens ('ANS-SW48G-L3', 'ANS-R8200', 'ANS-FW2000', '30', '8', '6', '90 days').");

  let extraction = await DocumentExtraction.findOne({
    $or: [{ documentId: docId }, { document_id: docId }],
  });

  if (!extraction) {
    extraction = await DocumentExtraction.create({
      documentId: docId,
      document_id: docId,
      extractedText: extractedText,
      extracted_text: extractedText,
      extractionMethod: "pdf-text",
      extraction_method: "pdf-text",
      extractionStatus: "COMPLETED",
      extraction_status: "COMPLETED",
    });
  }

  // 7. Gemini Technical Bid Extraction
  console.log("\n--- Step 2: Gemini Structured Document Understanding ---");
  const startTime = Date.now();
  const geminiResult = await understandTechnicalBid(pdfExtract.text);
  const geminiDuration = Date.now() - startTime;

  if (!geminiResult.success) {
    console.error(`[FAILED] Gemini Technical Bid Extraction Failed: ${geminiResult.error}`);
    process.exitCode = 1;
    return;
  }

  console.log(`- Gemini Extraction Status: SUCCESS (${geminiDuration} ms)`);
  console.log(`- Bidder Company: ${geminiResult.data.bidder.companyName}`);
  console.log(`- Authorized Representative: ${geminiResult.data.bidder.authorizedRepresentative} (${geminiResult.data.bidder.designation})`);
  console.log("- Equipment Offered:");
  geminiResult.data.equipment.forEach((eq) => {
    console.log(`  * [${eq.category.toUpperCase()}] Model: ${eq.model || eq.makeModel}, Quantity: ${eq.quantity}`);
  });
  console.log("- Accessories Offered:");
  geminiResult.data.accessories.forEach((acc) => {
    console.log(`  * [${acc.category.toUpperCase()}] Model: ${acc.model}, Quantity: ${acc.quantity}`);
  });
  console.log(`- Warranty Offered: ${geminiResult.data.warranty.years} years`);
  console.log(`- Completion Period Offered: ${geminiResult.data.installation.completionDays} days`);

  const extTargetId = extraction._id || extraction.id;
  await DocumentExtraction.findByIdAndUpdate(extTargetId, {
    extractedData: JSON.stringify(geminiResult.data),
    extracted_data: JSON.stringify(geminiResult.data),
    extractionMethod: "gemini",
    extraction_method: "gemini",
    extractionStatus: "COMPLETED",
    extraction_status: "COMPLETED",
  });

  // 8. Deterministic Verification & Evidence Generation
  console.log("\n--- Step 3: Deterministic Verification & Evidence Generation ---");
  const verifyResult = await runBidVerificationPipeline(bidId);

  if (!verifyResult.success) {
    console.error(`[FAILED] Deterministic Verification Pipeline Failed: ${verifyResult.error}`);
    process.exitCode = 1;
    return;
  }

  console.log("\n=== TECHNICAL COMPLIANCE RESULTS ===");
  console.log(`- Evaluated Technical Requirements: ${verifyResult.score.totalRequirements}`);
  console.log(`- Passed: ${verifyResult.score.passed}`);
  console.log(`- Failed: ${verifyResult.score.failed}`);
  console.log(`- Under Review: ${verifyResult.score.review}`);
  console.log(`- Technical Compliance Score: ${verifyResult.score.value}%`);

  console.log("\n--- Evaluated Requirements Matrix ---");
  verifyResult.results.forEach((item, idx) => {
    console.log(`\n [#${idx + 1}] Requirement: ${item.requirementTitle}`);
    console.log(`     Status: [${item.status}]`);
    console.log(`     Offered Extracted Value: ${item.extractedValue}`);
    console.log(`     Expected Tender Value: ${item.expectedValue}`);
    console.log(`     Explanation: ${item.explanation}`);
    if (item.evidence && item.evidence.length) {
      item.evidence.forEach((ev) => {
        console.log(`     Evidence Quote (Page ${ev.page}): "${ev.text.replace(/\s+/g, " ").slice(0, 120)}..."`);
      });
    }
  });

  // 9. Verify Compliance Matrix API structure
  console.log("\n--- Step 4: Verification of API Response Output ---");
  const matrix = await getBidComplianceMatrix(bidId);
  console.log(`- Compliance Matrix API Score Output: ${matrix.score.value}% (${matrix.score.passed}/${matrix.score.totalRequirements} Passed)`);
  console.log(`- Results Count: ${matrix.results.length}`);

  console.log("\n[SUCCESS] V2 Technical Bid Verification Pipeline completed successfully.");
  process.exitCode = 0;
}

runTechnicalBidTest().catch((err) => {
  console.error("\n[FATAL ERROR]", err);
  process.exitCode = 1;
});
