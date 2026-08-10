# Orbit Drive

**Every Google Drive you own. One orbit.**

Live at [orbitdrive.space](https://orbitdrive.space) — built by
[Orbit AI Labs](https://orbitailabs.in).

Orbit Drive is a storage-virtualization platform that pools multiple Google
Drive accounts under a single login. Instead of juggling several Gmail
accounts to get more free storage, you connect all of them once and Orbit
Drive presents them as one unified drive — deciding where each upload
actually lives, deduplicating identical files, and letting you browse,
search, and manage everything from a single dashboard.

## Features

- **Unified drive, every account** — connect as many Google accounts as you
  own; browse them as one virtual filesystem, not a pile of separate drives.
- **Smart placement engine** — every upload is automatically routed to
  whichever pooled account actually has room.
- **Instant deduplication** — files are fingerprinted by content (SHA-256),
  not name. Uploading the same file twice links to the existing copy instead
  of burning storage twice.
- **Search across every account, at once** — one search bar, full-text,
  with type and account filters.
- **Real deletion** — deleting a file (or a whole folder tree) removes it
  from Google Drive itself, not just from Orbit Drive's records.
- **Move, rename, and organize** — a virtual folder tree independent of how
  files are actually laid out across the underlying Drive accounts.
- **Per-account visibility** — see exactly what's stored on each connected
  account, disconnect an account safely, or reconnect one whose access has
  expired.
- **Bank-grade auth** — Google OAuth 2.0 with PKCE, `drive.file` scope only
  (Orbit Drive never sees files it didn't create), OAuth tokens encrypted at
  rest (Fernet), JWT session auth.
- **Built for reliability** — a background job layer retries failed uploads
  and refreshes account quota automatically.

## Security

Orbit Drive has no storage layer of its own — every file you upload lives
only in your own Google Drive. There's nothing of yours sitting on our
infrastructure to lose, leak, or subpoena.

- **Narrowest scope possible** — Google's `drive.file` scope only. Orbit
  Drive can see just the files it created; the rest of your Drive stays
  invisible to it, always.
- **No passwords, ever** — sign-in runs entirely through Google OAuth 2.0
  with PKCE. Orbit Drive never sees or stores your Google password.
- **Tokens encrypted at rest** — OAuth tokens are encrypted (Fernet), never
  stored or transmitted in plain text.
- **Disconnect and it's gone, instantly** — removing an account deletes its
  tokens from the database immediately, with no lingering access.

See the full [Privacy Policy](https://orbitdrive.space/privacy) for details.

## Tech stack

**Backend** — FastAPI, SQLAlchemy 2.0 (async), Alembic, PostgreSQL,
`python-jose` (JWT), `cryptography` (Fernet token encryption), the Google
API Python client for the Drive connector.

**Frontend** — Next.js 16 (App Router, Turbopack), TypeScript, and
[`motion`](https://motion.dev) for animation.

## Repository layout

```
orbit-drive/
  backend/
    app/
      api/          FastAPI routers (auth, accounts, files, folders, storage)
      core/          Storage Intelligence Engine: hashing, dedup, placement, pipeline, deletion
      connectors/    Storage provider abstraction (Google Drive today)
      jobs/          Background workers: quota refresh, retry queue, health checks
      auth/          OAuth (PKCE), JWT, token encryption
      models/        SQLAlchemy models
    alembic/         Database migrations
  frontend/
    src/
      app/           Routes: landing page, login, dashboard, accounts/storage
      components/    UI components (file browser, sidebar, modals, landing page sections)
      lib/           API client, auth helpers, formatting
```

## Getting started

### Prerequisites

- Python 3.11+ and Node.js 20+
- A PostgreSQL database (a free [Supabase](https://supabase.com) project works well)
- A Google Cloud project with OAuth 2.0 credentials (Web application type),
  with the Drive API enabled and the `drive.file` scope — see
  [`backend/.env.example`](backend/.env.example)

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, TOKEN_ENCRYPTION_KEY, Google OAuth credentials
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # points at the backend, defaults to http://localhost:8000
npm run dev
```

The app runs at `http://localhost:3000`; the API docs are auto-generated at
`http://localhost:8000/docs`.

## Roadmap

Google Drive is where Orbit Drive started, not where it stops:

- Support for more storage providers (Dropbox, OneDrive, iCloud)
- Automatic rebalancing of files across accounts as quotas shift
- A native Android app
- Shared/team orbits — pooled storage with permissions
- Storage insights — surfacing what's actually eating space
