# Phase 2: real complaint management

Scope: existing React/Vite interface and FastAPI app. No complaint AI, semantic duplicate detection, government integrations or new database schema. Phase 1 migration `001_initial.sql` remains the database prerequisite.

## Behavior and authorization

| Route | Behavior |
|---|---|
| `POST /api/complaints` | Citizen only; validates title/description/category/locality, derives owner from verified identity, saves UUID/timestamps/LOCAL_SUBMITTED and initial audit event in one transaction; returns 201 with the saved detail |
| `GET /api/complaints?status=UNDER_REVIEW` | Optional status filter; citizen sees owned tickets, officer sees assigned tickets; returns detail records including events to support existing list timelines without per-ticket requests |
| `GET /api/complaints/{uuid}` | Same scope as list; returns 404 for inaccessible tickets and includes the real audit history |
| `PATCH /api/officer/complaints/{uuid}` | Officer only and assigned ticket only; advances exactly one internal step; compare-and-set checks status and assignment, and commits the update and audit event together |
| `PATCH /api/complaints/{uuid}/official-ref` | Citizen owner only; persists an explicitly user-provided reference, adds an audit note and leaves internal status unchanged |

Status progression is `LOCAL_SUBMITTED -> UNDER_REVIEW -> IN_PROGRESS -> RESOLVED`. Skipped, repeated, backward and terminal transitions return 409 with `INVALID_STATUS_TRANSITION`; statuses outside the four-step request enum return 422. An optional officer note is omitted when empty; the backend records a factual default note. Unknown/inaccessible tickets return 404; missing/invalid credentials return 401; wrong role returns 403. Database failures retain the sanitized Phase 1 responses.

Government filing starts at `NOT_FILED`. Only a citizen-provided reference changes the derived filing indicator to `USER_REPORTED_FILED`. It is explicitly unverified. Internal `RESOLVED` never establishes government filing or resolution. The package modal copies a manual filing draft and makes no claim that photos or location metadata were verified.

The frontend uses Supabase's session persistence and automatic token refresh. It attaches the session access token to API requests; FastAPI independently verifies signatures/claims and resolves roles from database profiles. The profile menu opens a credential form for the chosen account; it cannot mutate authorization. Passwords are entered at login and are never built into the bundle. Sign-out/account changes clear the prior account's records and detail/package modals. Supabase session storage retains tokens so reload can restore the login; complaint records are fetched anew from the API.

Complaint submission waits for 201 before closing the review modal. A failed request retains the draft and shows an error for retry. My Requests, tracking and officer detail use returned database IDs, timestamps and events. Officer updates refresh both queue and detail. Queue counts, category distribution and trend data come from authorized returned records and selected filters. Unimplemented AI/routing/SLA/photo/map features are labeled as unavailable or previews.

## Configuration and explicit demo assignment

Backend `services/api/.env`:

```dotenv
DATABASE_URL=<PostgreSQL connection from the same Supabase project>
SUPABASE_URL=<trusted HTTPS Supabase project URL>
CORS_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
DEMO_CITIZEN_USER_ID=<Arjun's actual Supabase Auth UUID>
DEMO_OFFICER_USER_ID=<R. Singh's actual Supabase Auth UUID>
```

The last two values are optional, explicit server configuration for this demo. If both are absent, new complaints remain unassigned. If configured, **only that citizen's new complaints** are assigned to that officer; the officer must have a database-controlled officer profile. Malformed/partial configuration or a missing/non-officer assignee fails closed with 503. Other citizens receive no assignment or expanded visibility. Configuration never grants a role and does not retroactively reassign existing complaints. Changing it requires a backend restart.

Use the Phase 1 demo setup with actual environment credentials to provision both identities/profiles. It now prints their provider-issued IDs as `DEMO_CITIZEN_USER_ID` and `DEMO_OFFICER_USER_ID` for an operator to copy into the backend configuration. No password is printed. This avoids inventing identities or trusting a client-provided assignee.

Frontend `apps/web/.env`:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_SUPABASE_URL=<same trusted Supabase project URL>
VITE_SUPABASE_PUBLISHABLE_KEY=<public project key>
```

Do not put server database/admin keys or demo passwords in Vite variables. Restart Vite after changing configuration. Provisioning remains an explicit operator action; normal app startup never seeds or creates accounts. As in Phase 1, Supabase asymmetric ES256/RS256 signing keys are required.

```powershell
# From repository root, after filling the backend .env and installing requirements:
$env:PYTHONPATH = 'services/api'
.\.venv\Scripts\python.exe -m app.scripts.migrate
.\.venv\Scripts\python.exe -m app.scripts.check_db
.\.venv\Scripts\python.exe -m app.scripts.setup_demo
# Copy the printed IDs into services/api/.env, then start/restart the backend:
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir services/api --reload

# In a second shell:
Set-Location apps/web
npm.cmd ci
npm.cmd run dev
```

Demo journey: use Citizen Sign In for Arjun's provisioned credentials, submit and confirm a complaint, retain its saved UUID and open it under My Requests. Use Officer Sign In for R. Singh's credentials, open the assigned ticket under Officer demo, and advance its internal status. Sign in as Arjun again and open the same ticket's tracking/audit history. Refresh to reload the stored complaint. The existing ten Phase 1 synthetic seed complaints are optional and are not required for submitting a new complaint.

## Verification commands and limits

```powershell
# Repository root:
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m compileall -q services/api/app
.\.venv\Scripts\python.exe -m pip check

# apps/web:
npm.cmd run build
npx.cmd playwright install chromium  # once per Playwright browser version
npm.cmd run test:e2e
```

The browser harness starts a real Vite server and the real FastAPI routes on isolated ports 5174/8765. Its test-only entrypoint uses a temporary SQLite file and a local fake Supabase Auth provider with real ES256 signatures/JWKS. Test identities have provider-double IDs and the test password is randomly generated for the run. This harness is not imported by `app.main`, cannot enable a deployed auth bypass, and must never be used as the deployment entrypoint. Test DB session dependency overrides exist only in tests. Both servers are managed by Playwright and use no live database or account.

Backend route tests use fresh SQLAlchemy sessions for every HTTP request, including a separate client for reload checks. They cover all ten requested cases plus status filtering, owner/assignee injection, wrong officer assignment, terminal transitions, optional notes, atomic rollback on audit failure and user-reported filing references. Browser tests exercise the UI account flow, failed POST/retry, saved UUID in My Requests, officer queue/update/audit, returning citizen, browser reload, and guest/citizen officer guards.

Live Supabase/PostgreSQL verification is blocked until the project URL/keys, database connection, demo account credentials and assignment IDs are configured. Local browser/provider-double verification must not be described as a real Supabase login or live PostgreSQL test. No existing database migration has been claimed as executed without that configuration.

## Actual results (2026-11-07, Asia/Calcutta)

- Backend: **74 passed, 1 warning in 11.30s**. The warning is the existing Starlette/httpx TestClient deprecation. The twelve Phase 2 route cases (including parametrized cases) passed; the retained Phase 1 security/model/health suite also passed.
- Browser: **2 passed in 27.5s**, Chromium, after final session/refresh changes. The full journey uses Arjun Mishra and R. Singh profiles in isolated test infrastructure: login, failed submission with retained review, retry and saved UUID, My Requests/detail, reload, officer login/assigned queue, UNDER_REVIEW update with note/audit, citizen login, updated history and another reload. A separate test verifies guest/citizen UI cannot expose the officer queue. No browser runtime errors occurred in the journey.
- Frontend: production build passed both with absent Auth configuration and with non-secret placeholder configuration so the actual Supabase client was included. The configured bundle is 612.54 kB (168.25 kB gzip) and triggers Vite's 500 kB chunk advisory; this does not fail the build. No unrelated build restructuring was added.
- Python compile check and `pip check`: passed; no broken requirements.
- Production-entrypoint Uvicorn smoke: startup and `/api/health` returned 200; anonymous complaint GET/POST and officer PATCH returned 401. OpenAPI contained the expected routes and no test-provider endpoints. The smoke server was stopped.
- Live database check: **blocked/failed closed**, `DATABASE_URL is not configured.` No live migration, real provider account login, PostgreSQL persistence or actual-account browser journey is reported as passing.

Initial browser attempts exposed a missing matching browser installation and overly narrow accessible-name matching in the login helper. Installing the required Chromium and naming the account actions explicitly resolved these; the final browser run passed. Test reports/traces and build output are ignored local artifacts.

## Changed files

- Backend under `services/api/app/`: `config.py`, `main.py`, `models.py`, `schemas.py`, `scripts/setup_demo.py`, `routers/complaints.py`, `routers/officer.py`.
- Frontend under `apps/web/src/`: `context/AppContext.jsx`, `lib/api.js`, `lib/supabase.js`, `lib/complaints.js`, `pages/ComplaintForm.jsx`, `pages/MyRequests.jsx`, `pages/TrackStatus.jsx`, `pages/Officer.jsx`, `components/layout/AppShell.jsx`, `components/layout/Topbar.jsx`, `components/common/LoginModal.jsx`, `components/complaints/ComplaintFeedback.jsx`, `components/complaints/ComplaintReviewModal.jsx`, `components/complaints/ComplaintPackageModal.jsx`, `components/officer/TicketDetailModal.jsx`.
- Tests/tooling: `services/api/tests/test_complaints.py`, `services/api/tests/e2e_server.py`, `apps/web/tests/complaints.spec.js`, `apps/web/playwright.config.js`, `apps/web/package.json`, `apps/web/package-lock.json`.
- Configuration/documentation: `.env.example`, `.gitignore`, `README.md`, `docs/api-contract.md`, this report. No migration or CSS file changed. The pre-existing untracked Phase 0 report is preserved separately.

References: [Supabase password sign-in](https://supabase.com/docs/reference/javascript/auth-signinwithpassword), [Supabase auth state changes](https://supabase.com/docs/reference/javascript/auth-onauthstatechange), [SQLAlchemy conditional updates](https://docs.sqlalchemy.org/en/20/orm/queryguide/dml.html#orm-update-and-delete-with-custom-where-criteria).
