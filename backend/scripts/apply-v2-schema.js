import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rawUrl = (process.env.SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!rawUrl || !serviceKey) {
  console.error("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const supabase = createClient(rawUrl, serviceKey, { auth: { persistSession: false } });

const REQUIRED_BUCKETS = ["tenders", "bids", "aadhaar-registry"];
const REQUIRED_TABLES = [
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

async function setupBuckets() {
  console.log("\n1. Managing Storage Buckets...");
  const { data: existing, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error("Failed to list storage buckets:", error);
    return;
  }
  const existingNames = new Set((existing || []).map((b) => b.name));
  for (const bucket of REQUIRED_BUCKETS) {
    if (!existingNames.has(bucket)) {
      const { data, error: createErr } = await supabase.storage.createBucket(bucket, {
        public: false,
        fileSizeLimit: 20971520, // 20MB
      });
      if (createErr) console.log(`   Bucket '${bucket}': ${createErr.message}`);
      else console.log(`   Created bucket: '${bucket}'`);
    } else {
      console.log(`   Bucket '${bucket}' already exists.`);
    }
  }
}

async function verifyTables() {
  console.log("\n2. Verifying Table Structure...");
  const statusMap = {};
  let count = 0;
  for (const table of REQUIRED_TABLES) {
    const { data, error } = await supabase.from(table).select("*").limit(1);
    if (error) {
      statusMap[table] = `Missing / Error (${error.message || error.code})`;
    } else {
      statusMap[table] = "EXISTS & ACCESSIBLE";
      count++;
    }
  }
  console.table(statusMap);
  console.log(`Summary: ${count}/${REQUIRED_TABLES.length} tables verified.`);
  return { statusMap, count };
}

async function verifyBuckets() {
  console.log("\n3. Verifying Storage Buckets...");
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error("Failed to list buckets:", error);
    return;
  }
  const found = new Set((buckets || []).map((b) => b.name));
  for (const name of REQUIRED_BUCKETS) {
    console.log(`   Bucket '${name}': ${found.has(name) ? "VERIFIED" : "MISSING"}`);
  }
}

async function main() {
  await setupBuckets();
  let sqlPath = path.join(__dirname, "..", "supabase", "migrations", "001_v2_initial_schema.sql");
  if (!fs.existsSync(sqlPath)) {
    sqlPath = path.join(__dirname, "..", "supabase", "v2_schema.sql");
  }
  if (!fs.existsSync(sqlPath)) {
    console.error(`Migration SQL file not found at: ${sqlPath}`);
  } else {
    console.log(`Migration SQL file located at:\n  ${sqlPath}`);
  }
  await verifyTables();
  await verifyBuckets();
}

main().catch(console.error);
