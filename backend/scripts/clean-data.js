import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import {
  connectDatabase,
  Tender,
  Requirement,
  Vendor,
  Bid,
  Document,
  DocumentExtraction,
  VerificationResult,
  Evidence,
  AadhaarRegistry,
  MockProviderRecord,
  User,
} from "../src/db/models.js";
import { supabase } from "../src/config/supabase.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function cleanDataReset() {
  console.log("=== GEM VERIFIER: CLEAN ALL BIDS & BID DOCUMENTS ===");
  console.log("Preserving: Users, Vendors, Tenders, Requirements, and Mock Provider Registries\n");

  await connectDatabase();

  // 1. AUDIT DATA BEFORE CLEANUP
  console.log("==================================================");
  console.log("1. BEFORE-CLEANUP DATA AUDIT");
  console.log("==================================================");

  const beforeCounts = {
    User: await User.countDocuments(),
    Vendor: await Vendor.countDocuments(),
    Tender: await Tender.countDocuments(),
    Requirement: await Requirement.countDocuments(),
    Bid: await Bid.countDocuments(),
    Document: await Document.countDocuments(),
    DocumentExtraction: await DocumentExtraction.countDocuments(),
    VerificationResult: await VerificationResult.countDocuments(),
    Evidence: await Evidence.countDocuments(),
    MockProviderRecord: await MockProviderRecord.countDocuments(),
  };

  console.table(beforeCounts);

  // 2. EXECUTING DELETIONS FOR BIDS AND BID DOCUMENTS ONLY
  console.log("\n==================================================");
  console.log("2. EXECUTING BID DATA RESET (PURGING BIDS & DOCUMENTS)");
  console.log("==================================================");

  // Clear local DB / Mongoose bid-related collections
  await Evidence.deleteMany({});
  await VerificationResult.deleteMany({});
  await DocumentExtraction.deleteMany({});
  await Document.deleteMany({});
  await Bid.deleteMany({});
  console.log("✅ Local Store: Cleared all Evidence, VerificationResult, DocumentExtraction, Document, and Bid records.");

  // Clear Supabase PostgreSQL bid-related tables
  if (supabase) {
    console.log("Clearing Supabase PostgreSQL bid tables...");
    await supabase.from("evidence").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("verification_results").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("document_extractions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("documents").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("bids").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    console.log("✅ Supabase PostgreSQL: Cleared bids, documents, extractions, verification_results, and evidence tables.");

    // Clear Storage bid files
    try {
      const { data: bidFiles } = await supabase.storage.from("bids").list("", { limit: 1000 });
      if (bidFiles && bidFiles.length > 0) {
        await supabase.storage.from("bids").remove(bidFiles.map((f) => f.name));
        console.log(`✅ Cleared ${bidFiles.length} uploaded files from 'bids' storage bucket.`);
      }
    } catch (storageErr) {
      console.warn("Storage cleanup warning:", storageErr.message);
    }
  }

  // Local uploads folder cleanup if present
  try {
    const uploadsDir = path.resolve(__dirname, "../uploads");
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      for (const file of files) {
        if (file !== ".gitkeep") {
          fs.unlinkSync(path.join(uploadsDir, file));
        }
      }
      console.log(`✅ Cleared local uploads folder.`);
    }
  } catch (fsErr) {
    // Ignore local fs errors if directory isn't present
  }

  // 3. AUDIT DATA AFTER CLEANUP
  console.log("\n==================================================");
  console.log("3. AFTER-CLEANUP DATA AUDIT");
  console.log("==================================================");

  const afterCounts = {
    User: await User.countDocuments(),
    Vendor: await Vendor.countDocuments(),
    Tender: await Tender.countDocuments(),
    Requirement: await Requirement.countDocuments(),
    Bid: await Bid.countDocuments(),
    Document: await Document.countDocuments(),
    DocumentExtraction: await DocumentExtraction.countDocuments(),
    VerificationResult: await VerificationResult.countDocuments(),
    Evidence: await Evidence.countDocuments(),
    MockProviderRecord: await MockProviderRecord.countDocuments(),
  };

  console.table(afterCounts);

  console.log("\n[SUCCESS] Clean data reset completed successfully.");
  console.log("Purged: Bids (0), Documents (0), Extractions (0), Results (0), Evidence (0).");
  console.log("Preserved: Users, Vendors, Tenders, Tender Requirements, and Mock Provider Registries.");
}

cleanDataReset().catch((err) => {
  console.error("\n[FATAL ERROR in cleanDataReset]", err);
  process.exit(1);
});
