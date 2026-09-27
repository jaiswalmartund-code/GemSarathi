-- =============================================================================
-- GeM Verifier V2 PostgreSQL Database Schema
-- Migration: 001_v2_initial_schema.sql
-- Description: Creates core entities, relationship foreign keys, indexes,
--              mock registry tables, and RLS policies for V2 AI-assisted verification.
-- =============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. USERS
-- Stores officer and vendor authentication accounts.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('officer', 'vendor')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. VENDORS
-- Vendor profiles, organizational metadata, and statutory identifiers.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    gstin VARCHAR(20),
    pan VARCHAR(20),
    udyam_number VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. TENDERS
-- Mock GeM tender notices (GeM is the conceptual source).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_number VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    organization VARCHAR(255) NOT NULL,
    description TEXT,
    submission_deadline TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'OPEN',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 4. TENDER_REQUIREMENTS
-- Eligibility, financial, technical, and statutory criteria for tenders.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tender_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
    requirement_name VARCHAR(255) NOT NULL,
    description TEXT,
    requirement_type VARCHAR(100),
    expected_value TEXT,
    expected_unit VARCHAR(50),
    mandatory BOOLEAN DEFAULT TRUE,
    required_document_type VARCHAR(100),
    verification_rule VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 5. BIDS
-- Submissions by vendors against mock GeM tenders.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'SUBMITTED',
    compliance_score NUMERIC(5,2),
    officer_decision VARCHAR(50),
    officer_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_tender_vendor_bid UNIQUE (tender_id, vendor_id)
);

-- -----------------------------------------------------------------------------
-- 6. DOCUMENTS
-- Document metadata for uploaded bid attachments, tender notices, and registry docs.
-- Actual file binaries are stored in Supabase Storage buckets.
-- Supported prototype types: PAN, AADHAAR, FINANCIAL_STATEMENT, EXPERIENCE_CERTIFICATE,
-- COMPANY_REGISTRATION, GST, TECHNICAL_BID.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bid_id UUID NULL REFERENCES bids(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL CHECK (
        document_type IN (
            'PAN', 'AADHAAR', 'FINANCIAL_STATEMENT', 'EXPERIENCE_CERTIFICATE',
            'COMPANY_REGISTRATION', 'GST', 'TECHNICAL_BID', 'TENDER_NOTICE', 'OTHER'
        )
    ),
    original_filename VARCHAR(255) NOT NULL,
    storage_path VARCHAR(512) NOT NULL,
    mime_type VARCHAR(100),
    file_size BIGINT,
    file_hash VARCHAR(128),
    upload_status VARCHAR(50) DEFAULT 'COMPLETED',
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 7. DOCUMENT_EXTRACTIONS
-- Structured OCR and Gemini document understanding outputs.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS document_extractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    extraction_status VARCHAR(50) DEFAULT 'COMPLETED',
    extracted_data JSONB,
    extracted_text TEXT,
    extraction_method VARCHAR(100),
    confidence NUMERIC(3,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 8. VERIFICATION_RESULTS
-- Result per requirement for a bid (PASS, FAIL, REVIEW).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS verification_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bid_id UUID NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
    requirement_id UUID NOT NULL REFERENCES tender_requirements(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('PASS', 'FAIL', 'REVIEW', 'DOCUMENT_NOT_FOUND')),
    extracted_value TEXT,
    expected_value TEXT,
    compliance_score NUMERIC(5,2),
    explanation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_bid_requirement_result UNIQUE (bid_id, requirement_id)
);

-- -----------------------------------------------------------------------------
-- 9. EVIDENCE
-- Traceable evidence quotes and page citations linking results to source documents.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    verification_result_id UUID NOT NULL REFERENCES verification_results(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    page_number INT,
    evidence_text TEXT,
    extracted_value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 10. AADHAAR_REGISTRY (MOCK)
-- Mock official registry for prototype verification (simulated UIDAI data).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aadhaar_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aadhaar_number VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    date_of_birth DATE,
    address TEXT,
    reference_document_id UUID NULL REFERENCES documents(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES & PERFORMANCE OPTIMIZATIONS
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON vendors(user_id);
CREATE INDEX IF NOT EXISTS idx_vendors_email ON vendors(email);
CREATE INDEX IF NOT EXISTS idx_vendors_gstin ON vendors(gstin);
CREATE INDEX IF NOT EXISTS idx_vendors_pan ON vendors(pan);

CREATE INDEX IF NOT EXISTS idx_tenders_number ON tenders(tender_number);
CREATE INDEX IF NOT EXISTS idx_tender_requirements_tender ON tender_requirements(tender_id);

CREATE INDEX IF NOT EXISTS idx_bids_tender ON bids(tender_id);
CREATE INDEX IF NOT EXISTS idx_bids_vendor ON bids(vendor_id);
CREATE INDEX IF NOT EXISTS idx_bids_tender_vendor ON bids(tender_id, vendor_id);

CREATE INDEX IF NOT EXISTS idx_documents_bid ON documents(bid_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_document_extractions_doc ON document_extractions(document_id);

CREATE INDEX IF NOT EXISTS idx_verification_results_bid ON verification_results(bid_id);
CREATE INDEX IF NOT EXISTS idx_verification_results_req ON verification_results(requirement_id);
CREATE INDEX IF NOT EXISTS idx_evidence_verification_result ON evidence(verification_result_id);
CREATE INDEX IF NOT EXISTS idx_evidence_document ON evidence(document_id);

CREATE INDEX IF NOT EXISTS idx_aadhaar_registry_number ON aadhaar_registry(aadhaar_number);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Service role key retains full backend bypass access.
-- =============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
-- -----------------------------------------------------------------------------
-- 11. MOCK_PROVIDER_RECORDS
-- Factual reference records for the 7 mock government/reference providers.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mock_provider_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_type VARCHAR(100) NOT NULL,
    identifier VARCHAR(255) NOT NULL,
    vendor_id VARCHAR(255),
    status VARCHAR(50),
    reference_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_provider_identifier UNIQUE (provider_type, identifier)
);
CREATE INDEX IF NOT EXISTS idx_mock_provider_lookup ON mock_provider_records(provider_type, identifier);

ALTER TABLE mock_provider_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on mock_provider_records" ON mock_provider_records FOR ALL TO service_role USING (true) WITH CHECK (true);

