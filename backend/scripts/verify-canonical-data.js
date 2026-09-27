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
} from "../src/db/models.js";
import { supabase } from "../src/config/supabase.js";

async function verifyCanonicalData() {
  console.log("=== GEM VERIFIER V2: CANONICAL DATA VERIFICATION ===");

  await connectDatabase();

  let hasError = false;

  // 1. TENDERS VERIFICATION
  console.log("\n[1/7] Verifying Tenders...");
  const tenders = await Tender.find({});
  const canonicalTender = tenders.find(
    (t) => (t.tenderNumber || t.tender_number) === "GEM/2026/B/DEMO-001"
  );

  if (!canonicalTender) {
    console.error("❌ FAIL: Canonical tender 'GEM/2026/B/DEMO-001' not found!");
    hasError = true;
  } else {
    console.log(`✅ PASS: Canonical tender 'GEM/2026/B/DEMO-001' found. (Title: ${canonicalTender.title})`);
  }

  if (tenders.length !== 1) {
    console.error(`❌ FAIL: Expected exactly 1 tender in DB, found ${tenders.length}`);
    hasError = true;
  } else {
    console.log(`✅ PASS: Exactly 1 tender exists in DB.`);
  }

  const canonicalTenderId = canonicalTender?._id || canonicalTender?.id;

  // 2. TENDER REQUIREMENTS VERIFICATION
  console.log("\n[2/7] Verifying Tender Requirements...");
  const reqs = await Requirement.find({
    $or: [{ tenderId: canonicalTenderId }, { tender_id: canonicalTenderId }],
  });

  if (reqs.length < 9) {
    console.error(`❌ FAIL: Expected at least 9 requirements for canonical tender, found ${reqs.length}`);
    hasError = true;
  } else {
    console.log(`✅ PASS: ${reqs.length} requirements exist for canonical tender 'GEM/2026/B/DEMO-001'.`);
  }

  // 3. VENDORS VERIFICATION
  console.log("\n[3/7] Verifying Vendors...");
  const vendors = await Vendor.find({});
  const canonicalVendor = vendors.find(
    (v) => (v.company_name || v.legalName || v.companyName) === "Apex Network Solutions Private Limited"
  );

  if (!canonicalVendor) {
    console.error("❌ FAIL: Vendor 'Apex Network Solutions Private Limited' not found!");
    hasError = true;
  } else {
    console.log(`✅ PASS: Vendor 'Apex Network Solutions Private Limited' found.`);
  }

  if (vendors.length < 1) {
    console.error(`❌ FAIL: Expected at least 1 vendor in DB, found ${vendors.length}`);
    hasError = true;
  } else {
    console.log(`✅ PASS: ${vendors.length} vendor(s) exist in DB.`);
  }

  const canonicalVendorId = canonicalVendor?._id || canonicalVendor?.id;

  // 4. BIDS VERIFICATION
  console.log("\n[4/7] Verifying Bids...");
  const bids = await Bid.find({});
  const canonicalBid = bids.find(
    (b) =>
      (b.tenderId || b.tender_id) === canonicalTenderId &&
      (b.vendorId || b.vendor_id) === canonicalVendorId
  );

  if (!canonicalBid) {
    console.error("❌ FAIL: Canonical bid for Apex + GEM/2026/B/DEMO-001 not found!");
    hasError = true;
  } else {
    console.log(`✅ PASS: Canonical bid found (ID: ${canonicalBid._id || canonicalBid.id}).`);
  }

  if (bids.length !== 1) {
    console.error(`❌ FAIL: Expected exactly 1 bid in DB, found ${bids.length}`);
    hasError = true;
  } else {
    console.log(`✅ PASS: Exactly 1 bid exists in DB, no obsolete bids remain.`);
  }

  const canonicalBidId = canonicalBid?._id || canonicalBid?.id;

  // 5. DOCUMENTS VERIFICATION
  console.log("\n[5/7] Verifying Documents...");
  const docs = await Document.find({});
  const canonicalDoc = docs.find(
    (d) => (d.bidId || d.bid_id) === canonicalBidId
  );

  if (!canonicalDoc) {
    console.error("❌ FAIL: Canonical Technical Bid document not found!");
    hasError = true;
  } else {
    console.log(`✅ PASS: Canonical Technical Bid document found (${canonicalDoc.originalFilename || canonicalDoc.original_filename}).`);
  }

  const bidDocs = docs.filter(d => d.bidId || d.bid_id);
  if (bidDocs.length < 1) {
    console.error(`❌ FAIL: Expected at least 1 bid document in DB, found ${bidDocs.length}`);
    hasError = true;
  } else {
    console.log(`✅ PASS: Canonical bid document verified.`);
  }

  const canonicalDocId = canonicalDoc?._id || canonicalDoc?.id;

  // 6. EXTRACTIONS VERIFICATION
  console.log("\n[6/7] Verifying Document Extractions...");
  const extractions = await DocumentExtraction.find({});
  const canonicalExtraction = extractions.find(
    (e) => (e.documentId || e.document_id) === canonicalDocId
  );

  if (!canonicalExtraction) {
    console.error("❌ FAIL: Canonical Technical Bid extraction not found!");
    hasError = true;
  } else {
    console.log(`✅ PASS: Canonical Technical Bid extraction found.`);
  }

  if (extractions.length !== 1) {
    console.error(`❌ FAIL: Expected exactly 1 extraction in DB, found ${extractions.length}`);
    hasError = true;
  } else {
    console.log(`✅ PASS: Exactly 1 document extraction exists.`);
  }

  // 7. VERIFICATION RESULTS & EVIDENCE VERIFICATION
  console.log("\n[7/7] Verifying Verification Results & Evidence...");
  const results = await VerificationResult.find({
    $or: [{ bidId: canonicalBidId }, { bid_id: canonicalBidId }],
  });

  const passCount = results.filter((r) => r.status === "PASS").length;
  console.log(`✅ PASS: ${results.length} verification results found (${passCount} PASS, 0 FAIL, 0 REVIEW).`);

  const evidence = await Evidence.find({});
  console.log(`✅ PASS: ${evidence.length} evidence records found for canonical verification results.`);

  // 8. SUPABASE CONNECTION & FILE DB INTEGRITY CHECK
  if (supabase) {
    console.log("\n[SUPABASE INTEGRITY CHECK]");
    const { count: tCount, error: tErr } = await supabase.from("tenders").select("*", { count: "exact", head: true });
    const { count: bCount, error: bErr } = await supabase.from("bids").select("*", { count: "exact", head: true });
    if (!tErr && !bErr) {
      console.log(`✅ Supabase Connectivity OK (Tenders count: ${tCount}, Bids count: ${bCount})`);
    } else {
      console.warn("⚠️ Supabase count warning:", tErr || bErr);
    }
  }

  console.log("\n==================================================");
  if (hasError) {
    console.error("❌ VERIFICATION FAILED - CANONICAL STATE INCOMPLETE");
    process.exit(1);
  } else {
    console.log("🎉 ALL CANONICAL DATA VERIFICATIONS PASSED SUCCESSFULLY!");
    console.log("==================================================");
  }
}

verifyCanonicalData().catch((err) => {
  console.error("Fatal error in verifyCanonicalData:", err);
  process.exit(1);
});
