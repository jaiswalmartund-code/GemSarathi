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
  User,
} from "../src/db/models.js";
import { supabase } from "../src/config/supabase.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function cleanDataReset() {
  console.log("=== GEM VERIFIER V2: CLEAN DATA RESET ===");

  await connectDatabase();

  // 1. AUDIT CURRENT DATA BEFORE CLEANUP
  console.log("\n==================================================");
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
    AadhaarRegistry: await AadhaarRegistry.countDocuments(),
  };

  console.table(beforeCounts);

  let supabaseBeforeCounts = {};
  if (supabase) {
    const tables = [
      "users",
      "vendors",
      "tenders",
      "tender_requirements",
      "bids",
      "documents",
      "document_extractions",
      "verification_results",
      "evidence",
      "aadhaar_registry",
    ];
    for (const t of tables) {
      const { count, error } = await supabase.from(t).select("*", { count: "exact", head: true });
      supabaseBeforeCounts[t] = error ? error.message : count;
    }
    console.log("\nSupabase Table Counts (Before):", supabaseBeforeCounts);
  }

  const isCleanZero = process.argv.includes("0") || process.argv.includes("clear") || process.argv.includes("--clear-bids");
  if (isCleanZero) {
    console.log("\n>>> CLEAN 0 MODE ACTIVATED: Clearing active bid and all bid-related records <<<");
  }

  // 2. IDENTIFY CANONICAL ENTITIES
  console.log("\n==================================================");
  console.log("2. IDENTIFYING CANONICAL RECORDS TO PRESERVE");
  console.log("==================================================");

  // Canonical Tender (GEM/2026/B/DEMO-001)
  const tenderNumber = "GEM/2026/B/DEMO-001";
  const allTenders = await Tender.find({
    $or: [{ tenderNumber }, { tender_number: tenderNumber }],
  });

  if (!allTenders.length) {
    console.error(`[FATAL ERROR] Canonical Tender '${tenderNumber}' not found in database!`);
    process.exit(1);
  }

  const canonicalTender = allTenders[0];
  const canonicalTenderId = canonicalTender._id || canonicalTender.id;

  // Canonical Requirements (14 unique requirements for GEM/2026/B/DEMO-001)
  const allReqs = await Requirement.find({
    $or: [{ tenderId: canonicalTenderId }, { tender_id: canonicalTenderId }],
  });

  // Deduplicate requirements by requirementName if duplicates exist
  const seenReqNames = new Set();
  const canonicalReqs = [];
  const duplicateReqsToDelete = [];

  for (const req of allReqs) {
    const name = (req.requirementName || req.requirement_name || req.title || "").trim();
    if (!seenReqNames.has(name) && canonicalReqs.length < 14) {
      seenReqNames.add(name);
      canonicalReqs.push(req);
    } else {
      duplicateReqsToDelete.push(req);
    }
  }

  const canonicalReqIds = new Set(canonicalReqs.map((r) => r._id || r.id));

  // Canonical Vendor (Apex Network Solutions Private Limited)
  const vendorName = "Apex Network Solutions Private Limited";
  const allVendors = await Vendor.find({
    $or: [
      { company_name: vendorName },
      { legalName: vendorName },
      { companyName: vendorName },
    ],
  });

  if (!allVendors.length) {
    console.error(`[FATAL ERROR] Canonical Vendor '${vendorName}' not found in database!`);
    process.exit(1);
  }

  const canonicalVendor = allVendors[0];
  const canonicalVendorId = canonicalVendor._id || canonicalVendor.id;

  // Canonical Bid
  let canonicalBid = null;
  let canonicalBidId = null;
  let canonicalDoc = null;
  let canonicalDocId = null;
  let canonicalExtraction = null;
  let canonicalExtractionId = null;
  let canonicalResults = [];
  let canonicalResultIds = new Set();
  let canonicalEvidence = [];
  let canonicalEvidenceIds = new Set();

  if (!isCleanZero) {
    const allBids = await Bid.find({
      $or: [
        { tenderId: canonicalTenderId, vendorId: canonicalVendorId },
        { tender_id: canonicalTenderId, vendor_id: canonicalVendorId },
      ],
    });

    if (!allBids.length) {
      console.log("[INFO] No canonical bid currently in database. Continuing clean-data reset.");
    } else {
      canonicalBid = allBids[0];
      canonicalBidId = canonicalBid._id || canonicalBid.id;

      // Canonical Document (TECHNICAL_BID)
      const allDocs = await Document.find({
        $or: [
          { bidId: canonicalBidId, documentType: "TECHNICAL_BID" },
          { bid_id: canonicalBidId, document_type: "TECHNICAL_BID" },
        ],
      });

      canonicalDoc = allDocs.length ? allDocs[0] : null;
      canonicalDocId = canonicalDoc ? (canonicalDoc._id || canonicalDoc.id) : null;

      // Canonical Document Extraction
      canonicalExtraction = canonicalDocId
        ? await DocumentExtraction.findOne({
            $or: [{ documentId: canonicalDocId }, { document_id: canonicalDocId }],
          })
        : null;
      canonicalExtractionId = canonicalExtraction ? (canonicalExtraction._id || canonicalExtraction.id) : null;

      // Canonical Verification Results (9 items)
      canonicalResults = await VerificationResult.find({
        $or: [{ bidId: canonicalBidId }, { bid_id: canonicalBidId }],
      });
      canonicalResultIds = new Set(canonicalResults.map((r) => r._id || r.id));

      // Canonical Evidence
      const allEv = await Evidence.find({});
      canonicalEvidence = allEv.filter((ev) =>
        canonicalResultIds.has(ev.verificationResultId || ev.verification_result_id)
      );
      canonicalEvidenceIds = new Set(canonicalEvidence.map((ev) => ev._id || ev.id));
    }
  }

  const allEvidence = await Evidence.find({});

  // 3. SAFETY CHECK & PLAN REPORT
  console.log("\n==================================================");
  console.log("3. SAFETY CHECK & DELETION PLAN");
  console.log("==================================================");

  const nonCanonicalTenders = (await Tender.find({})).filter((t) => (t._id || t.id) !== canonicalTenderId);
  const nonCanonicalVendors = (await Vendor.find({})).filter((v) => (v._id || v.id) !== canonicalVendorId);
  const nonCanonicalBids = (await Bid.find({})).filter((b) => (b._id || b.id) !== canonicalBidId);
  const nonCanonicalDocs = (await Document.find({})).filter((d) => (d._id || d.id) !== canonicalDocId);
  const nonCanonicalExtractions = (await DocumentExtraction.find({})).filter((e) => (e._id || e.id) !== canonicalExtractionId);
  const nonCanonicalResults = (await VerificationResult.find({})).filter((r) => !canonicalResultIds.has(r._id || r.id));
  const nonCanonicalEvidence = allEvidence.filter((ev) => !canonicalEvidenceIds.has(ev._id || ev.id));
  const obsoleteReqs = (await Requirement.find({})).filter((r) => !canonicalReqIds.has(r._id || r.id));

  console.log(`OLD TENDERS TO DELETE (${nonCanonicalTenders.length}):`, nonCanonicalTenders.map((t) => t.tenderNumber || t.tender_number || t.title));
  console.log(`OLD VENDORS TO DELETE (${nonCanonicalVendors.length}):`, nonCanonicalVendors.map((v) => v.company_name || v.legalName));
  console.log(`OLD BIDS TO DELETE (${nonCanonicalBids.length}):`, nonCanonicalBids.map((b) => b._id || b.id));
  console.log(`OLD DOCUMENTS TO DELETE (${nonCanonicalDocs.length}):`, nonCanonicalDocs.map((d) => d.originalFilename || d.original_filename));
  console.log(`OLD EXTRACTIONS TO DELETE (${nonCanonicalExtractions.length})`);
  console.log(`OLD VERIFICATION RESULTS TO DELETE (${nonCanonicalResults.length})`);
  console.log(`OLD EVIDENCE TO DELETE (${nonCanonicalEvidence.length})`);
  console.log(`OBSOLETE REQUIREMENTS TO DELETE (${obsoleteReqs.length})`);

  console.log("\nCANONICAL DATA TO PRESERVE:");
  console.log(`- Tender: ${canonicalTender.title} (ID: ${canonicalTenderId})`);
  console.log(`- Requirements: ${canonicalReqs.length} items`);
  console.log(`- Vendor: ${canonicalVendor.company_name || canonicalVendor.legalName} (ID: ${canonicalVendorId})`);
  console.log(`- Bid: ${canonicalBid ? (canonicalBid.bidReference || canonicalBidId) : "NONE (CLEARED TO 0)"}`);
  console.log(`- Technical Bid Document: ${canonicalDoc ? (canonicalDoc.originalFilename || "Apex_Network_Solutions_Technical_Bid.pdf") : "NONE (CLEARED TO 0)"}`);
  console.log(`- Extraction: ${canonicalExtractionId ? "Canonical Extraction" : "None"}`);
  console.log(`- Verification Results: ${canonicalResults.length} items`);
  console.log(`- Evidence: ${canonicalEvidence.length} items`);

  // 4. PERFORM DELETION IN DEPENDENCY ORDER
  console.log("\n==================================================");
  console.log("4. EXECUTING DATA CLEANUP");
  console.log("==================================================");

  // A. Evidence
  const evToDeleteIds = nonCanonicalEvidence.map((ev) => ev._id || ev.id);
  if (evToDeleteIds.length) {
    await Evidence.deleteMany({ $or: [{ _id: { $in: evToDeleteIds } }, { id: { $in: evToDeleteIds } }] });
  }

  // B. Verification Results
  const resToDeleteIds = nonCanonicalResults.map((r) => r._id || r.id);
  if (resToDeleteIds.length) {
    await VerificationResult.deleteMany({ $or: [{ _id: { $in: resToDeleteIds } }, { id: { $in: resToDeleteIds } }] });
  }

  // C. Document Extractions
  const extToDeleteIds = nonCanonicalExtractions.map((e) => e._id || e.id);
  if (extToDeleteIds.length) {
    await DocumentExtraction.deleteMany({ $or: [{ _id: { $in: extToDeleteIds } }, { id: { $in: extToDeleteIds } }] });
  }

  // D. Documents
  const docToDeleteIds = nonCanonicalDocs.map((d) => d._id || d.id);
  if (docToDeleteIds.length) {
    await Document.deleteMany({ $or: [{ _id: { $in: docToDeleteIds } }, { id: { $in: docToDeleteIds } }] });
  }

  // E. Bids
  const bidToDeleteIds = nonCanonicalBids.map((b) => b._id || b.id);
  if (bidToDeleteIds.length) {
    await Bid.deleteMany({ $or: [{ _id: { $in: bidToDeleteIds } }, { id: { $in: bidToDeleteIds } }] });
  }

  // F. Requirements
  const reqToDeleteIds = obsoleteReqs.map((r) => r._id || r.id);
  if (reqToDeleteIds.length) {
    await Requirement.deleteMany({ $or: [{ _id: { $in: reqToDeleteIds } }, { id: { $in: reqToDeleteIds } }] });
  }

  // G. Tenders
  const tenderToDeleteIds = nonCanonicalTenders.map((t) => t._id || t.id);
  if (tenderToDeleteIds.length) {
    await Tender.deleteMany({ $or: [{ _id: { $in: tenderToDeleteIds } }, { id: { $in: tenderToDeleteIds } }] });
  }

  // H. Vendors
  const vendorToDeleteIds = nonCanonicalVendors.map((v) => v._id || v.id);
  if (vendorToDeleteIds.length) {
    await Vendor.deleteMany({ $or: [{ _id: { $in: vendorToDeleteIds } }, { id: { $in: vendorToDeleteIds } }] });
  }

  // I. Obsolete Local Demo Files Cleanup
  const demoDocsDir = path.resolve(__dirname, "../../../demo-docs");
  const obsoletePdfs = [
    "Brightline-OEM-MAF.pdf",
    "Sample-Weak-Bid.pdf",
    "Tender-Notice-GEM-2026-B-1001.pdf",
  ];
  for (const pdfName of obsoletePdfs) {
    const pdfPath = path.join(demoDocsDir, pdfName);
    if (fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath);
      console.log(`[CLEANUP] Deleted obsolete demo PDF: ${pdfName}`);
    }
  }

  // J. Supabase Data Reset (if connected)
  if (supabase) {
    console.log("\nExecuting Supabase PostgreSQL data reset...");
    if (isCleanZero) {
      await supabase.from("evidence").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("verification_results").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("document_extractions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("documents").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("bids").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    } else {
      if (evToDeleteIds.length) await supabase.from("evidence").delete().in("id", evToDeleteIds);
      if (resToDeleteIds.length) await supabase.from("verification_results").delete().in("id", resToDeleteIds);
      if (extToDeleteIds.length) await supabase.from("document_extractions").delete().in("id", extToDeleteIds);
      if (docToDeleteIds.length) await supabase.from("documents").delete().in("id", docToDeleteIds);
      if (bidToDeleteIds.length) await supabase.from("bids").delete().in("id", bidToDeleteIds);
    }
    if (reqToDeleteIds.length) await supabase.from("tender_requirements").delete().in("id", reqToDeleteIds);
    if (tenderToDeleteIds.length) await supabase.from("tenders").delete().in("id", tenderToDeleteIds);
    if (vendorToDeleteIds.length) await supabase.from("vendors").delete().in("id", vendorToDeleteIds);
  }

  // 5. POST-CLEANUP AUDIT
  console.log("\n==================================================");
  console.log("5. AFTER-CLEANUP DATA AUDIT");
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
    AadhaarRegistry: await AadhaarRegistry.countDocuments(),
  };

  console.table(afterCounts);

  let supabaseAfterCounts = {};
  if (supabase) {
    const tables = [
      "users",
      "vendors",
      "tenders",
      "tender_requirements",
      "bids",
      "documents",
      "document_extractions",
      "verification_results",
      "evidence",
      "aadhaar_registry",
    ];
    for (const t of tables) {
      const { count, error } = await supabase.from(t).select("*", { count: "exact", head: true });
      supabaseAfterCounts[t] = error ? error.message : count;
    }
    console.log("\nSupabase Table Counts (After):", supabaseAfterCounts);
  }

  console.log("\n[SUCCESS] Clean data reset completed successfully.");
}

cleanDataReset().catch((err) => {
  console.error("\n[FATAL ERROR in cleanDataReset]", err);
  process.exit(1);
});
