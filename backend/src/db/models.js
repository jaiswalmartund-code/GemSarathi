// Database selector & unified domain models for V1 and V2.
//   DB_MODE=file (default)      -> embedded JSON store, zero setup.
//   DB_MODE=supabase            -> Supabase Postgres (V2 Schema).
const mode = (process.env.DB_MODE || "file").toLowerCase();

const backend =
  mode === "supabase" ? await import("./supabaseStore.js") : await import("./store.js");

export const {
  User,
  Vendor,
  Tender,
  Requirement,
  TenderRequirement,
  Bid,
  Document,
  DocumentExtraction,
  VerificationResult,
  ComplianceResult,
  Evidence,
  AadhaarRegistry,
  MockProviderRecord,
  Evaluation,
  Award,
  AuditLog,
  connectDatabase,
  resetDatabase,
} = backend;

export const dbMode = mode === "supabase" ? "supabase" : "file";
