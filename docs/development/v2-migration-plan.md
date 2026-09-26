# GeM Verifier V2 Migration Plan

This plan outlines the categorization of current codebase assets and the roadmap for transitioning from V1 (full tender management prototype) to V2 (focused AI-assisted GeM bid verification system).

---

## V2 Product Workflow Target

```
Mock GeM Tender (Backend)
         ↓
Vendor Submits Bid Documents
         ↓
PDF Parsing / OCR
         ↓
Gemini Document Understanding
         ↓
Requirement Extraction & Structuring
         ↓
Evidence Extraction
         ↓
KYC & Official Document Verification
         ↓
Deterministic Verification Engine
         ↓
PASS / FAIL / REVIEW Evaluation Matrix
         ↓
Officer Review & Final Decision
```

---

## Categorization Matrix

### 1. KEEP (Retain As-Is / Core Foundation)
- **Backend Architecture Base**: Node.js + Express REST API foundation (`server.js`, `config/index.js`, `middleware/auth.js`).
- **Deterministic Compliance Engine**: `complianceEngine.js` rule definitions for scoring and threshold verification.
- **Embedded Database Storage Engine**: `store.js` embedded JSON file DB for zero-dependency local execution.
- **Frontend Core Shell & Auth**: `AppShell.jsx`, `AuthProvider.jsx`, `LanguageContext.jsx`, `LoginPage.jsx`, `ErrorBoundary.jsx`.
- **Frontend Evaluation UI Components**: `ComplianceMatrix.jsx`, `EvidenceDrawer.jsx`, `ComplianceSummary.jsx`, `DocumentPreviewModal.jsx`.
- **Demo Document Packs**: `demo-docs/tenders/`, `demo-docs/bids/`, and `demo-docs/mock-registry-certs/`.

---

### 2. MODIFY (Adapt for V2 Responsibilities)
- **`backend/src/routes/apiRoutes.js` (and `routes/index.js`)**: Refactor from monolithic routes into modular route handlers (`tenderRoutes`, `bidRoutes`, `documentRoutes`, `verificationRoutes`, `kycRoutes`).
- **`backend/src/services/extract.js` (`pdfExtractorService.js`)**: Upgrade PDF parsing pipeline to support OCR fallback for scanned images and structured tables.
- **`backend/src/services/gemini.js` (`geminiAiService.js`)**: Upgrade Gemini integration from optional second-opinion to primary document understanding and structured requirement/evidence extraction engine.
- **`backend/src/services/mockPortals.js` (`mockRegistryService.js`)**: Expand mock registry connectors into a formal KYC / Official Document Verification module.
- **`frontend/src/pages/EvaluationPage.jsx`**: Focus evaluation view on AI verification pipeline, requirement extraction, evidence mapping, and officer decision gate.
- **`frontend/src/pages/VendorDashboard.jsx`**: Streamline vendor workflow for bid document submission.

---

### 3. REPLACE (Redesign in V2)
- **Full Tender Lifecycle Features**: Replace broad V1 tender management routes with lightweight Mock GeM Tender models.
- **Contract Award Workflows**: Replace V1 award creation and historic contract management (`ContractAwardPage.jsx`, `ContractDetailsPage.jsx`) with a streamlined Officer Final Decision Gate.
- **Heuristic Text Extraction**: Replace simple regex keyword matching with Gemini structured JSON extraction + OCR.

---

### 4. DELETE / ARCHIVE (Obsolete V1 Features)
- **Obsolete Unused Pages (Archived in `docs/legacy/frontend/`)**:
  - `ActivityPage.jsx`: Legacy activity timeline page replaced by Evaluation matrix audit log.
  - `SettingsPage.jsx`: Legacy static settings page.
- **V1 Contract Management Endpoints**: Endpoints solely related to issuing awards and managing historic contract post-evaluations.

---

### 5. NEW (To Be Built in V2 Phase)
- **OCR Service (`backend/src/services/ocrService.js`)**: Tesseract / Cloud OCR engine for scanned PDF documents.
- **Gemini Extraction Service (`backend/src/services/geminiExtractorService.js`)**: Structured schema extraction for vendor bid documents.
- **KYC & Document Verification Service (`backend/src/services/kycVerificationService.js`)**: Verification service checking GSTIN, PAN, Udyam, EPFO, and ISO authenticity.
- **Requirement & Evidence Matcher (`backend/src/services/evidenceService.js`)**: Direct evidence snippet to tender requirement matcher with page number & quote references.
