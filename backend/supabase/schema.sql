-- GeMVerifier Supabase schema (V1 production upgrade).
-- Mirrors the application's data model 1:1 so no route or UI code changes.
-- Run once in Supabase Dashboard > SQL Editor. Safe to re-run (IF NOT EXISTS).

-- ---------- tables ----------
CREATE TABLE IF NOT EXISTS users (
  "_id" UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  "passwordHash" TEXT,
  role TEXT CHECK (role IN ('officer', 'vendor')),
  "isActive" BOOLEAN DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendors (
  "_id" UUID PRIMARY KEY,
  "userId" UUID REFERENCES users("_id"),
  "legalName" TEXT,
  "vendorCode" TEXT UNIQUE,
  contact JSONB DEFAULT '{}'::jsonb,
  organization JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'Active',
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenders (
  "_id" UUID PRIMARY KEY,
  "referenceNumber" TEXT UNIQUE NOT NULL,
  title TEXT,
  department TEXT,
  description TEXT,
  "submissionDeadline" TIMESTAMPTZ,
  status TEXT DEFAULT 'DRAFT',
  "createdBy" UUID,
  "awardedVendorId" UUID,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tender_requirements (
  "_id" UUID PRIMARY KEY,
  "tenderId" UUID REFERENCES tenders("_id") ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  category TEXT,
  mandatory BOOLEAN DEFAULT TRUE,
  "requirementOrder" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_requirements_tender ON tender_requirements("tenderId", "requirementOrder");

CREATE TABLE IF NOT EXISTS bids (
  "_id" UUID PRIMARY KEY,
  "tenderId" UUID REFERENCES tenders("_id") ON DELETE CASCADE,
  "vendorId" UUID REFERENCES vendors("_id"),
  "submissionStatus" TEXT,
  "submittedAt" TIMESTAMPTZ,
  "bidReference" TEXT,
  "bidMetadata" JSONB DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("tenderId", "vendorId")
);

CREATE TABLE IF NOT EXISTS compliance_results (
  "_id" UUID PRIMARY KEY,
  "evaluationId" UUID,
  "tenderId" UUID,
  "requirementId" UUID,
  "vendorId" UUID,
  "bidId" UUID,
  status TEXT CHECK (status IN ('compliant', 'non_compliant', 'needs_review')),
  "evidenceText" TEXT,
  "sourceDocumentId" UUID,
  "pageNumber" INTEGER,
  explanation TEXT,
  confidence DOUBLE PRECISION,
  "determinationSource" TEXT,
  "geminiPrompt" TEXT,
  "geminiResponse" TEXT,
  "humanReviewed" BOOLEAN DEFAULT FALSE,
  "reviewedBy" UUID,
  "reviewedAt" TIMESTAMPTZ,
  "reviewComment" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_results_eval ON compliance_results("evaluationId", "requirementId", "vendorId");

CREATE TABLE IF NOT EXISTS evaluations (
  "_id" UUID PRIMARY KEY,
  "tenderId" UUID REFERENCES tenders("_id") ON DELETE CASCADE,
  status TEXT,
  "startedBy" UUID,
  "completedBy" UUID,
  "startedAt" TIMESTAMPTZ,
  "completedAt" TIMESTAMPTZ,
  "overallSummary" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contract_awards (
  "_id" UUID PRIMARY KEY,
  "tenderId" UUID,
  "evaluationId" UUID,
  "vendorId" UUID REFERENCES vendors("_id"),
  status TEXT,
  "awardedAt" TIMESTAMPTZ,
  "awardedBy" UUID,
  "contractReference" TEXT,
  "contractStartDate" TIMESTAMPTZ,
  "contractEndDate" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  "_id" UUID PRIMARY KEY,
  "actorUserId" UUID,
  "actorRole" TEXT,
  action TEXT,
  "entityType" TEXT,
  "entityId" UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs("entityType", "entityId", timestamp DESC);

CREATE TABLE IF NOT EXISTS documents (
  "_id" UUID PRIMARY KEY,
  "tenderId" UUID,
  "bidId" UUID,
  "vendorId" UUID,
  "evaluationId" UUID,
  "contractAwardId" UUID,
  "documentType" TEXT,
  "originalFilename" TEXT,
  "storagePath" TEXT,
  "mimeType" TEXT,
  "fileSize" BIGINT,
  "uploadedBy" UUID,
  visibility TEXT,
  status TEXT,
  "uploadedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_documents_bid ON documents("bidId", "tenderId", "vendorId", "evaluationId");

-- ---------- Row Level Security ----------
-- Backend uses the SERVICE ROLE key (bypasses RLS). These policies allow the
-- frontend's ANON key to subscribe/read for the live dashboard. Tighten for
-- real production (e.g. vendor-id-scoped policies via Supabase Auth).
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon read all') THEN
    CREATE POLICY "anon read all" ON users FOR SELECT TO anon USING (true);
    CREATE POLICY "anon read all" ON vendors FOR SELECT TO anon USING (true);
    CREATE POLICY "anon read all" ON tenders FOR SELECT TO anon USING (true);
    CREATE POLICY "anon read all" ON tender_requirements FOR SELECT TO anon USING (true);
    CREATE POLICY "anon read all" ON bids FOR SELECT TO anon USING (true);
    CREATE POLICY "anon read all" ON compliance_results FOR SELECT TO anon USING (true);
    CREATE POLICY "anon read all" ON evaluations FOR SELECT TO anon USING (true);
    CREATE POLICY "anon read all" ON contract_awards FOR SELECT TO anon USING (true);
    CREATE POLICY "anon read all" ON audit_logs FOR SELECT TO anon USING (true);
    CREATE POLICY "anon read all" ON documents FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- ---------- Storage bucket for bid PDFs ----------
INSERT INTO storage.buckets (id, name, public)
VALUES ('bid-uploads', 'bid-uploads', false)
ON CONFLICT (id) DO NOTHING;
