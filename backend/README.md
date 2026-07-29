# Orbit Drive — Backend (Phase 1: Auth + Account Connection)

FastAPI backend implementing Phase 1 of `mvp.md`: signup/login, and connecting
multiple Google accounts via OAuth (`drive.file` scope only) with encrypted
token storage. Upload/placement/browse/search are Phase 2+ and not built yet
(see `app/core`, `app/connectors`, `app/jobs` — present as empty packages for
the structure defined in `mvp.md` §10b, implemented in later phases).

## Stack

FastAPI, SQLAlchemy 2.0 (async, `asyncpg`), Alembic, PostgreSQL, JWT sessions,
Fernet-encrypted OAuth tokens. No Redis — see `mvp.md` §8.

## Project layout

```
app/
├── main.py          FastAPI app + router registration
├── config.py         Settings (env vars)
├── api/               routers: auth.py, accounts.py
├── auth/               JWT, password hashing, Fernet token encryption, Google OAuth handshake
├── db/                 async session + declarative Base
├── models/             SQLAlchemy models (mvp.md §6 schema)
├── core/                Storage Intelligence Engine — empty, Phase 2
├── connectors/           Connector Framework — empty, Phase 2
└── jobs/                  background poller — empty, Phase 2
alembic/                  migrations (hand-written initial revision matching §6)
```

## 1. Google Cloud OAuth setup (do this first — see `mvp.md` §5)

1. Create a project in Google Cloud Console (skip billing/no card needed).
2. Enable the **Google Drive API**.
3. Configure the OAuth consent screen: External, **Testing** mode, scope
   `https://www.googleapis.com/auth/drive.file` only.
4. Create an OAuth 2.0 Client ID (Web application). Add redirect URI:
   `http://localhost:8000/accounts/google/callback`
5. Copy the Client ID and Client Secret into `.env` (next step).

## 2. Local setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Fill in DATABASE_URL, JWT_SECRET, TOKEN_ENCRYPTION_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET.

# Generate a Fernet key for TOKEN_ENCRYPTION_KEY:
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

`DATABASE_URL` points at a Postgres instance — a [Supabase](https://supabase.com)
free-tier project (per `mvp.md` §10), or any local Postgres. Use the
`postgresql+asyncpg://...` form (the app connects with asyncpg at runtime;
Alembic migrations swap the driver to psycopg2 automatically).

## 3. Apply the database schema

```bash
alembic upgrade head
```

This creates the `pgcrypto` extension and all tables from `mvp.md` §6 (users,
google_accounts, folders, file_objects, files, jobs, audit_logs).

## 4. Run the API

```bash
uvicorn app.main:app --reload
```

Visit `http://localhost:8000/docs` for interactive API docs.

## 5. Test Phase 1 end-to-end

```bash
# Sign up, capture the access token
curl -X POST http://localhost:8000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com", "password": "a-real-password"}'
# -> {"access_token": "...", "token_type": "bearer"}
```

Connect a Google account (real browser flow, not curl — it needs the Google
consent screen):

```
http://localhost:8000/accounts/google/connect?access_token=<paste the JWT here>
```

This redirects to Google's consent screen, then back to
`accounts/google/callback`, which stores the encrypted tokens and redirects
you to `FRONTEND_URL/accounts?connected=1` (fine to 404 there — no frontend
yet in Phase 1).

Confirm it's connected:

```bash
curl http://localhost:8000/accounts \
  -H "Authorization: Bearer <paste the JWT here>"
```

Should list the connected account with its Drive email and quota. Repeat the
connect flow with a second Google account (using a different test-user
Google login) to confirm multiple accounts pool correctly per `mvp.md` §2.

## Not built yet (Phase 2+)

Upload, placement algorithm, dedup, download, delete, search, storage
summary, background jobs (`quota_refresh` / `health_check` / `retry_upload`),
and the frontend. See `mvp.md` §11 for the phase order.
