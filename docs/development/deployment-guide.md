# Production deploy checklist (Supabase + Render + Vercel)

All free tier, no credit card. Do this once; the app keeps working offline
without any of it.

## 1. Supabase (database + file storage + realtime) — ~15 min

1. Go to **supabase.com** → sign up → **New project** (free). Save the
   database password it shows.
2. Open the project → **SQL Editor** → paste the entire contents of
   `backend/supabase/schema.sql` → **Run**. Re-running is safe.
   Then run `backend/supabase/migration-002.sql` and
   `backend/supabase/migration-003.sql` the same way (timestamp columns +
   Realtime publication; skip if you cloned after they were merged into
   `schema.sql` — both files are safe to re-run regardless).
3. **Project Settings → API** (or the **Connect** button): copy values.
   New-format keys look like `sb_publishable_…` (public) and `sb_secret_…`
   (secret); classic `anon`/`service_role` JWTs also work:
   - `Project URL` → `SUPABASE_URL` (backend) / `VITE_SUPABASE_URL` (frontend)
   - publishable/`anon` key → `VITE_SUPABASE_KEY` (frontend only, safe to expose)
   - secret/`service_role` key → `SUPABASE_SERVICE_KEY` (**backend `.env` only**, never frontend, never git)
4. Storage bucket `bid-uploads` is created by the schema SQL. Verify under
   **Storage**; leave it **private** (the backend reads/writes with the
   service key).

## 2. Gemini key (real AI verification) — ~5 min

1. Go to **ai.google.dev** → *Get API key* → create key in a Google project.
2. Save as `GEMINI_API_KEY`. Set `GEMINI_MODEL=gemini-3.6-flash`
   (2.x models are retired for new keys). Without a key the engine runs in
   heuristic mode; with it, ambiguous checks get AI adjudication (prompt +
   response stored per compliance row for audit).

## 3. Backend on Render — ~10 min

1. Push this repo to GitHub. Go to **render.com** → *New → Web Service* →
   select the repo, root directory `backend` (or use `backend/render.yaml`
   blueprint).
2. Build: `npm install` · Start: `npm start` · Health check: `/health`.
3. Environment variables:
   - `DB_MODE=supabase`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
   - `GEMINI_API_KEY` (optional), `JWT_SECRET_KEY` (long random string),
     `FRONTEND_ORIGIN=https://<your-frontend>.vercel.app`
   - Add a **disk** (1 GB) only if you stay in file mode; not needed for Supabase.
4. After deploy: seed production data once —
   `DB_MODE=supabase SUPABASE_URL=… SUPABASE_SERVICE_KEY=… npm run seed`
   (run locally against the cloud project, or via Render Shell).

## 4. Frontend on Vercel — ~5 min

1. **vercel.com** → *Add New → Project* → select the repo, root `frontend`.
2. Environment variables:
   - `VITE_API_BASE_URL=https://<your-render-api>.onrender.com/api`
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY` (anon key, for live dashboard)
3. Deploy. Login works against the Render backend.

## 5. Final check (matches Task 4 test plan)

- Officer + vendor login, vendor PDF upload → file lands in `bid-uploads`
  bucket, row appears in `bids` table, officer dashboard updates **live**.
- Run Verification → ambiguous checks show `ai-gemini-adjudicated` with
  reasoning in the evidence drawer; every action lands in `audit_logs`.
- CSV export downloads the full matrix.
