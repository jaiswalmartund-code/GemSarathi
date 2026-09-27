import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "node:url";
import {
  connectDatabase,
  User,
  Vendor,
  Tender,
  Requirement,
  Bid,
  Document,
  DocumentExtraction,
  VerificationResult,
  Evidence,
  Evaluation as EvaluationModel,
  Award,
  AuditLog,
  MockProviderRecord,
  AadhaarRegistry
} from "../src/db/models.js";
import { ingestTenderPipeline } from "../src/services/verification/tenderIngestionService.js";
import { seedAcmeProviderRecords } from "./seed-acme-providers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function resetAndIngestTenders() {
  console.log("\n========================================================");
  console.log("   GEM VERIFIER V2 — RESET DB & INGEST 4 TENDERS");
  console.log("========================================================\n");

  await connectDatabase();

  // 1. Clear database collections (bids, tenders, requirements, extractions, results, evidence, etc.)
  console.log("🧹 Step 1: Clearing Bids, Tenders, Requirements, Documents & Extractions...");

  const safeDelete = async (model) => {
    try {
      await model.deleteMany({});
    } catch (e) {
      // Ignore if table does not exist in schema
    }
  };

  await safeDelete(VerificationResult);
  await safeDelete(Evidence);
  await safeDelete(DocumentExtraction);
  await safeDelete(Document);
  await safeDelete(Bid);
  await safeDelete(Requirement);
  await safeDelete(Tender);
  await safeDelete(EvaluationModel);
  await safeDelete(Award);
  await safeDelete(AuditLog);

  console.log("✅ Cleared Bids, Tenders, Requirements, Documents, Extractions & Evaluation tables.");

  // 2. Clear & Reset Users & Vendors to exactly 1 Officer & 1 Vendor (Acme Corporation)
  console.log("\n👤 Step 2: Resetting Users and Vendors to Default Credentials...");

  await User.deleteMany({});
  await Vendor.deleteMany({});

  const passwordHash = await bcrypt.hash("password123!", 10);

  // Default Officer User
  const officerUser = await User.create({
    email: "officer@procurement.gov.in",
    passwordHash: passwordHash,
    password_hash: passwordHash,
    role: "officer",
    name: "Procurement Officer",
    department: "Department of Digital Infrastructure",
    status: "Active"
  });

  // Default Vendor User
  const vendorUser = await User.create({
    email: "vendor@acme.com",
    passwordHash: passwordHash,
    password_hash: passwordHash,
    role: "vendor",
    name: "Acme Corporation",
    organization: "Acme Corporation",
    status: "Active"
  });

  const officerUserId = officerUser._id || officerUser.id;
  const vendorUserId = vendorUser._id || vendorUser.id;

  // Default Vendor Entity (Acme Corporation)
  const acmeVendor = await Vendor.create({
    userId: vendorUserId,
    user_id: vendorUserId,
    vendorCode: "VEN-ACME-001",
    vendor_code: "VEN-ACME-001",
    company_name: "Acme Corporation",
    legalName: "Acme Corporation",
    status: "Active",
    email: "vendor@acme.com",
    pan: "AACAC1234A",
    gstin: "07AACAC1234A1Z5",
    udyam_number: "UDYAM-DL-01-0001234"
  });

  console.log("✅ Users and Vendor reset complete:");
  console.log(`   - Officer: officer@procurement.gov.in (Password: password123!) [ID: ${officerUserId}]`);
  console.log(`   - Vendor: vendor@acme.com (Password: password123!) [ID: ${vendorUserId}, Vendor Code: VEN-ACME-001]`);

  // 3. Ensure Mock Provider Records & Aadhaar Registry are intact
  console.log("\n🏛️ Step 3: Verifying Mock Provider Registry Records...");
  try {
    await seedAcmeProviderRecords();
  } catch (e) {
    console.log("ℹ️ Mock Provider seeding skipped for DB mode:", e.message || e);
  }

  // 4. Ingest the 4 Tenders from demo-docs/tenders
  console.log("\n📄 Step 4: Ingesting 4 Tenders from demo-docs/tenders...");
  const tendersDir = path.resolve(__dirname, "../../demo-docs/tenders");
  const tenderFiles = [
    "GEM_2026_B_DEMO_001_Tender.pdf",
    "GEM_2026_B_DEMO_002_Tender.pdf",
    "GEM_2026_B_DEMO_003_Tender.pdf",
    "GEM_2026_B_DEMO_004_Tender.pdf"
  ];

  const ingestedSummary = [];

  for (let idx = 0; idx < tenderFiles.length; idx++) {
    const filename = tenderFiles[idx];
    const fullPath = path.join(tendersDir, filename);

    if (!fs.existsSync(fullPath)) {
      console.error(`❌ File not found: ${fullPath}`);
      continue;
    }

    console.log(`\n--------------------------------------------------------`);
    console.log(`[${idx + 1}/4] Ingesting: ${filename}`);
    console.log(`--------------------------------------------------------`);

    const pdfBuffer = fs.readFileSync(fullPath);
    const result = await ingestTenderPipeline({
      filePath: fullPath,
      buffer: pdfBuffer,
      originalFilename: filename,
      mimeType: "application/pdf",
      user: officerUser
    });

    if (result.success) {
      console.log(`✅ SUCCESS: Ingested '${result.tenderNumber}'`);
      console.log(`   - Title: ${result.tender?.title}`);
      console.log(`   - Requirements Extracted: ${result.requirementsCount}`);
      console.log(`   - Extraction Method: ${result.extractionMethod}`);
      console.log(`   - Storage Path: ${result.storagePath}`);

      ingestedSummary.push({
        file: filename,
        tenderNumber: result.tenderNumber,
        title: result.tender?.title,
        requirements: result.requirementsCount
      });
    } else {
      console.error(`❌ FAILED to ingest '${filename}': ${result.error}`);
    }
  }

  // 5. Final Verification & Summary
  console.log("\n========================================================");
  console.log("   DATABASE RESET AND INGESTION SUMMARY");
  console.log("========================================================");

  const totalUsers = await User.countDocuments({});
  const totalVendors = await Vendor.countDocuments({});
  const totalTenders = await Tender.countDocuments({});
  const totalReqs = await Requirement.countDocuments({});
  const totalBids = await Bid.countDocuments({});
  const totalMockProviders = await MockProviderRecord.countDocuments({});

  console.log(`- Users in DB: ${totalUsers} (1 Officer, 1 Vendor)`);
  console.log(`- Vendors in DB: ${totalVendors} (Acme Corporation)`);
  console.log(`- Tenders in DB: ${totalTenders}`);
  console.log(`- Tender Requirements in DB: ${totalReqs}`);
  console.log(`- Bids in DB: ${totalBids}`);
  console.log(`- Mock Provider Records in DB: ${totalMockProviders}`);

  console.log("\nIngested Tenders Detail:");
  ingestedSummary.forEach((s, i) => {
    console.log(`  ${i + 1}. [${s.tenderNumber}] ${s.title} (${s.requirements} requirements)`);
  });

  console.log("\n🎉 DATABASE RESET AND TENDER INGESTION COMPLETE!");
}

resetAndIngestTenders().then(() => process.exit(0)).catch(err => {
  console.error("❌ Reset & Ingest Error:", err);
  process.exit(1);
});
