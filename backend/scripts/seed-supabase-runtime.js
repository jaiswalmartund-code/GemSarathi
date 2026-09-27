import "dotenv/config";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { supabase } from "../src/config/supabase.js";

async function seedSupabaseRuntime() {
  console.log("=== GEM VERIFIER V2: SUPABASE RUNTIME SEED ===");
  if (!supabase) {
    console.error("❌ Supabase client unavailable. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  // 1. CLEAN OLD BID-DEPENDENT DATA IN FOREIGN-KEY ORDER
  console.log("\n[1] Clearing old bid-dependent records in Supabase Postgres...");
  await supabase.from("evidence").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("verification_results").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("document_extractions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("documents").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("bids").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  console.log("✅ Cleared all bids, documents, extractions, verification results, and evidence.");

  // 2. SEED USERS (Officer & Vendor)
  console.log("\n[2] Seeding / Verifying Users...");
  const officerHash = await bcrypt.hash("officer123", 10);
  const vendorHash = await bcrypt.hash("vendor123", 10);

  let officerId, vendorUserId;

  // Officer User
  const { data: exOfficer } = await supabase.from("users").select("*").eq("email", "officer@gem.gov.in").maybeSingle();
  if (!exOfficer) {
    officerId = randomUUID();
    await supabase.from("users").insert({
      id: officerId,
      name: "Procurement Officer",
      email: "officer@gem.gov.in",
      password_hash: officerHash,
      role: "officer",
    });
    console.log("✅ Created Officer User: officer@gem.gov.in");
  } else {
    officerId = exOfficer.id;
    console.log("✅ Officer User exists: officer@gem.gov.in");
  }

  // Vendor User
  const { data: exVendorUser } = await supabase.from("users").select("*").eq("email", "apex@apexnet.in").maybeSingle();
  if (!exVendorUser) {
    vendorUserId = randomUUID();
    await supabase.from("users").insert({
      id: vendorUserId,
      name: "Apex Network Solutions",
      email: "apex@apexnet.in",
      password_hash: vendorHash,
      role: "vendor",
    });
    console.log("✅ Created Vendor User: apex@apexnet.in");
  } else {
    vendorUserId = exVendorUser.id;
    console.log("✅ Vendor User exists: apex@apexnet.in");
  }

  // 3. SEED VENDOR PROFILE
  console.log("\n[3] Seeding / Verifying Vendor Profile...");
  const vendorName = "Apex Network Solutions Private Limited";
  let vendorId;
  const { data: exVendor } = await supabase.from("vendors").select("*").eq("company_name", vendorName).maybeSingle();
  if (!exVendor) {
    vendorId = randomUUID();
    await supabase.from("vendors").insert({
      id: vendorId,
      user_id: vendorUserId,
      company_name: vendorName,
      contact_person: "Rajesh Sharma",
      email: "apex@apexnet.in",
      phone: "+91-9876543210",
      address: "Plot 42, Electronics City, Sector 18, Gurugram, Haryana - 122015",
      gstin: "07AAACA1234F1Z5",
      pan: "AAACA1234F",
      udyam_number: "UDYAM-HR-05-0012345",
    });
    console.log(`✅ Created Vendor Profile: ${vendorName}`);
  } else {
    vendorId = exVendor.id;
    console.log(`✅ Vendor Profile exists: ${vendorName}`);
  }

  // 4. SEED CANONICAL TENDER
  console.log("\n[4] Seeding / Verifying Canonical Tender...");
  const tenderNumber = "GEM/2026/B/DEMO-001";
  let tenderId;
  const { data: exTender } = await supabase.from("tenders").select("*").eq("tender_number", tenderNumber).maybeSingle();
  if (!exTender) {
    tenderId = randomUUID();
    await supabase.from("tenders").insert({
      id: tenderId,
      tender_number: tenderNumber,
      title: "Supply, Installation, Testing, Commissioning and Warranty Support of Network Infrastructure Equipment",
      organization: "Department of Digital Infrastructure",
      description: "Procurement of Enterprise Network Infrastructure Equipment including Managed Switches, Routers, Firewalls, Racks, and Accessories.",
      submission_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: "OPEN",
    });
    console.log(`✅ Created Tender: ${tenderNumber}`);
  } else {
    tenderId = exTender.id;
    console.log(`✅ Tender exists: ${tenderNumber}`);
  }

  // 5. SEED COMPLETE TWO-LAYER REQUIREMENT HIERARCHY
  console.log("\n[5] Seeding Complete Two-Layer Requirement Hierarchy...");
  await supabase.from("tender_requirements").delete().eq("tender_id", tenderId);

  const TWO_LAYER_REQUIREMENTS = [
    // LAYER 1: DOCUMENT / ELIGIBILITY REQUIREMENTS (5)
    {
      requirement_name: "Minimum Average Annual Turnover",
      description: "Average annual financial turnover of minimum Rs 2.5 Crore during the last 3 financial years.",
      requirement_type: "Financial",
      expected_value: "Rs 2.5 Crore",
      expected_unit: "INR",
      mandatory: true,
      required_document_type: "FINANCIAL_STATEMENT",
      verification_rule: "turnover >= 25000000",
    },
    {
      requirement_name: "Relevant Industry Experience",
      description: "Minimum 5 years of experience executing network infrastructure projects for government or public sector.",
      requirement_type: "Eligibility",
      expected_value: "5 years",
      expected_unit: "years",
      mandatory: true,
      required_document_type: "EXPERIENCE_CERTIFICATE",
      verification_rule: "experience_years >= 5",
    },
    {
      requirement_name: "GST Registration & Return Compliance",
      description: "Valid GSTIN registration certificate with active tax filing status.",
      requirement_type: "Statutory",
      expected_value: "Active GSTIN",
      mandatory: true,
      required_document_type: "GST",
      verification_rule: "gstin_valid",
    },
    {
      requirement_name: "PAN Registration Compliance",
      description: "Permanent Account Number issued by Income Tax Department of India.",
      requirement_type: "Statutory",
      expected_value: "Valid PAN",
      mandatory: true,
      required_document_type: "PAN",
      verification_rule: "pan_valid",
    },
    {
      requirement_name: "Identity of Authorised Representative",
      description: "Identity verification of authorised signatory / company representative via Aadhaar.",
      requirement_type: "Statutory",
      expected_value: "Valid Aadhaar",
      mandatory: true,
      required_document_type: "AADHAAR",
      verification_rule: "aadhaar_valid",
    },

    // LAYER 2: TENDER-SPECIFIC TECHNICAL REQUIREMENTS (9) (Executed in Technical Bid Branch)
    {
      requirement_name: "Managed Network Switches",
      description: "Managed Layer 2/3 Gigabit Ethernet switches with minimum 24 Gigabit Ethernet ports per switch.",
      requirement_type: "technical",
      expected_value: "Minimum 24 Gigabit Ethernet ports",
      expected_unit: "ports",
      mandatory: true,
      required_document_type: "TECHNICAL_BID",
      verification_rule: "ports >= 24",
    },
    {
      requirement_name: "Enterprise Network Routers",
      description: "Enterprise network routers with minimum 4 Gigabit Ethernet interfaces.",
      requirement_type: "technical",
      expected_value: "Minimum 4 Ethernet interfaces",
      expected_unit: "interfaces",
      mandatory: true,
      required_document_type: "TECHNICAL_BID",
      verification_rule: "interfaces >= 4",
    },
    {
      requirement_name: "Next-Generation Network Security / Firewall",
      description: "Next-Generation Network Security / Firewall with minimum 1 Gbps firewall throughput.",
      requirement_type: "technical",
      expected_value: "Minimum 1 Gbps throughput",
      expected_unit: "Gbps",
      mandatory: true,
      required_document_type: "TECHNICAL_BID",
      verification_rule: "throughput >= 1",
    },
    {
      requirement_name: "Scope of Installation, Configuration, Testing & Commissioning",
      description: "Complete physical installation, configuration, testing, commissioning, and handover records.",
      requirement_type: "technical",
      expected_value: "Scope of Installation, Configuration, Testing & Commissioning",
      mandatory: true,
      required_document_type: "TECHNICAL_BID",
      verification_rule: "full_scope_confirmed",
    },
    {
      requirement_name: "Warranty & Technical Support",
      description: "Minimum 3 years comprehensive OEM warranty and technical support from commissioning date.",
      requirement_type: "technical",
      expected_value: "Minimum 3 years warranty from commissioning",
      expected_unit: "years",
      mandatory: true,
      required_document_type: "TECHNICAL_BID",
      verification_rule: "warranty_years >= 3",
    },
    {
      requirement_name: "Delivery & Completion Period",
      description: "Supply, installation, testing and commissioning within maximum 90 days from PO issue.",
      requirement_type: "technical",
      expected_value: "Within 90 days from PO issue",
      expected_unit: "days",
      mandatory: true,
      required_document_type: "TECHNICAL_BID",
      verification_rule: "completion_days <= 90",
    },
    {
      requirement_name: "Optical Transceiver Modules (SFP)",
      description: "Minimum 60 Nos. 1G SFP Transceiver Modules.",
      requirement_type: "technical",
      expected_value: "60 Nos. 1G SFP Transceiver Modules",
      expected_unit: "Nos",
      mandatory: true,
      required_document_type: "TECHNICAL_BID",
      verification_rule: "sfp_qty >= 60",
    },
    {
      requirement_name: "Network Patch Cords",
      description: "Minimum 300 Nos. Cat6 Network Patch Cords.",
      requirement_type: "technical",
      expected_value: "300 Nos. Cat6 Network Patch Cords",
      expected_unit: "Nos",
      mandatory: true,
      required_document_type: "TECHNICAL_BID",
      verification_rule: "patch_qty >= 300",
    },
    {
      requirement_name: "Network Racks",
      description: "Minimum 8 Nos. 19-inch 42U floor-standing racks with PDU and cable management.",
      requirement_type: "technical",
      expected_value: "8 Nos. 19-inch 42U floor-standing racks with PDU",
      expected_unit: "Nos",
      mandatory: true,
      required_document_type: "TECHNICAL_BID",
      verification_rule: "rack_qty >= 8",
    },
  ];

  const reqPayload = TWO_LAYER_REQUIREMENTS.map((r) => ({
    id: randomUUID(),
    tender_id: tenderId,
    requirement_name: r.requirement_name,
    description: r.description,
    requirement_type: r.requirement_type,
    expected_value: r.expected_value,
    expected_unit: r.expected_unit || null,
    mandatory: r.mandatory ?? true,
    required_document_type: r.required_document_type || "TECHNICAL_BID",
    verification_rule: r.verification_rule || null,
  }));

  const { data: insertedReqs, error: reqErr } = await supabase.from("tender_requirements").insert(reqPayload).select();
  if (reqErr) {
    console.error("❌ Requirement insert failed:", reqErr);
    process.exit(1);
  }

  console.log(`✅ Inserted ${insertedReqs?.length} requirements (Layer 1 + Layer 2 hierarchy preserved).`);

  // 6. FINAL COUNT AUDIT
  console.log("\n==================================================");
  console.log("FINAL SUPABASE STATE AUDIT");
  console.log("==================================================");
  const auditTables = ["users", "vendors", "tenders", "tender_requirements", "bids", "documents", "document_extractions", "verification_results", "evidence"];
  const summary = {};
  for (const t of auditTables) {
    const { count } = await supabase.from(t).select("*", { count: "exact", head: true });
    summary[t] = count;
  }
  console.table(summary);
  console.log("==================================================");
}

seedSupabaseRuntime().catch((err) => {
  console.error("Fatal error in seedSupabaseRuntime:", err);
  process.exit(1);
});
