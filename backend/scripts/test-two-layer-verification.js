// Comprehensive Test Script for Two-Layer Verification Service (Layer 1 + Layer 2)
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { governmentVerificationService } from "../src/services/government/governmentVerificationService.js";
import { panProvider } from "../src/services/government/providers/mockPanProvider.js";
import { gstProvider } from "../src/services/government/providers/mockGstProvider.js";
import { udyamProvider } from "../src/services/government/providers/mockUdyamProvider.js";
import { experienceProvider } from "../src/services/government/providers/mockExperienceProvider.js";
import { itrProvider } from "../src/services/government/providers/mockItrProvider.js";
import { aadhaarProvider } from "../src/services/government/providers/mockIdentityProvider.js";
import { mcaProvider } from "../src/services/government/providers/mockMcaProvider.js";
import { runBidVerificationPipeline, getBidComplianceMatrix } from "../src/services/verification/technicalVerificationService.js";
import { extractTechnicalBidFacts } from "../src/services/documents/documentExtractionService.js";
import { saveBuffer } from "../src/services/documents/fileStorageService.js";
import { connectDatabase, Bid, Vendor, Tender, Document, DocumentExtraction, Requirement } from "../src/db/models.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runTests() {
  console.log("==================================================");
  console.log("=== GEM VERIFIER V2: TWO-LAYER VERIFICATION TEST ===");
  console.log("==================================================\n");

  await connectDatabase();

  let passCount = 0;
  let failCount = 0;

  function assert(condition, testName, detail = "") {
    if (condition) {
      console.log(`✅ [PASS] ${testName} ${detail ? "(" + detail + ")" : ""}`);
      passCount++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${detail ? "(" + detail + ")" : ""}`);
      failCount++;
    }
  }

  // --- Test 1: Bidder A — Fully Compliant Provider Verification (7 Providers) ---
  console.log("[1] Testing Bidder A Provider Data (Apex Network Solutions)...");
  const bidderAInfo = {
    pan: "AAACA1234F",
    gstin: "07AAACA1234F1Z5",
    udyamNumber: "UDYAM-HR-05-0012345",
    legalName: "Apex Network Solutions Private Limited",
    cin: "U72900HR2018PTC074123",
    contactPerson: "Rahul Sharma"
  };
  const bidderARef = await governmentVerificationService.getSevenProviderReferenceData(bidderAInfo);
  assert(bidderARef.pan.status === "ACTIVE", "Test 1.1: Bidder A PAN Reference Status", bidderARef.pan.status);
  assert(bidderARef.gst.status === "ACTIVE" && bidderARef.gst.filingUpToDate === true, "Test 1.2: Bidder A GST Active & Up to Date", bidderARef.gst.gstin);
  assert(bidderARef.udyam.status === "VERIFIED", "Test 1.3: Bidder A Udyam Status", bidderARef.udyam.udyamNumber);
  assert(bidderARef.experience.verifiedYearsOfExperience >= 5, "Test 1.4: Bidder A Experience >= 5 Years", `${bidderARef.experience.verifiedYearsOfExperience} yrs`);
  assert(bidderARef.itr.averageAnnualTurnover >= 25000000, "Test 1.5: Bidder A Turnover >= 2.5 Cr", bidderARef.itr.averageAnnualTurnoverFormatted);
  assert(bidderARef.aadhaar.verificationStatus === "VERIFIED", "Test 1.6: Bidder A Representative Aadhaar Verified", bidderARef.aadhaar.representativeName);
  assert(bidderARef.mca.companyStatus === "Active", "Test 1.7: Bidder A MCA Active", bidderARef.mca.cin);

  // --- Test 2: Bidder B — Discrepancies Verification ---
  console.log("\n[2] Testing Bidder B Provider Mismatches (Brightline Technologies LLP)...");
  const bidderBInfo = {
    pan: "AALCB5678G",
    gstin: "27BBBBB1111B2Z6",
    udyamNumber: "UDYAM-MH-19-0098765",
    legalName: "Brightline Technologies LLP",
    cin: "AAA-5678",
    contactPerson: "Vikram Mehta"
  };
  const bidderBRef = await governmentVerificationService.getSevenProviderReferenceData(bidderBInfo);
  assert(bidderBRef.gst.status === "SUSPENDED", "Test 2.1: Bidder B GST Suspended Discrepancy", bidderBRef.gst.status);
  assert(bidderBRef.experience.verifiedYearsOfExperience < 5, "Test 2.2: Bidder B Experience < 5 Years Discrepancy", `${bidderBRef.experience.verifiedYearsOfExperience} yrs`);
  assert(bidderBRef.itr.averageAnnualTurnover < 25000000, "Test 2.3: Bidder B Turnover < 2.5 Cr Discrepancy", bidderBRef.itr.averageAnnualTurnoverFormatted);
  assert(bidderBRef.aadhaar.verificationStatus === "NAME_MISMATCH", "Test 2.4: Bidder B Aadhaar Name Mismatch", bidderBRef.aadhaar.representativeName);

  // --- Test 3-9: Individual Provider Interface Tests ---
  console.log("\n[3] Testing Standardized 7 Provider Interfaces...");
  const panRes = await panProvider.verify("AAACA1234F");
  assert(panRes && panRes.pan === "AAACA1234F", "Test 3: PAN Provider verify()", panRes.legalName);

  const gstRes = await gstProvider.verify("07AAACA1234F1Z5");
  assert(gstRes && gstRes.gstin === "07AAACA1234F1Z5", "Test 4: GST Provider verify()", gstRes.status);

  const udyamRes = await udyamProvider.verify("UDYAM-HR-05-0012345");
  assert(udyamRes && udyamRes.udyamNumber === "UDYAM-HR-05-0012345", "Test 5: Udyam Provider verify()", udyamRes.enterpriseType);

  const expRes = await experienceProvider.verify("Apex Network Solutions Private Limited");
  assert(expRes && expRes.verifiedYearsOfExperience === 8, "Test 6: Experience Provider verify()", `${expRes.verifiedYearsOfExperience} yrs`);

  const itrRes = await itrProvider.verify("AAACA1234F");
  assert(itrRes && itrRes.averageAnnualTurnover === 45000000, "Test 7: ITR Provider verify()", itrRes.averageAnnualTurnoverFormatted);

  const aadhaarRes = await aadhaarProvider.verify("Rahul Sharma");
  assert(aadhaarRes && aadhaarRes.verificationStatus === "VERIFIED", "Test 8: Aadhaar Provider verify()", aadhaarRes.representativeName);

  const mcaRes = await mcaProvider.verify("U72900HR2018PTC074123");
  assert(mcaRes && mcaRes.cin === "U72900HR2018PTC074123", "Test 9: MCA Provider verify()", mcaRes.companyName);

  // --- Test 10-12: Full Two-Layer Verification Engine & Evidence Generation ---
  console.log("\n[4] Testing Combined Two-Layer Verification Pipeline & Evidence Generation...");
  
  // Resolve canonical tender & bid document
  let tender = await Tender.findOne({ $or: [{ tenderNumber: "GEM/2026/B/DEMO-001" }, { tender_number: "GEM/2026/B/DEMO-001" }] });
  if (!tender) {
    tender = await Tender.create({
      referenceNumber: "GEM/2026/B/DEMO-001",
      tenderNumber: "GEM/2026/B/DEMO-001",
      title: "Supply, Installation, Testing, Commissioning and Warranty Support of Network Infrastructure Equipment",
      organization: "Department of Digital Infrastructure",
      status: "OPEN"
    });
  }
  const tenderId = tender._id || tender.id;

  let vendor = await Vendor.findOne({ $or: [{ company_name: "Apex Network Solutions Private Limited" }, { legalName: "Apex Network Solutions Private Limited" }] });
  if (!vendor) {
    vendor = await Vendor.create({
      company_name: "Apex Network Solutions Private Limited",
      legalName: "Apex Network Solutions Private Limited",
      contact_person: "Rahul Sharma",
      status: "Active"
    });
  }
  const vendorId = vendor._id || vendor.id;

  let bid = await Bid.findOne({ $or: [{ tenderId, vendorId }, { tender_id: tenderId, vendor_id: vendorId }] });
  if (!bid) {
    bid = await Bid.create({
      tenderId,
      tender_id: tenderId,
      vendorId,
      vendor_id: vendorId,
      status: "DRAFT",
      submittedAt: new Date(),
      bidReference: "BID-APEX-001"
    });
  }
  const bidId = bid._id || bid.id;

  let doc = await Document.findOne({ $or: [{ bidId, documentType: "TECHNICAL_BID" }, { bid_id: bidId, document_type: "TECHNICAL_BID" }] });
  if (!doc) {
    const pdfPath = path.resolve(__dirname, "../../demo-docs/bids/Apex_Network_Solutions_Technical_Bid.pdf");
    if (fs.existsSync(pdfPath)) {
      const pdfBuffer = fs.readFileSync(pdfPath);
      const filename = "Apex_Network_Solutions_Technical_Bid.pdf";
      const storageResult = await saveBuffer(filename, pdfBuffer, "application/pdf");
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
        storagePath: storageResult.storagePath,
        mimeType: "application/pdf",
        fileSize: pdfBuffer.length,
        uploadStatus: "COMPLETED",
        uploadedAt: new Date()
      });
    }
  }

  if (doc) {
    const docId = doc._id || doc.id;
    let extraction = await DocumentExtraction.findOne({ $or: [{ documentId: docId }, { document_id: docId }] });
    if (!extraction) {
      const pdfPath = path.resolve(__dirname, "../../demo-docs/bids/Apex_Network_Solutions_Technical_Bid.pdf");
      if (fs.existsSync(pdfPath)) {
        const { extractTextFromFile } = await import("../src/services/documents/pdfExtractorService.js");
        const pdfTextRes = await extractTextFromFile(pdfPath, doc);
        const fileBuffer = fs.readFileSync(pdfPath);
        const facts = await extractTechnicalBidFacts(pdfTextRes.text, fileBuffer, "application/pdf");
        extraction = await DocumentExtraction.create({
          documentId: docId,
          extractedText: pdfTextRes.text,
          extractedData: JSON.stringify(facts.data),
          extractionMethod: "gemini",
          extractionStatus: "COMPLETED"
        });
      }
    }
  }

  if (bidId) {
    const res = await runBidVerificationPipeline(bidId);
    assert(res && res.success === true, "Test 10: Technical & Government Pipeline Run", res ? `Bid ${bidId}` : "Pipeline returned null");
    assert(res && res.score && res.score.totalRequirements >= 9, "Test 11: Two-Layer Requirements Count (>= 9)", res?.score ? `${res.score.totalRequirements} requirements evaluated` : "N/A");

    const matrix = await getBidComplianceMatrix(bidId);
    assert(matrix && matrix.results.length > 0, "Test 12: Compliance Matrix & Evidence Generation", matrix ? `${matrix.results.length} matrix results generated` : "N/A");
  } else {
    console.warn("⚠️ Warning: No bid found for Test 10-12.");
  }

  console.log("\n==================================================");
  console.log(`SUMMARY: ${passCount} PASSED, ${failCount} FAILED.`);
  console.log("==================================================");

  if (failCount === 0) {
    console.log("🎉 ALL TWO-LAYER VERIFICATION TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
  } else {
    console.error("❌ Some verification tests failed.");
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
