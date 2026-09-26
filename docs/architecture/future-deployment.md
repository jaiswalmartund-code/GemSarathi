# Future Deployment Roadmap

This document records deployment direction without adding infrastructure to the current demo or production-restructuring scope.

## Current baseline

The backend is a single Express process and the frontend is a static Vite build. Local development can run entirely in file database mode. A deployed environment should use Supabase Postgres and server-side object storage credentials.

## Recommended stages

1. Build the frontend into a static artifact and serve it from a CDN or static hosting provider.
2. Package the backend as an immutable Node.js service with health checks and a non-root runtime user.
3. Use Supabase Postgres for relational data and Supabase Storage (or an S3-compatible store) for uploaded documents.
4. Move long-running PDF/OCR and AI work to a queued worker only when workload requires it; keep the HTTP API responsive.
5. Add centralized logs, request IDs, metrics, alerting, backups, and retention policies before production scale-up.

## Security and operations

- Keep `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET_KEY`, and `GEMINI_API_KEY` server-side only.
- Restrict CORS to the deployed frontend origin and configure upload size/type limits at both proxy and application layers.
- Use TLS, secret management, database migrations, least-privilege storage policies, and regular restore tests.
- Preserve deterministic scoring and audit evidence independently of optional AI provider availability.

## Deliberate non-goals for now

Docker, Kafka, worker orchestration, and provider-specific infrastructure are not required for the current repository restructuring. They should be introduced only with an explicit operational requirement and an accompanying migration/test plan.
