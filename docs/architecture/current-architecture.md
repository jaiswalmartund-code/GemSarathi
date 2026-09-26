# Current Architecture

This is the production restructuring target currently implemented in the GEM Verifier repository. The system keeps a zero-setup file mode for local demos and supports Supabase Postgres for deployment.

## Request flow

```text
React/Vite frontend
  -> apiClient (REST + bearer token)
  -> Express API (backend/src/server.js, /api)
  -> auth/middleware + route handlers
  -> service boundaries
       AI: documentUnderstandingService -> Gemini adapter (optional)
       Documents: PDF extraction, bid extraction, file storage
       Government: provider interface + mock GST/PAN/MCA/Udyam/etc. providers
       Verification: tender ingestion and technical bid pipeline
       Scoring: deterministic score, risk, and recommendation
  -> domain models (backend/src/db/models.js)
       file store (DB_MODE=file) OR Supabase store (DB_MODE=supabase)
```

## Frontend

- `src/App.jsx` owns routes and role-protected navigation.
- `src/pages/` contains officer, vendor, tender, evaluation, vendor, and award pages. Page files use the `*Page.jsx` naming convention.
- `src/components/evaluation/` contains the compliance matrix, summary, evidence drawer, document preview, and vendor document drawer.
- `src/services/` contains API clients; `src/context/` contains authentication and language state.

## Backend service boundaries

- `services/ai/`: provider-neutral document understanding and Gemini adapters. AI output is an input to verification, not the final score.
- `services/documents/`: PDF text extraction, technical-bid fact extraction, and local/Supabase file storage.
- `services/government/`: government verification interface and isolated provider implementations.
- `services/verification/`: tender ingestion and technical verification orchestration.
- `services/scoring/`: deterministic weighted scoring and risk/recommendation synthesis.

## Persistence and configuration

`backend/src/db/models.js` selects the data implementation from `DB_MODE`. File mode persists to `DB_FILE` (default `backend/data/db.json`); Supabase mode uses the V2 relational schema in `backend/supabase/` and the server-only service-role key. Uploads use local disk by default and can be routed through the storage service for Supabase deployments.

Required configuration is documented in `backend/.env.example`. `.env`, upload folders, generated database data, and build output are ignored by git.

## Canonical demo data

The canonical verification scenario is tender `GEM/2026/B/DEMO-001` and vendor `Apex Network Solutions Private Limited`. Its requirements are intentionally two-layered:

1. Layer 1 — statutory and document eligibility requirements.
2. Layer 2 — tender-specific technical requirements.

The canonical verification script checks the expected tender, vendor, bid, document, extraction, results, and evidence state.

## Operational entry points

- `npm run dev` / `npm start` in `backend/` starts the API.
- `npm run dev`, `npm run lint`, and `npm run build` in `frontend/` operate the SPA.
- `npm run seed`, `npm run clean`, and `npm run verify:canonical` in `backend/` manage and verify demo data.
