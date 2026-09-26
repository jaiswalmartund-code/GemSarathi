# Full Repository Audit Report — GEM Verifier

**Phase 1 Complete Audit**
**Date:** September 2026

---

## 1. Overview & Classification Summary

This document presents the full audit of the GEM Verifier codebase prior to final production restructuring. Every file in the repository has been evaluated and classified into one of six categories:

1. **KEEP**: Essential production or canonical file. Retained as-is or with minor formatting.
2. **REFACTOR**: Active code file requiring modularization, updated imports, or structural enhancement.
3. **MOVE**: File to be relocated to align with the target architecture.
4. **RENAME**: File to be renamed for naming consistency (e.g. `PascalCasePage.jsx` or `camelCaseService.js`).
5. **DELETE**: Unused, obsolete, scratch, duplicate, or legacy file confirmed non-essential for production.
6. **REVIEW**: File requiring verification or configuration check before proceeding.

---

## 2. Directory-by-Directory Audit & File Classifications

### 2.1 Root Directory

| File / Path | Classification | Rationale |
|---|---|---|
| `.gitignore` | KEEP | Root gitignore file; ensures secrets, node_modules, and uploads are ignored. |
| `README.md` | REFACTOR | Main repository documentation; update to reflect target architecture and service boundaries. |
| `DEPLOY.md` | MOVE | Relocate to `docs/development/deployment-guide.md` to centralize documentation. |
| `scratch/` | DELETE | Contains temporary manual test scripts (`test-officer-tenders.js`, `test-vendor-upload-submit.js`) not part of formal test suite. |

### 2.2 Documentation (`docs/`)

| File / Path | Classification | Rationale |
|---|---|---|
| `docs/CURRENT_ARCHITECTURE.md` | MOVE / REFACTOR | Relocate to `docs/architecture/current-architecture.md` and expand per Phase 9. |
| `docs/V2_MIGRATION_PLAN.md` | MOVE | Relocate to `docs/development/v2-migration-plan.md` for historical development context. |
| `docs/database/migrations/001_v2_initial_schema.sql` | MOVE | Relocate to `backend/supabase/001_v2_initial_schema.sql` to consolidate migration scripts. |
| `docs/legacy/frontend/ActivityPage.jsx` | DELETE | Unused prototype file from early UI exploration. Confirmed unreferenced by `App.jsx` or any component. |
| `docs/legacy/frontend/SettingsPage.jsx` | DELETE | Unused prototype file from early UI exploration. Confirmed unreferenced by `App.jsx` or any component. |

### 2.3 Demo Documents (`demo-docs/`)

| File / Path | Classification | Rationale |
|---|---|---|
| `demo-docs/README.md` | KEEP | Explains canonical demo data and document packages. |
| `demo-docs/tenders/GEM_2026_B_DEMO_001_Tender.pdf` | KEEP | **Canonical Tender PDF** required for test pipeline and demonstration. |
| `demo-docs/bids/Apex_Network_Solutions_Technical_Bid.pdf` | KEEP | **Canonical Vendor Technical Bid PDF** required for test pipeline and demonstration. |
| `demo-docs/cert-pack/*` | MOVE / REFACTOR | Supporting certificates for Acme, Brightline, Shady Traders. Consolidate under `demo-docs/supporting-documents/`. |
| `demo-docs/mock-registry-certs/*` | DELETE | Exact 1:1 duplicate of `demo-docs/cert-pack/`. Confirmed redundant. |

### 2.4 Backend Core (`backend/`)

| File / Path | Classification | Rationale |
|---|---|---|
| `backend/.env` | KEEP | Local environment configuration. Kept ignored in `.gitignore`. |
| `backend/.env.example` | REFACTOR | Sanitized template. Remove real secrets; ensure all required environment variable keys are documented. |
| `backend/README.md` | KEEP | Backend setup and operational documentation. |
| `backend/render.yaml` | KEEP | Deployment configuration for hosting services. |
| `backend/package.json` | REFACTOR | Audit dependencies and remove unused packages. |
| `backend/package-lock.json` | KEEP | Lockfile for reproducible builds. |
| `backend/data/db.json` | DELETE | Obsolete local file database snapshot. Production canonical DB is Supabase. |
| `backend/uploads/` | KEEP | Local file uploads directory (used when local disk storage fallback is enabled). |

### 2.5 Backend Supabase Migrations (`backend/supabase/`)

| File / Path | Classification | Rationale |
|---|---|---|
| `backend/supabase/schema.sql` | KEEP | Base Supabase table schemas and RLS setup. |
| `backend/supabase/v2_schema.sql` | KEEP | V2 schema extensions. |
| `backend/supabase/migration-002.sql` | KEEP | Migration for bid documents & evaluations. |
| `backend/supabase/migration-003.sql` | KEEP | Migration for audit logging & verification tracking. |

### 2.6 Backend Source (`backend/src/`)

#### Config & Database

| File / Path | Classification | Rationale |
|---|---|---|
| `backend/src/config/index.js` | REFACTOR | Central configuration module. Ensure environment variables are typed and documented. |
| `backend/src/config/supabase.js` | REFACTOR | Supabase client setup. Keep decoupled. |
| `backend/src/db/models.js` | REFACTOR | Unified domain model exports. |
| `backend/src/db/store.js` | REFACTOR | File-backed memory store. Maintain as zero-dependency fallback for offline/isolated tests. |
| `backend/src/db/supabaseStore.js` | REFACTOR | Supabase Postgres persistence implementation. |
| `backend/src/middleware/auth.js` | REFACTOR | Role-based authorization middleware (officer / vendor). |
| `backend/src/server.js` | REFACTOR | Express application entry point. Clean up route registration and middleware hooks. |

#### Services (Reorganize to Service Boundaries)

| Current File | Target Location | Classification | Rationale |
|---|---|---|---|
| `geminiAiService.js` | `services/ai/geminiAdapter.js` | MOVE / REFACTOR | Gemini LLM provider implementation. |
| `geminiTenderService.js` | `services/ai/geminiTenderAdapter.js` | MOVE / REFACTOR | Gemini tender requirement extraction provider. |
| New File | `services/ai/documentUnderstandingService.js` | CREATE | AI Interface/Adapter boundary for document understanding & extraction. |
| `pdfExtractorService.js` | `services/documents/pdfExtractorService.js` | MOVE / REFACTOR | PDF text and page extraction service. |
| `technicalBidExtractionService.js` | `services/documents/documentExtractionService.js` | MOVE / RENAME | Technical bid document extraction & parsing. |
| `fileStorageService.js` | `services/documents/fileStorageService.js` | MOVE / REFACTOR | Storage adapter (local upload / Supabase storage). |
| `mockRegistryService.js` | `services/government/` | REFACTOR / SPLIT | Modularize into distinct government verification mock providers (GST, PAN, MCA, Udyam, Experience, Identity, OEM, ISO). |
| `bidVerificationService.js` | `services/verification/technicalVerificationService.js` | MOVE / RENAME | Technical requirement verification logic. |
| `tenderIngestionService.js` | `services/verification/tenderIngestionService.js` | MOVE / REFACTOR | Tender PDF parsing & requirement ingestion orchestrator. |
| `verificationPipelineService.js` | `services/verification/verificationPipeline.js` | MOVE / RENAME | Main verification coordinator. Ensure no direct Gemini or government mock calls exist in engine core. |
| `complianceEngine.js` | `services/scoring/scoringService.js` | MOVE / RENAME | Deterministic compliance scoring, weighting, risk calculation, and recommendation engine. |

#### Routes & Controllers

| Current File | Target Location | Classification | Rationale |
|---|---|---|---|
| `backend/src/routes/apiRoutes.js` | `backend/src/routes/` & `controllers/` | REFACTOR / SPLIT | 49KB monolithic route file. Split into modular routes (`authRoutes.js`, `tenderRoutes.js`, `bidRoutes.js`, `evaluationRoutes.js`, `vendorRoutes.js`, `awardRoutes.js`, `aiRoutes.js`) and corresponding controllers. |

#### Backend Scripts (`backend/src/scripts/` -> `backend/scripts/`)

| File / Path | Classification | Rationale |
|---|---|---|
| `backend/src/scripts/*` (13 files) | MOVE | Relocate from `backend/src/scripts/` to `backend/scripts/` per target project structure. |

---

### 2.7 Frontend (`frontend/`)

| File / Path | Classification | Rationale |
|---|---|---|
| `frontend/package.json` | REFACTOR | Dependency audit and cleanup. |
| `frontend/src/App.jsx` | REFACTOR | Router configuration. Ensure all active routes use clean component names. |
| `frontend/src/pages/Dashboard.jsx` | RENAME | Rename to `DashboardPage.jsx` for consistent `PascalCasePage.jsx` naming convention. |
| `frontend/src/pages/VendorDashboard.jsx` | RENAME | Rename to `VendorDashboardPage.jsx` for consistent `PascalCasePage.jsx` naming convention. |
| `frontend/src/pages/TendersPage.jsx` | KEEP | Active officer tenders listing page. |
| `frontend/src/pages/TenderDetailPage.jsx` | KEEP | Active officer tender detail & bid overview page. |
| `frontend/src/pages/EvaluationPage.jsx` | KEEP | Active bid compliance evaluation & matrix page. |
| `frontend/src/pages/VendorsPage.jsx` | KEEP | Active vendor list page. |
| `frontend/src/pages/VendorProfilePage.jsx` | KEEP | Active vendor profile & history page. |
| `frontend/src/pages/ContractAwardPage.jsx` | KEEP | Active contract award creation page. |
| `frontend/src/pages/ContractDetailsPage.jsx` | KEEP | Active contract detail view page. |
| `frontend/src/pages/LoginPage.jsx` | KEEP | Active login page. |
| `frontend/src/components/` | KEEP | React UI components (`AppShell.jsx`, `ErrorBoundary.jsx`, `StatusBadge.jsx`, and `evaluation/*` components). |
| `frontend/src/services/` | REFACTOR | Frontend API clients (`apiClient.js`, `authService.js`, `evaluationService.js`, `procurementService.js`). |

---

## 3. Confirmed Deletions Summary & Justification

| File / Folder | Reason for Deletion |
|---|---|
| `scratch/test-officer-tenders.js` | Temporary unintegrated scratch script. Replaced by `backend/scripts/` verification suite. |
| `scratch/test-vendor-upload-submit.js` | Temporary unintegrated scratch script. Replaced by `backend/scripts/` verification suite. |
| `docs/legacy/frontend/ActivityPage.jsx` | Obsolete prototype page. Unreferenced by router or shell. |
| `docs/legacy/frontend/SettingsPage.jsx` | Obsolete prototype page. Unreferenced by router or shell. |
| `demo-docs/mock-registry-certs/` | Duplicate directory identical to `demo-docs/cert-pack/`. |
| `backend/data/db.json` | Old local database snapshot file. Data regenerated via seed scripts. |

---

## 4. Canonical Assets & Data Preserved

The following canonical entities and documents are explicitly **retained and preserved**:
- **Canonical Tender**: `GEM/2026/B/DEMO-001` (Customs IT Infrastructure Upgrade)
- **Canonical Vendor**: `Apex Network Solutions Private Limited`
- **Canonical Bid Document**: `demo-docs/bids/Apex_Network_Solutions_Technical_Bid.pdf`
- **Canonical Tender Document**: `demo-docs/tenders/GEM_2026_B_DEMO_001_Tender.pdf`
- **Verification Engine, Gemini Integration, Supabase Persistence, Authentication, and Schema Migrations**.
