// Non-destructive database connectivity test for DB_MODE=supabase (V2 Schema).
// Validates Supabase connection, reads from tenders, vendors, and confirms table accessibility.
import "dotenv/config";
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
  AadhaarRegistry,
} from "../src/db/models.js";

async function runConnectivityTest() {
  console.log("=== Running DB_MODE=supabase Connectivity Test ===");
  console.log("Environment DB_MODE:", process.env.DB_MODE || "file");

  if (!process.env.SUPABASE_URL || !(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)) {
    console.error("FAIL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.");
    process.exit(1);
  }

  // Override DB_MODE for this test execution without permanently modifying .env
  process.env.DB_MODE = "supabase";

  try {
    const conn = await connectDatabase();
    console.log("1. Supabase Connection Result:", conn);

    // Read from tenders table
    const tendersCount = await Tender.countDocuments();
    const sampleTenders = await Tender.find().limit(3).lean();
    console.log(`2. Read from 'tenders' table: ${tendersCount} record(s) found.`);
    if (sampleTenders.length > 0) {
      console.log("   Sample tender reference:", sampleTenders[0].referenceNumber || sampleTenders[0].tender_number);
    }

    // Read from vendors table
    const vendorsCount = await Vendor.countDocuments();
    const sampleVendors = await Vendor.find().limit(3).lean();
    console.log(`3. Read from 'vendors' table: ${vendorsCount} record(s) found.`);
    if (sampleVendors.length > 0) {
      console.log("   Sample vendor name:", sampleVendors[0].legalName || sampleVendors[0].company_name);
    }

    // Confirm all V2 PostgreSQL tables are accessible
    console.log("4. Verifying V2 PostgreSQL Table Access...");
    const entities = [
      { name: "users", model: User },
      { name: "vendors", model: Vendor },
      { name: "tenders", model: Tender },
      { name: "tender_requirements", model: Requirement },
      { name: "bids", model: Bid },
      { name: "documents", model: Document },
      { name: "document_extractions", model: DocumentExtraction },
      { name: "verification_results", model: VerificationResult },
      { name: "evidence", model: Evidence },
      { name: "aadhaar_registry", model: AadhaarRegistry },
    ];

    let accessibleCount = 0;
    for (const { name, model } of entities) {
      try {
        const count = await model.countDocuments();
        console.log(`   [OK] Table '${name}': Accessible (${count} rows)`);
        accessibleCount++;
      } catch (err) {
        console.log(`   [FAIL] Table '${name}': ${err.message}`);
      }
    }

    console.log(`\nConnectivity Summary: ${accessibleCount}/${entities.length} V2 PostgreSQL tables accessible.`);
    if (accessibleCount === entities.length) {
      console.log("SUCCESS: DB_MODE=supabase data layer is fully operational!");
    } else {
      console.log("NOTICE: Run backend/supabase/v2_schema.sql or backend/supabase/migrations/001_v2_initial_schema.sql in Supabase SQL Editor if tables are missing.");
    }
  } catch (error) {
    console.error("FAIL: Supabase connectivity test encountered an error:", error.message);
    process.exit(1);
  }
}

runConnectivityTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
