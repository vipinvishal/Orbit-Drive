# Orbit Drive — Frontend (Phase 5)

Minimal Next.js client for Orbit Drive, per `mvp.md` §5 Phase 5. Thin by
design: no business logic here, just calls the FastAPI backend (Phases
1-4) directly from the browser.

## Pages

- `/` — marketing landing page (hero, security/trust section, features,
  how it works, roadmap)
- `/privacy` — privacy policy (static content, required for Google OAuth
  verification)
- `/signup`, `/login` — auth, stores the JWT in `localStorage`
- `/accounts` — connected Google accounts + quota, "Connect Google Account"
  button, pooled storage summary
- `/dashboard` — folder/file browser, drag-drop upload, filename search,
  pooled storage summary

## Local setup

```bash
cd frontend
npm install
cp .env.local.example .env.local
# BACKEND_ORIGIN defaults to http://localhost:8000 — change if your
# backend runs elsewhere. Server-only: proxied through /api/* by
# next.config.ts's rewrite, never exposed to the browser.
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The backend must be
running (see `../backend/README.md`) with `FRONTEND_URL=http://localhost:3000`
in its `.env` so CORS allows requests from here, and so the Google OAuth
callback redirects back to the right place.

## Notes

- Auth: JWT stored in `localStorage`, sent as `Authorization: Bearer` on
  every API call. No refresh-token rotation — matches the backend's
  7-day JWT expiry (Phase 1).
- "Connect Google Account" navigates via `window.location.href` (not
  `fetch`) to `GET /accounts/google/connect?access_token=...`, since the
  backend issues a real 302 redirect to Google's consent screen — see
  `backend/app/api/accounts.py`.
- Search matches partial filenames against the backend's Postgres
  full-text search (`GET /files/search?q=`).
