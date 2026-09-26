# GeM Verifier V2 — Express Backend API & Verification Engine

Node.js + Express backend service powering the Procurement Officer Portal and Vendor Portal.

---

## 🏛️ Architecture Overview

The backend is structured as a **Modular Monolith**:

* `src/server.js`: Express server initialization, middleware setup, uploads directory bootstrap.
* `src/config/`: Environment configuration & Supabase client settings.
* `src/db/`: Domain models (`models.js`) and dual-mode data persistence (`DB_MODE`):
  * `DB_MODE=file` (Default / Local Demo): Embedded JSON store (`src/db/store.js`, persisted to `./data/db.json`). Zero setup for local development.
  * `DB_MODE=supabase` (Production Cloud): PostgreSQL store (`src/db/supabaseStore.js`, schema in `supabase/v2_schema.sql`).
* `src/middleware/auth.js`: JWT authentication & role authorization (`officer`, `vendor`).
* `src/routes/apiRoutes.js`: Express REST API endpoints for authentication, tenders, bids, document uploads, two-layer verification, evidence, and officer decisions.
* `src/services/ai/`: Gemini AI adapters & multimodal document understanding (`documentUnderstandingService.js`, `geminiAdapter.js`, `geminiTenderAdapter.js`).
* `src/services/documents/`: PDF parsing, OCR-ready text extraction, and file storage (`pdfExtractorService.js`, `fileStorageService.js`, `documentExtractionService.js`).
* `src/services/government/`: Standardized mock provider interfaces for 7 domains (PAN, GST, Udyam, Experience, ITR, Aadhaar, MCA).
* `src/services/verification/`: Two-layer verification engine (`technicalVerificationService.js`, `verificationPipeline.js`, `tenderIngestionService.js`).
* `src/services/scoring/`: Rule-based compliance scoring engine (`scoringService.js`).

---

## 🚀 Local Development Setup

```bash
cd backend
cp .env.example .env     # Copy environment defaults
npm install
npm run seed             # Seed local database with demo tender, bidder & requirements
npm run dev              # Start Express dev server with hot reload on http://localhost:8000
```

---

## ☁️ Production Deployment (Render / Railway / VPS / Docker)

1. Set up **Supabase PostgreSQL** by running `backend/supabase/v2_schema.sql` in the Supabase SQL Editor.
2. In Supabase **Storage**, create 3 private storage buckets:
   - `tenders`
   - `bids`
   - `aadhaar-registry`
3. Configure environment variables in your server host:

```env
PORT=8000
API_PREFIX=/api
FRONTEND_ORIGIN=https://your-frontend-domain.com
DB_MODE=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
GEMINI_API_KEY=your-google-gemini-api-key
GEMINI_MODEL=gemini-3.6-flash
JWT_SECRET_KEY=your-production-jwt-secret
```

4. Production start command:
```bash
npm install && npm start
```

---

## 🛠️ Npm Scripts & Testing

```bash
npm run dev                 # Start server in watch mode
npm start                   # Start production server
npm run seed                # Seed local JSON database
npm run clean               # Clean generated evaluation data
npm run clean:0             # Purge all records down to 0
npm run verify:canonical    # Verify canonical tender (GEM/2026/B/DEMO-001) & bid data
npm run test:technical-bid  # Test PDF extraction & Gemini pipeline
npm run test:two-layer      # Run 2-layer verification test suite (Layer 1 Technical + Layer 2 7 Providers)
```
