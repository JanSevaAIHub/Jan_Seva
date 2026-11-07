# Phase 1: database and authentication foundation

Implemented on `feature/phase-1-database-auth` from `a382a665c9b9ba34d5deb7c48e37ff6a6521550c`. Verification date: 2026-11-07 (Asia/Calcutta). The original FastAPI app is retained. No frontend files or mock workflows were changed. The pre-existing, untracked Phase 0 `docs/implementation-status.md` remains untouched and is not part of the Phase 1 commit.

## What is implemented

| Area | Owner | Status | Evidence / next action |
|---|---|---|---|
| PostgreSQL engine and request session dependency | B | PARTIAL | `app/db.py`: environment URL, psycopg, pre-ping, timeout, remote TLS default, rollback/close and sanitized 409/503 errors. Isolated/error tests pass; real connection requires `DATABASE_URL` |
| Five models, relationships, constraints and indexes | B | PARTIAL | `app/models.py`; SQLite persistence, orphan rejection, role/status checks and index tests pass. PostgreSQL/provider FK and JSONB checks still require live migration |
| Versioned non-destructive migration | B | BLOCKED | `migrations/001_initial.sql`, `app/scripts/migrate.py`; no live PostgreSQL/Supabase configuration, so SQL execution/rerun is unverified |
| Signed JWT verification and protected profile | B | VERIFIED | `app/auth.py`, `routers/profiles.py`; actual local JWKS HTTP fetch, ES256/RS256 signatures, claim failures, malformed/expired/unsigned/forged tokens and `/api/me` tested. Real Supabase login remains unverified |
| Database-controlled roles and complaint access scopes | B | VERIFIED | `require_citizen`, `require_officer`, `visible_complaints`, `accessible_complaint`, `assigned_officer_complaint`; isolated tests reject cross-user access, wrong role and unassigned officers, including synthetic complaints |
| Explicit demo account/profile setup | B | PARTIAL | `app/scripts/setup_demo.py`; mocked Admin API supplies IDs, rerun reuses identities, profile conflict refuses overwrite. Real provider creation is blocked by configuration |
| Exactly ten synthetic complaints and audit history | B | PARTIAL | `data/seed_complaints.json`, `app/scripts/seed_demo.py`; real seed function run twice against isolated SQLite: `(10 inserted, 10 total)` then `(0 inserted, 10 total)`, IDs/event count unchanged. Live script remains blocked |
| Schemas and retained health endpoint | B | VERIFIED | `app/schemas.py`, existing health test and live HTTP smoke; injected owner/role/status fields and invalid input rejected |

These statuses describe only Phase 1 foundation behavior, not a completed complaint workflow. Current production routes are `GET /api/health` and protected `GET /api/me`. Complaint create/list/detail, officer queue/update, official-reference endpoints, status-transition logic, browser login wiring, retrieval and AI remain Phase 2 or later. Role/access dependencies are ready for those routes; authorization test probes are defined only inside tests.

## Required environment

Copy root `.env.example` to `services/api/.env` and configure actual values locally. The backend loads that file with process environment taking precedence. No credentials or default database connection are embedded in code. Never place database/admin/model secrets in `apps/web/.env`.

| Variable | Used for |
|---|---|
| `DATABASE_URL` | Required by migration, DB check, profile requests, demo profile/seed writes. Use a PostgreSQL connection URL from the same Supabase project as Auth. Direct or session-pooler connection is recommended for operator DDL. Standard `postgresql://` URLs are normalized to psycopg; remote URLs default to `sslmode=require` unless explicitly configured |
| `SUPABASE_URL` | Required for JWT verification and demo Admin API calls. Trusted HTTPS project origin; HTTP accepted only for loopback local Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Required only by explicit demo account creation/lookup scripts, never by normal request JWT validation |
| `DEMO_CITIZEN_EMAIL`, `DEMO_OFFICER_EMAIL` | Required only for demo setup/seed; must be distinct configured addresses |
| `DEMO_CITIZEN_PASSWORD`, `DEMO_OFFICER_PASSWORD` | Required only when the corresponding Auth identity does not already exist. Read from environment; no generated/hardcoded password, reset or password output |
| `EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS` | Required before storing any non-null embedding. Supply actual model name/output dimensions; no model or dimension is assumed |
| `CORS_ORIGINS` | Optional existing comma-separated allowlist, defaulting to the two local Vite origins |

`OPENAI_API_KEY` and `LLM_MODEL` are not used by this foundation. No frontend Supabase values are consumed yet. Health remains available with no database/Auth credentials; a protected request cannot fall back to a demo identity.

## Files changed

- Configuration/docs: `.env.example`, `README.md`, `docs/api-contract.md`, `docs/phase-1-setup.md`.
- Existing backend files: `services/api/requirements.txt`, `services/api/app/config.py`, `services/api/app/main.py`, `services/api/app/schemas.py`.
- New backend foundation: `services/api/app/db.py`, `services/api/app/models.py`, `services/api/app/auth.py`, `services/api/app/routers/profiles.py`.
- New migration and data: `services/api/migrations/001_initial.sql`, `data/seed_complaints.json`.
- New operator scripts: `services/api/app/scripts/__init__.py`, `services/api/app/scripts/migrate.py`, `services/api/app/scripts/check_db.py`, `services/api/app/scripts/setup_demo.py`, `services/api/app/scripts/seed_demo.py`.
- New tests: `services/api/tests/conftest.py`, `services/api/tests/test_auth.py`, `services/api/tests/test_authorization.py`, `services/api/tests/test_db.py`, `services/api/tests/test_models_and_seed.py`.

## Install and operator commands

From repository root in PowerShell (activation is unnecessary, including on hosts that block `.ps1` scripts):

```powershell
# If .venv does not exist:
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r services/api/requirements.txt

$env:PYTHONPATH = 'services/api'
.\.venv\Scripts\python.exe -m app.scripts.migrate
.\.venv\Scripts\python.exe -m app.scripts.check_db
.\.venv\Scripts\python.exe -m app.scripts.setup_demo
.\.venv\Scripts\python.exe -m app.scripts.seed_demo
.\.venv\Scripts\python.exe -m app.scripts.seed_demo

.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir services/api --reload
```

On other shells use the equivalent venv interpreter and `PYTHONPATH=services/api`. `.env` loading is independent of the working directory. The app does not migrate, create identities or seed at startup.

The database credential needs permission to create the five public tables/indexes/function/trigger, reference Supabase-managed `auth.users`, and configure table privileges/RLS. The request service uses a trusted server DB account with access to these tables; browser roles get no direct access. Do not use an anonymous/publishable key as a database credential. `/api/me` returns 401 without a bearer user access token, 403 if its verified user has no provisioned profile, or 503 if Auth/DB configuration or service availability prevents verification.

For a live smoke test after setup, obtain a normal session access token through Supabase Auth using the configured demo account, then call `/api/me` with `Authorization: Bearer <access token>`. No local token-issuing, password-login, unsigned-token, custom-role header or demo-bypass endpoint was added. Do not paste tokens into source or documentation.

## Migration and storage design

`services/api/migrations/001_initial.sql` is applied atomically by `app.scripts.migrate` with a PostgreSQL advisory lock. It uses `CREATE TABLE/INDEX IF NOT EXISTS`; a rerun does not delete/reset records. The runner verifies columns/nullability, primary keys, foreign keys, named checks, indexes and unique seed key before committing. Incompatible existing tables cause failure/rollback and require manual review; the script does not silently rebuild tables. No migration framework is introduced.

- `profiles.user_id` has a PostgreSQL FK to Supabase `auth.users.id`. There is no generated user-ID default. `auth.users` appears only as externally managed metadata for FK resolution and is excluded from application table creation.
- Complaint owner/assignee and event actor reference `profiles`; events reference complaints; chunks reference schemes. Required owner/assignee/status/event/chunk indexes are present. Complaint IDs and event IDs are normal generated resource UUIDs, distinct from provider-owned user IDs.
- Timestamps use PostgreSQL `TIMESTAMPTZ`. The migration installs an update trigger for complaint `updated_at`; ORM writes also have an update default. Internal complaint status and `official_ref` remain independent. No government submission or official acknowledgment is inferred.
- All five public tables have RLS enabled and direct table grants removed from `PUBLIC`, `anon` and `authenticated`. No client-facing role/profile write policy exists. API role resolution reads the server-controlled database record, and no client can self-promote through these routes.
- Embeddings use nullable JSONB numeric arrays, tagged with model and dimensions, rather than installing pgvector or guessing a 1,536-dimensional model. ORM validation requires configured dimensions and finite numeric values; PostgreSQL checks enforce array shape/dimension metadata. Model tests use explicitly labeled, three-dimensional test vectors, not a production model default. Vector search/indexing needs a later migration if pgvector is selected.
- The seed marker (`seed_key`, unique) and `is_synthetic` prevent repeated inserts and identify demonstration records. New rows have no official reference. Existing matching seed rows are preserved, including subsequent status changes; identity/marker conflicts fail rather than reassigning data.

Demo setup uses the trusted Supabase Admin API to locate configured emails and create missing identities. Only provider-returned IDs are linked to profiles. Existing passwords, profile names and roles are never overwritten; conflicts require review. Auth creation and database writes cannot form a distributed transaction: if provisioning fails after an identity is created, rerun after correcting the cause; no compensating deletion occurs. Existing Auth identities do not need password variables for a rerun. Seed lookup never creates missing identities.

## Authentication design

The verifier derives JWKS only from the trusted server `SUPABASE_URL`, at `/auth/v1/.well-known/jwks.json`; it never accepts a key URL or issuer supplied by the token. Only ES256 and RS256 are allowed, with matching JWK algorithm and `kid`. PyJWT verifies the signature, exact project issuer, `authenticated` audience, required `sub/iss/aud/exp/iat/role` claims and applicable time claims such as `nbf`. User and optional session IDs must be UUIDs. Anonymous/service-role tokens cannot act as citizens/officers. Application roles are read from `profiles`, not JWT user metadata or frontend state.

Legacy HS256 projects must migrate to asymmetric Supabase signing keys before using this verifier; no shared-secret or disabled-verification fallback is provided. Public keys are cached for five minutes; unknown `kid` refreshes through PyJWT. Invalid tokens return 401 with `WWW-Authenticate: Bearer`; unavailable JWKS returns sanitized 503. Offline signature verification does not provide instantaneous session-revocation checks; accepted sessions remain subject to token expiration and the current profile/role check.

Officer access is assignment-based, including seeded synthetic records; synthetic status alone grants no access. Citizen creation DTOs cannot accept owner, assignee, status, role or official-reference injection. Future routes must obtain owner from `require_citizen`, scope list/detail through `visible_complaints`/`accessible_complaint`, and guard officer changes/audit access with `assigned_officer_complaint`. Actual write endpoints and allowed transitions are intentionally not part of Phase 1.

Primary references used: [Supabase JWT verification](https://supabase.com/docs/guides/auth/jwts), [Supabase Admin API](https://github.com/supabase/auth), [PyJWT decode/JWKS API](https://pyjwt.readthedocs.io/en/stable/api.html), and [SQLAlchemy session lifecycle](https://docs.sqlalchemy.org/en/20/orm/session_basics.html).

## Verification and remaining blockers

Commands actually executed locally:

- Backend requirements installation and `python -m pip check`: passed, no broken requirements. Only necessary additions: SQLAlchemy, psycopg binary driver and PyJWT crypto support. Existing Starlette/httpx deprecation remains; no unrelated dependency upgrade was made.
- `python -m compileall -q services/api/app`: passed.
- `python -m pytest -q` with the venv interpreter: **62 passed, 1 warning in 7.87s**. Includes the unchanged health test; genuine EC/RSA signatures against a local HTTP JWKS server; missing/malformed/forged/unsigned/expired/wrong-issuer/wrong-audience/missing-claim tests; non-finite timestamp rejection; anonymous/service-role rejection; role/ownership/assignment checks; data persistence, defaults, relationships, required indexes and foreign-key checks; embedding validation; provider-mocked demo provisioning and seed twice; sanitized DB configuration/query failures, including invalid connection ports.
- Live Uvicorn startup: passed with no service configuration. `/api/health` returned 200 and `{"status":"ok"}`; `/api/me` without token returned 401; `/docs` returned 200; `/api/complaints` returned 404; OpenAPI contained exactly health and profile business routes. The audit server was stopped afterward.
- Live `app.scripts.migrate`: failed closed, `DATABASE_URL is not configured.`
- Live `app.scripts.check_db`: failed closed for the same reason.
- Live `app.scripts.setup_demo`: failed closed, `Set a valid DEMO_CITIZEN_EMAIL.`
- Live `app.scripts.seed_demo`, attempted twice: failed closed, `Set a valid DEMO_CITIZEN_EMAIL.`

SQLite tests create only the five core test tables via SQLAlchemy. They do **not** execute the PostgreSQL SQL file, Supabase `auth.users` FK, PostgreSQL trigger/JSONB constraints or RLS/grant statements. The local JWKS server and Admin API test double are isolated test infrastructure, not real Supabase identities or a runtime auth bypass. No mocked check is presented as a live provider result.

Remaining live blockers: no `DATABASE_URL`, trusted Supabase project/signing keys, admin key or demo emails/passwords. Thus migration SQL execution/rerun, real database connection, provider account creation/login and live seed idempotence are not verified. Model/dimension configuration is needed before storing embeddings. No fake credentials or user UUIDs were inserted into a live service. Phase 1 implementation stops here; Phase 2 has not started.

## Files changed

- Configuration and wiring: `.env.example`, `README.md`, `docs/api-contract.md`, `services/api/requirements.txt`, `services/api/app/config.py`, `services/api/app/main.py`.
- Foundation under `services/api/app/`: `db.py`, `models.py`, `auth.py`, `schemas.py`, `routers/profiles.py`.
- Operator commands under `services/api/app/scripts/`: `__init__.py`, `migrate.py`, `check_db.py`, `setup_demo.py`, `seed_demo.py`.
- Migration and fixtures: `services/api/migrations/001_initial.sql`, `data/seed_complaints.json`.
- Verification under `services/api/tests/`: `conftest.py`, `test_auth.py`, `test_authorization.py`, `test_db.py`, `test_models_and_seed.py`.
- Setup and verification report: `docs/phase-1-setup.md`.
