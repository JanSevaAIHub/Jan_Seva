# Supabase setup for the existing JanSeva backend

No credentials belong in chat, source control or frontend server-key variables. The dashboard integration must be installed/connected before it can access your account; an existing browser login alone does not give this coding session access. Authenticate and complete MFA yourself. No connected project has been selected or modified yet.

## 1. Choose the actual project

In your authenticated Supabase dashboard, open the existing JanSeva project. If none exists, create one in your chosen organization and region, set its database password privately and wait for the database to become available. Do not reset an existing database password merely to follow this guide.

Collect these values from that same project:

| Local variable | Dashboard value | Purpose |
|---|---|---|
| `SUPABASE_URL` | Project API URL, such as `https://<project-ref>.supabase.co` | Trusted Auth issuer/JWKS and admin API base |
| `DATABASE_URL` | Connect > Session pooler > PostgreSQL URI, port 5432, with the **database** password | SQLAlchemy/psycopg connection, migrations and application storage |
| `SUPABASE_SECRET_KEY` | API Keys > a backend secret key beginning `sb_secret_` | Explicit demo Auth provisioning/lookup only |
| `VITE_SUPABASE_URL` | Same project API URL | Browser Auth client |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable key beginning `sb_publishable_` | Browser Auth client; never use the backend secret here |

The database password is separate from your dashboard login and API keys. Copy the exact dashboard pooler host and `postgres.<project-ref>` username; do not guess the region/host. A direct database URI can be used when the network supports it. The Session pooler is the IPv4 alternative for this persistent backend. The private helper deliberately rejects transaction-pooler port 6543 because the current psycopg setup does not disable prepared statements for that mode.

`SUPABASE_SERVICE_ROLE_KEY` remains a legacy compatibility alias. Prefer `SUPABASE_SECRET_KEY`; when both are set, the preferred value wins. Current opaque secret keys use the `apikey` header only. The existing legacy service-role JWT path retains its Bearer header. These admin keys do not replace a citizen/officer's user JWT and are not needed by the normal JWT verifier.

Official references: [database connections](https://supabase.com/docs/guides/database/connecting-to-postgres), [current API keys](https://supabase.com/docs/guides/getting-started/api-keys), [Auth signing keys](https://supabase.com/docs/guides/auth/signing-keys).

## 2. Enter credentials privately

Ignored `services/api/.env` and `apps/web/.env` files have been created from examples without real values. Existing files are preserved. From the repository root in your **own interactive terminal**:

```powershell
$env:PYTHONPATH = 'services/api'
.\.venv\Scripts\python.exe -m app.scripts.configure_supabase
```

The helper prompts for the project URL, the copied Session-pooler URI template (leave `[YOUR-PASSWORD]`), database password, backend secret and optional browser publishable key. Credential prompts do not echo. The separate password is URL-encoded, including reserved characters, and TLS is enabled. It refuses nonignored env paths, preserves unrelated configuration and never writes the database URL or backend key to the frontend. It does not run remote migrations or create users. Do not pass credentials in command arguments. Alternatively edit the two ignored env files privately.

Set the API/frontend origins to match local development:

```dotenv
# backend (not a real credential)
CORS_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
# frontend
VITE_API_BASE_URL=http://127.0.0.1:8000
```

In Auth, verify email/password login is available and that the active signing key is ES256 or RS256. JanSeva deliberately rejects HS256. For an old project, follow the official signing-key migration guidance; do not revoke existing keys or rotate production secrets blindly. A public JWKS check can confirm asymmetric keys are advertised, but only an actual login verifies which algorithm signs new sessions.

## 3. Apply the existing migrations

Once the private configuration is saved, these commands use the normal backend settings. Run against the intended development/demo project:

```powershell
$env:PYTHONPATH = 'services/api'
.\.venv\Scripts\python.exe -m app.scripts.migrate
.\.venv\Scripts\python.exe -m app.scripts.migrate_schemes
.\.venv\Scripts\python.exe -m app.scripts.check_db
```

The core command applies 001 plus additive repair 003 in one transaction, then validates the five tables, keys/constraints/indexes and minimum string widths. Repair 003 widens the original complaint category column for `streetlight`; it does not narrow a wider installation. The vector command applies 002 separately and respects the installed pgvector extension namespace. Core migration runs before vector migration. Neither command drops tables or replaces existing records. Supabase owns `auth.users`; JanSeva does not create it.

Use a database connection with schema/extension privileges for migrations and a trusted server DB connection for the API. RLS is enabled and browser table privileges are revoked by the migration; React uses FastAPI for application data, not direct table writes. A read-only database role cannot apply migrations or serve complaint writes.

## 4. Prepare the two demo users and ten synthetic complaints

Privately enter `DEMO_CITIZEN_EMAIL`, `DEMO_CITIZEN_PASSWORD`, `DEMO_OFFICER_EMAIL` and `DEMO_OFFICER_PASSWORD` in backend `.env`. Choose actual emails and strong passwords; none are provided in this repository. Passwords are required only for new identities. Then:

```powershell
.\.venv\Scripts\python.exe -m app.scripts.setup_demo
# Copy its two real provider UUIDs into backend .env as:
# DEMO_CITIZEN_USER_ID and DEMO_OFFICER_USER_ID
.\.venv\Scripts\python.exe -m app.scripts.seed_demo
.\.venv\Scripts\python.exe -m app.scripts.seed_demo
```

Setup creates/reuses actual Auth identities and provisions Arjun Mishra/citizen and R. Singh/officer database profiles. It does not reset existing passwords or overwrite conflicting roles/names. Seed reruns preserve modified records and should report ten total synthetic fixtures, not twenty. Only the explicit citizen/officer UUID pair assigns new demo complaints; it never grants roles from React state. The UUIDs are identifiers, not passwords. Restart the API after changing the assignment pair.

Eight curated scheme source records are already prepared locally and pass validation. Actual vector ingestion additionally needs server `OPENAI_API_KEY`, `EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS` and `LLM_MODEL`; do not invent these to make Supabase checks pass. See the existing README/Phase 3 instructions for ingestion twice and live evaluation. No real scheme row/vector insertion is claimed before those commands succeed.

## 5. Verification and current blockers

Prepared locally: migrations 001/003/002; ten-repeatable-complaint seed; eight reviewed scheme records; ignored env placeholders; current-key-compatible admin headers and private setup prompts. The header, password-encoding and server/browser secret-separation contracts are tested using generated fixtures, not real secrets.

The latest actual connectivity command reports `Database check failed: DATABASE_URL is not configured.` No dashboard integration is confirmed connected, and no live database migration, user provisioning or seed has run successfully yet. Save private configuration or connect the integration and select the intended project before remote execution. No fake success, project, password, token or database URL substitutes for those missing inputs.

After connectivity/migrations pass, verify actual Supabase login, assigned complaint submission/review/history across independent sessions, and refresh persistence. Restart frontend/backend after configuration changes. Model-backed RAG remains a separate provider gate even after Supabase is connected.

Actual follow-up verification: `python -m pytest -q` returned **114 passed, 1 skipped, 1 warning in 25.33s**. The five new setup tests passed; the existing seed/profile tests also passed (22 focused setup/model cases total). The normal connectivity command still failed closed for missing DATABASE_URL. These results do not claim a successful live connection.
