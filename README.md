# GeM Verifier V2 — AI-Powered GeM Technical Bid Verification Platform

An automated, AI-assisted bid verification platform for **Government e-Marketplace (GeM)** tenders.

It provides end-to-end verification across two distinct layers:
1. **Layer 1 — Technical Bid Evaluation**: Extracting technical specifications from PDF bids and evaluating them deterministically against tender requirements.
2. **Layer 2 — Government & Credential Verification**: Cross-verifying vendor credentials across 7 standardized provider domains (PAN, GST, Udyam, Experience, ITR/Financials, Aadhaar/Signatory Identity, MCA/CIN).

> **AI Core Principle:**  
> **AI UNDERSTANDS. RULES VERIFY. HUMANS DECIDE.**  
> Google Gemini extracts and understands structured evidence from PDF documents. Deterministic rule engines perform verification and output explainable compliance scores. Procurement officers retain 100% control over final decision-making.

---

## 🏛️ System Architecture

```
                  ┌─────────────────────────────────────┐
                  │         React + Vite UI             │
                  │   (Officer & Vendor Portals)        │
                  └──────────────────┬──────────────────┘
                                     │ REST API
                                     ▼
                  ┌─────────────────────────────────────┐
                  │      Express.js API Server          │
                  │     (Modular Monolith Backend)      │
                  └──────┬───────────┬───────────┬──────┘
                         │           │           │
        ┌────────────────┘           │           └────────────────┐
        ▼                            ▼                            ▼
┌──────────────┐          ┌────────────────────┐      ┌────────────────────────┐
│ Gemini AI    │          │ Deterministic Two- │      │  Database Layer        │
│ Document     │          │ Layer Verification │      │  Dual-Mode Persistence │
│ Processing   │          │ & Scoring Engine   │      │  (Supabase / JSON DB)  │
└──────────────┘          └──────────┬─────────┘      └────────────────────────┘
                                     │
                                     ▼
                          ┌────────────────────┐
                          │ 7 Mock Government  │
                          │ Provider Interfaces│
                          │ (PAN, GST, Udyam,  │
                          │ Exp, ITR, Aadhaar, │
                          │       MCA)         │
                          └────────────────────┘
```

### Architecture Highlights

* **Frontend (`/frontend`)**: Single Page Application built with **React** and **Vite**, featuring tailored portals for Procurement Officers (Tender management, bid evaluation matrix, PDF viewer with inline bounding quotes, evidence drawer, officer decision forms) and Vendors (Tender browsing, requirement inspection, technical bid creation, PDF uploading, submission status).
* **Backend (`/backend`)**: Express.js REST API structured as a modular monolith:
  * `config/`: App & Supabase settings
  * `db/`: Domain models (`models.js`), embedded JSON store (`store.js`), and Supabase Postgres store (`supabaseStore.js`)
  * `middleware/`: JWT authentication & role-based access control (`auth.js`)
  * `routes/`: Express REST API endpoints (`apiRoutes.js`)
  * `services/ai/`: Gemini LLM adapters & document understanding (`documentUnderstandingService.js`, `geminiAdapter.js`, `geminiTenderAdapter.js`)
  * `services/documents/`: PDF text extraction, OCR-ready parser, and file storage (`pdfExtractorService.js`, `fileStorageService.js`, `documentExtractionService.js`)
  * `services/government/`: 7 standardized mock provider domain interfaces (PAN, GST, Udyam, Experience, ITR, Aadhaar, MCA)
  * `services/verification/`: Two-layer verification engine (`technicalVerificationService.js`, `verificationPipeline.js`, `tenderIngestionService.js`)
  * `services/scoring/`: Rule-based compliance scoring engine (`scoringService.js`)
* **Dual-Mode Persistence (`DB_MODE`)**:
  * **`DB_MODE=file` (Default / Local Demo)**: Embedded JSON store (`backend/data/db.json`) requiring zero setup or cloud databases.
  * **`DB_MODE=supabase` (Production Cloud)**: Supabase PostgreSQL (`backend/supabase/v2_schema.sql` / `001_v2_initial_schema.sql`) and Supabase Storage buckets (`tenders`, `bids`, `aadhaar-registry`).

---

## 🔐 Strict Portal Role Boundaries

* **Vendor Portal (`/vendor/dashboard`)**:
  * Browse open tenders & inspect requirements
  * Create bid & upload/replace technical bid PDFs
  * Review and submit bid
  * *Strictly isolated:* Vendors cannot see AI extracted data, compliance scores, risk levels, verification evidence, officer notes, or officer decisions.
* **Officer Portal (`/`, `/tenders`, `/tenders/:id`, `/bids/:id`, `/vendors`, `/awards/:id`)**:
  * View submitted bids per tender
  * Run two-layer AI verification pipeline
  * View requirement-level compliance matrix (PASS / FAIL / REVIEW)
  * Inspect extracted PDF evidence quotes & page numbers
  * View 7-provider government reference verification checks
  * Submit final decision (`ACCEPT`, `REQUEST_REVIEW`, `REJECT`) & assign contracts

---

## 🚀 Quick Start (Local Development)

### Requirements:
* **Node.js 20+**
* npm 10+

### Steps:

```bash
# 1. Clone repository & enter project directory
cd gem-verifier-main

# 2. Setup & start backend (Terminal 1)
cd backend
cp .env.example .env
npm install
npm run dev        # Backend API listening on http://localhost:8000

# 3. Setup & start frontend (Terminal 2)
cd ../frontend
npm install
npm run dev        # Frontend UI listening on http://localhost:5173
```

Open `http://localhost:5173` in your browser.

#### Demo Credentials:
* **Procurement Officer**: `officer@gem.gov.in` / `officer123`
* **Vendor (Apex Network Solutions)**: `apex@apexnet.in` / `vendor123`

---

## ☁️ Production Deployment Guide

### 1. Database & Storage Setup (Supabase)

1. Create a new project on [Supabase](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard and run `backend/supabase/v2_schema.sql` (or `backend/supabase/migrations/001_v2_initial_schema.sql`).
3. In **Storage**, create 3 private storage buckets:
   - `tenders`
   - `bids`
   - `aadhaar-registry`
4. Copy your project **URL** and **Service Role Key** (`SUPABASE_SERVICE_ROLE_KEY`).

### 2. Backend Deployment (Render / Railway / VPS / Docker)

1. Deploy the `backend/` workspace to your Node server provider (e.g. Render, Railway, AWS App Runner).
2. Configure environment variables in host dashboard:

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

3. Build and start command:
```bash
npm install && npm start
```

### 3. Frontend Deployment (Vercel / Netlify / Cloudflare Pages)

1. Deploy the `frontend/` workspace to your static hosting provider (e.g., Vercel or Netlify).
2. Set build environment variables:

```env
VITE_API_BASE_URL=https://your-backend-domain.com/api
```

3. Build settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

---

## 🛠️ Maintenance & Verification Scripts

All testing, verification, and seeding scripts live under `backend/scripts/`:

```bash
# Verify canonical tender (GEM/2026/B/DEMO-001) & bid data integrity
npm run verify:canonical

# Run technical bid PDF extraction & Gemini pipeline test
npm run test:technical-bid

# Run full Two-Layer Verification Test Suite (Layer 1 Technical + Layer 2 7-Provider Verification)
npm run test:two-layer

# Reset database data cleanly
npm run clean

# Fully reset records to 0
npm run clean:0

# Seed Supabase PostgreSQL cloud database
node scripts/seed-supabase-runtime.js
```

---

## 📁 Repository Structure

```
gem-verifier-main/
├── README.md                           # Main project overview & documentation
├── TASK.md                             # Phase & development task tracker
│
├── backend/                            # Express.js REST API & Verification Engine
│   ├── package.json                    # Backend dependencies & npm scripts
│   ├── .env.example                    # Environment variable template
│   ├── render.yaml                     # Render deployment configuration
│   ├── data/
│   │   └── db.json                     # Local JSON database (DB_MODE=file)
│   ├── scripts/                        # Maintenance, seed & test scripts
│   │   ├── apply-v2-schema.js
│   │   ├── clean-data.js
│   │   ├── seed.js
│   │   ├── seed-supabase-runtime.js
│   │   ├── test-gemini.js
│   │   ├── test-supabase-connectivity.js
│   │   ├── test-technical-bid-pipeline.js
│   │   ├── test-two-layer-verification.js
│   │   └── verify-canonical-data.js
│   ├── src/
│   │   ├── server.js                   # Main Express server entrypoint
│   │   ├── config/                     # Application & Supabase config
│   │   ├── db/                         # Domain models & dual storage engine
│   │   ├── middleware/                 # JWT auth & role authorization middleware
│   │   ├── routes/                     # Express REST API routes
│   │   ├── services/
│   │   │   ├── ai/                     # Gemini AI adapters & document understanding
│   │   │   ├── documents/              # PDF text extraction, OCR & storage
│   │   │   ├── government/             # 7 Mock Provider Interfaces (PAN, GST, Udyam, Exp, ITR, Aadhaar, MCA)
│   │   │   ├── scoring/                # Deterministic scoring engine
│   │   │   └── verification/           # Two-layer verification pipeline
│   │   └── utils/
│   └── supabase/                       # PostgreSQL SQL Schema & Migrations
│       ├── v2_schema.sql               # Canonical V2 schema
│       └── migrations/
│           └── 001_v2_initial_schema.sql
│
├── frontend/                           # React + Vite Web Application
│   ├── package.json                    # Frontend dependencies & scripts
│   ├── vite.config.js                  # Vite configuration
│   ├── index.html                      # HTML entrypoint
│   └── src/
│       ├── main.jsx                    # React entrypoint
│       ├── App.jsx                     # Root Router & Protected Routes
│       ├── globals.css                 # Global CSS design system
│       ├── components/                 # Shared UI components
│       ├── context/                    # Auth & Language Contexts
│       ├── i18n/                       # Multilingual translations
│       ├── pages/                      # Role-separated views (Officer & Vendor)
│       └── services/                   # Frontend API Client services
│
├── demo-docs/                          # Demo Tender & Technical Bid PDFs
└── docs/                               # Architecture & Migration Docs
```
