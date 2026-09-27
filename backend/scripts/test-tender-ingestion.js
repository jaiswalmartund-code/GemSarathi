import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { connectDatabase } from "../src/db/models.js";
import { ingestTenderPipeline } from "../src/services/verification/tenderIngestionService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTest() {
  console.log("=== V2 Tender Ingestion Test ===");

  const candidates = [
    process.argv[2] ? path.resolve(process.argv[2]) : null,
    path.resolve(__dirname, "../../demo-docs/tenders/GEM_2026_B_DEMO_001_Tender.pdf"),
    path.resolve(__dirname, "../../demo-docs/GEM_2026_B_DEMO_001_Tender.pdf"),
    path.resolve(__dirname, "../../demo-docs/Tender-Notice-GEM-2026-B-1001.pdf"),
    path.resolve(__dirname, "../demo-docs/tenders/GEM_2026_B_DEMO_001_Tender.pdf"),
  ].filter(Boolean);

  const pdfPath = candidates.find((p) => fs.existsSync(p));

  if (!pdfPath) {
    console.error(`[ERROR] Test PDF file not found in demo-docs candidate paths.`);
    process.exitCode = 1;
    return;
  }

  const filename = path.basename(pdfPath);
  const fileSize = fs.statSync(pdfPath).size;

  console.log(`1. Target PDF Filename: ${filename}`);
  console.log(`   File Path: ${pdfPath}`);
  console.log(`   File Size: ${fileSize} bytes`);

  // Ensure DB connection is initialized
  await connectDatabase();

  console.log("\n--- Executing Ingestion Pipeline ---");
  const startTime = Date.now();
  const result = await ingestTenderPipeline({
    filePath: pdfPath,
    originalFilename: filename,
    mimeType: "application/pdf",
    fileSize
  });
  const durationMs = Date.now() - startTime;

  if (!result.success) {
    console.error("\n[FAILED] Ingestion Pipeline Failed!");
    console.error(`   Stage: ${result.stage}`);
    console.error(`   Error: ${result.error}`);
    process.exitCode = 1;
    return;
  }

  const eligibilityReqs = result.requirements.filter(
    (r) => (r.requirementCategory || r.category || "").toLowerCase() === "eligibility"
  );
  const technicalReqs = result.requirements.filter(
    (r) => (r.requirementCategory || r.category || "").toLowerCase() !== "eligibility"
  );

  console.log("\n=== INGESTION RESULTS ===");
  console.log(`- Filename: ${filename}`);
  console.log(`- Extraction Method: ${result.extractionMethod}`);
  console.log(`- Extracted Text Length: ${result.extractedTextLength} characters`);
  console.log(`- Gemini Parsing Status: SUCCESS (${durationMs} ms)`);
  console.log(`- Tender Number: ${result.tender.tenderNumber}`);
  console.log(`- Tender Title: ${result.tender.title}`);
  console.log(`- Organization: ${result.tender.organization}`);
  console.log(`- Submission Deadline: ${result.tender.submissionDeadline}`);
  console.log(`- Submission Deadline Source Page: Page ${result.tender.submissionDeadlineSourcePage || 1}`);
  console.log(`- Submission Deadline Source Quote: "${result.tender.submissionDeadlineSourceText || ""}"`);
  console.log(`- Storage Path: ${result.tender.storagePath}`);
  console.log(`- Total Requirements Extracted: ${result.requirements.length}`);
  console.log(`  - Eligibility Requirements: ${eligibilityReqs.length}`);
  console.log(`  - Technical / Specification Requirements: ${technicalReqs.length}`);

  console.log("\n--- A. Eligibility Requirements ---");
  eligibilityReqs.forEach((req, idx) => {
    console.log(`\n [Eligibility #${idx + 1}] ${req.requirementName}`);
    console.log(`   - Type: ${req.requirementType}`);
    console.log(`   - Expected Value: ${req.expectedValue || "N/A"} ${req.expectedUnit ? `(${req.expectedUnit})` : ""}`);
    console.log(`   - Mandatory: ${req.mandatory}`);
    console.log(`   - Required Doc Type: ${req.requiredDocumentType}`);
    console.log(`   - Source Page: Page ${req.sourcePage !== null && req.sourcePage !== undefined ? req.sourcePage : "N/A"}`);
    if (req.sourceText) {
      console.log(`   - Source Excerpt: "${req.sourceText.replace(/\s+/g, " ").slice(0, 120)}..."`);
    }
  });

  console.log("\n--- B. Technical & Specification Requirements ---");
  technicalReqs.forEach((req, idx) => {
    console.log(`\n [Technical/Spec #${idx + 1}] ${req.requirementName}`);
    console.log(`   - Category: ${req.requirementCategory || req.category}`);
    console.log(`   - Type: ${req.requirementType}`);
    console.log(`   - Expected Value: ${req.expectedValue || "N/A"} ${req.expectedUnit ? `(${req.expectedUnit})` : ""}`);
    console.log(`   - Mandatory: ${req.mandatory}`);
    console.log(`   - Required Doc Type: ${req.requiredDocumentType}`);
    console.log(`   - Source Page: Page ${req.sourcePage !== null && req.sourcePage !== undefined ? req.sourcePage : "N/A"}`);
    if (req.sourceText) {
      console.log(`   - Source Excerpt: "${req.sourceText.replace(/\s+/g, " ").slice(0, 120)}..."`);
    }
  });

  console.log("\n--- Persistence Summary ---");
  console.log(`- Tender DB ID: ${result.tender.id || result.tender._id}`);
  console.log(`- Supabase / Database Persistence Result: SUCCESS (Tender & ${result.requirements.length} Requirements persisted)`);
  console.log(`- Supabase Storage Result: SUCCESS (PDF saved to '${result.tender.storagePath}')`);

  console.log("\n[SUCCESS] V2 Tender Ingestion Pipeline validation pass completed successfully.");
  process.exitCode = 0;
}

runTest().catch((err) => {
  console.error("\n[FATAL ERROR]", err);
  process.exitCode = 1;
});
