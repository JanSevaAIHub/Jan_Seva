# JanSeva implementation status — Phase 0 audit

Audit date: 2026-11-06 (Asia/Calcutta). Scope: the existing local checkout; no Phase 1 implementation.

## Repository baseline and scope

- Repository: `https://github.com/JanSevaAIHub/Jan_Seva`; checkout: `C:\Users\HP\OneDrive\Desktop\final_project\Jan_Seva` (one directory below the initial workspace).
- Branch: `master`, tracking `origin/master`; HEAD: `a382a665c9b9ba34d5deb7c48e37ff6a6521550c`, `feat: complete interactive frontend matching design specs and add master task plan`.
- Before edits: `git status --short` was empty. No uncommitted changes or merge conflicts were present. No checkout, reset, pull, commit, push, or default-branch change was performed. Remote freshness was not checked; findings describe this commit.
- Read all eleven requested starting files, then inspected the remaining source, configuration, test inventory, and all 49 tracked paths. No applicable `AGENTS.md` was found in the checkout or ancestor directories checked.
- Only repository change: this tracker. Dependency installations and build output are ignored local artifacts: `.venv/`, `apps/web/node_modules/`, `apps/web/dist/`. Existing source, UI, requirements, and lockfile were preserved.

Actual state: a React/Vite interface populated with demonstration data and a FastAPI health service. There is no database, authentication, business API, model invocation, retrieval pipeline, or durable complaint workflow. The health endpoint indicates process availability, not readiness of those missing services.

## Complete source tree

The pre-audit tracked tree below excludes `.git` internals and generated dependencies. The root `data/` directory described in the README does not exist.

```text
Jan_Seva/
  .env.example
  .gitignore
  README.md
  task.md
  pytest.ini
  docs/
    api-contract.md
    architecture.md
    four-day-implementation-plan.md
  apps/web/
    .env.example
    .gitignore
    index.html
    package.json
    package-lock.json
    vite.config.js
    public/
      favicon.svg
      icons.svg
    src/
      App.jsx
      main.jsx
      index.css
      assets/
        hero-bg.png
        hero.png
        vite.svg
      context/AppContext.jsx
      data/mockData.js
      lib/api.js
      pages/
        Home.jsx
        SchemeSearch.jsx
        ComplaintForm.jsx
        MyRequests.jsx
        TrackStatus.jsx
        NotificationsPage.jsx
        Officer.jsx
      components/
        common/JanSevaLogo.jsx
        common/Toast.jsx
        layout/AppShell.jsx
        layout/Sidebar.jsx
        layout/Topbar.jsx
        schemes/SchemeDetailModal.jsx
        complaints/ComplaintReviewModal.jsx
        complaints/ComplaintPackageModal.jsx
        officer/TicketDetailModal.jsx
  services/api/
    requirements.txt
    app/
      __init__.py
      main.py
      config.py
      schemas.py
      routers/
        __init__.py
        health.py
    tests/test_health.py
```

## Feature tracker

Owners follow `docs/four-day-implementation-plan.md`: A owns frontend, AI, and scheme evidence; B owns API, database, auth, and officer persistence; Both owns integration/contracts. Resolve conflicting assignments in `task.md` before overlapping edits.

`VERIFIED` means the specific behavior stated in that row was exercised. `PARTIAL` means scaffold or simulation exists but the complete feature is unverified/incomplete. `NOT_STARTED` means the production implementation is absent. `BLOCKED` identifies an unavailable prerequisite, not an excuse to stop independent local work. Command evidence IDs refer to the verification section below.

| Feature | Priority | Owner | Status | Evidence: files and commands | Dependencies | Next action |
|---|---|---|---|---|---|---|
| Reproducible frontend install and production build | P0 | A | VERIFIED | `apps/web/package.json`, `package-lock.json`, `vite.config.js`; V1–V2 passed | Supported Node/npm | Retain JavaScript/JSX, lockfile, existing CSS and components |
| Seven initial route renders and dev-server shell responses | P0 | A | VERIFIED | `apps/web/src/App.jsx`, `main.jsx`, `components/layout/AppShell.jsx`; V3 passed for all seven routes | Existing React/Router/context | Add browser interaction and responsive checks during integration; this row verifies initial renders only |
| FastAPI health and API documentation | P0 | B | VERIFIED | `services/api/app/main.py`, `routers/health.py`, `schemas.py`, `tests/test_health.py`; V5–V6 passed | Existing backend requirements | Keep health separate from future dependency readiness |
| Default local CORS allowlist | P0 | B | VERIFIED | `services/api/app/config.py`, `main.py`; V6 accepted both local origins and rejected unrelated origin | `CORS_ORIGINS` defaults | Configure actual deployed origins and test environment overrides later |
| Shared validation/error contract | P0 | B | PARTIAL | `schemas.py` contains health/error models; `main.py` registers a custom 422 handler; V6 observed default `{"detail":"Not Found"}` for missing routes | Real request schemas/routes | Add business schemas and contract tests; align HTTP/auth/domain errors; 422 behavior was not exercised |
| Frontend API client and connection indicator | P0 | A | PARTIAL | `apps/web/src/lib/api.js`; V7 helper call passed; `rg -n 'getHealth' apps/web/src` finds only its definition | Healthy API, browser base URL | Wire a real caller/loading/error state into existing UI; Topbar currently has no health call or API badge |
| Supabase/PostgreSQL/pgvector setup | P0 | B | BLOCKED | No `db.py`, `models.py`, migrations, or root `data/`; V8 found no configured Supabase variables/files | Supabase project, URL/keys, schema/RLS/vector setup | Obtain actual configuration, define migrations and ownership rules; no credentials invented |
| JWT authentication, profile, citizen/officer authorization | P0 | Both | NOT_STARTED | `AppContext.jsx:switchUserRole` changes local persona; no `auth.py` or frontend auth client; V6 `/api/me` returned 404 | Auth provider, profile table, JWT verification configuration | Implement server-verified identity/role and ownership checks, then connect UI |
| Reviewed scheme corpus and source provenance | P0 | A | NOT_STARTED | Six fixture schemes in `src/data/mockData.js`; no `data/schemes.csv` or `data/scheme_sources/`; inventory V0 | Official source review and stored evidence | Curate the agreed Punjab/national corpus with actual excerpts/review dates; fixture URLs were not externally validated |
| Scheme list/search/bookmark UI and real scheme API | P0 | Both | PARTIAL | `SchemeSearch.jsx`, `SchemeDetailModal.jsx`, `AppContext.jsx`; local filtering/save IDs only; V6 `/api/schemes` returned 404 | Reviewed data, API schemas, database; auth for durable bookmarks | Implement `GET /api/schemes`; replace fixture reads through an adapter while retaining UI |
| Deterministic eligibility and document readiness | P0 | A | PARTIAL | `mockData.js` supplies status, match percentage, matched rules, document verification; `SchemeSearch.jsx` displays them | Reviewed machine-readable rules, minimal profile inputs | Implement/test `POTENTIAL`, `NOT_MATCHED`, `NEEDS_INFO`; remove unsupported probability/verification claims when wiring real results |
| Retrieval, embeddings and cited scheme Q&A | P1 | A | PARTIAL | `AppContext.jsx:sendChatMessage` uses keywords and a 1.1-second timer; no `services/api/app/ai/` or scheme router | Corpus, vector storage, model config/credentials | Add ingestion/retrieval with grounded citations and abstention; retain fixtures until replacement works |
| Confirmed complaint create/list/detail and durable drafts | P0 | Both | PARTIAL | `ComplaintForm.jsx`, `ComplaintReviewModal.jsx`, `MyRequests.jsx`, `AppContext.jsx:addComplaint`; V6 `/api/complaints` returned 404 | DB, authenticated ownership, request/response schemas | Implement protected CRUD, preserve confirmation step, persist/recover draft and replace random client IDs |
| Complaint category/department analysis and duplicate suggestions | P1 | Both | PARTIAL | `ComplaintForm.jsx:handleTitleChange` matches keywords; department mapping and similar-case banner hardcoded; no analysis endpoint | Complaint corpus, canonical enum mapping, analysis service | Add `/api/complaints/analyze`, editable suggestions, measured duplicate checks and fallback behavior |
| Citizen tracking and event timeline | P0 | Both | PARTIAL | `TrackStatus.jsx` looks up in-memory complaints; `AppContext.jsx` stores stepper objects | Complaint detail endpoint and persisted events | Load authorized detail/events by ID; handle not-found and refresh selected record after changes |
| Officer queue, status transitions, audit and routing | P0 | Both | PARTIAL | `Officer.jsx`, `TicketDetailModal.jsx`, `AppContext.jsx:updateComplaintStatus/handleRouteAction`; no officer router/auth/event table | Trusted officer role, complaints/events, allowed transitions | Implement protected queue/PATCH with actor/time/old/new event records; replace local writes |
| Official filing package and user-reported reference | P0 | Both | PARTIAL | `ComplaintPackageModal.jsx` formats clipboard text and mutates complaint object directly; no official-ref endpoint | Owned persistent complaint and validation | Persist user-provided reference/channel/time separately from internal status; verify clipboard errors and keep manual filing boundary |
| Home composer and unified intent/tool router | P1 | A | PARTIAL | `Home.jsx` redirects to local scheme chat; prompt chips use string checks; no `graph.py` or `routers/agent.py` | Working scheme/complaint tools and tested contracts | Implement `/api/agent/message` with citations/traces and separate confirmed writes |
| Dashboard KPIs, charts, SLA and insights | P1 | Both | PARTIAL | `mockData.js:OFFICER_KPIS`, `Officer.jsx:trendPoints/categories`; constants and toast-only actions | Database-backed aggregates and officer API | Derive metrics from labeled platform records; connect filters and verify totals |
| Notifications, language, voice, evidence upload and map controls | P2 | A | PARTIAL | `NotificationsPage.jsx`, `Topbar.jsx`, `Home.jsx`, `ComplaintForm.jsx`; fixtures, label changes, sample image and simulated pin | Separate services/storage/i18n/device APIs if retained | Defer optional capabilities per four-day plan; label incomplete controls accurately |
| Automated business/security/evaluation/browser tests | P0 | Both | PARTIAL | Only `services/api/tests/test_health.py`; V5 has one passing test; no frontend test/lint scripts | Implemented journeys and deterministic fixtures | Add ownership, role escalation, transitions, official-status separation, eligibility and integration tests as features land |
| Deployment and CI | P1 | Both | NOT_STARTED | No tracked `.github/`, hosting config, Docker files, deployment scripts, or `docs/demo-script.md` | Hosting accounts, runtime environment, passing journeys | Select deployment approach and add necessary configuration after core integration |

## Verification results and reproducible commands

Run from repository root unless stated otherwise. Audited tools: Node `v24.19.0`, npm `11.17.0`, Python `3.12.5`. Installed frontend versions include React/React DOM `19.3.1`, React Router DOM `7.18.5`, Vite `8.3.5`; Vite's lockfile engine is `^20.19.0 || >=22.12.0`.

| ID | Command/check | Result and limits |
|---|---|---|
| V0 | `git status --short`, `git branch -vv`, `git log -1`, `git remote -v`, `git ls-files`, `rg --files --hidden` excluding generated/git directories | Clean `master` baseline; 49 tracked files; six backend application Python files; one test file; no pre-existing virtualenv |
| V1 | In `apps/web`: `npm.cmd ci` | Passed: added 82 packages, audited 89, zero reported vulnerabilities. Existing lockfile unchanged; no packages added to manifests |
| V2 | In `apps/web`: `npm.cmd run build`; `npm.cmd ls --depth=0` | Passed: Vite transformed 1,592 modules, built in 1.09 seconds. JS 393.60 kB (111.39 kB gzip), CSS 55.11 kB (10.37 kB gzip). Dependency tree resolved |
| V3 | In `apps/web`: `npm.cmd run dev -- --strictPort`; HTTP requests to seven routes; temporary stdin `node --input-type=module` Vite SSR/React render check | Dev server started at `http://127.0.0.1:5173`; each path returned 200/root shell; each initial server render contained its expected page heading. Paths: `/`, `/schemes`, `/complaints/new`, `/requests`, `/track`, `/notifications`, `/officer`. This does not test browser events, effects, layout, accessibility or workflow persistence |
| V4 | `python -m venv .venv`; `.\.venv\Scripts\python.exe -m pip install -r services/api/requirements.txt`; `.\.venv\Scripts\python.exe -m pip check` | Passed; no broken requirements. Existing global Python environment unchanged |
| V5 | `.\.venv\Scripts\python.exe -m pytest -q` | **1 passed, 1 warning in 2.63s**. `pytest.ini` sets `pythonpath=services/api`, test directory and disables pytest cache. The only committed test checks health status/body |
| V6 | `.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir services/api --reload`; temporary stdin Python `urllib.request` assertions against localhost | Live `/api/health`: 200 and `{"status":"ok"}`; `/docs`: 200; `/openapi.json`: only `/api/health` business path. CORS preflights: both local origins 200 with exact allow-origin, unrelated origin 400 without allow-origin. `/api/me`, `/api/schemes`, `/api/complaints`: 404 |
| V7 | Temporary stdin `node --input-type=module`: Vite `createServer({server:{middlewareMode:true},appType:'custom'})`, `ssrLoadModule('/src/lib/api.js')`, then `getHealth()` | Passed against actual default API URL. Helper works in isolation; no UI imports/calls it |
| V8 | Checked actual env-file existence and nonempty process environment variables by name only | No `.env`, `services/api/.env`, `apps/web/.env`, or `apps/web/.env.local`; all nine documented variables unset; no secret values printed |

V3 initial-render check loaded `/src/App.jsx` and `/src/context/AppContext.jsx` through Vite, wrapped `App` in `AppProvider` and `MemoryRouter` for each path, and asserted the page heading with `react-dom/server:renderToString`. Audit-only probes were passed through stdin; no application routes or test files were added. Started dev/API servers were stopped after checks.

Backend resolution: FastAPI `0.162.0`, Pydantic `2.14.3`, Starlette `1.10.0`, Uvicorn `0.54.0`, pytest `8.4.2`, httpx `0.28.1`. Requirements use ranges and have no lock/constraints file. Starlette emitted `StarletteDeprecationWarning` that its httpx TestClient integration is deprecated in favor of httpx2. Tests currently pass; review compatible constraints/client migration in a later phase rather than installing an unrelated package during audit.

### Documented run-command findings

- The README's `npm install`, `npm run dev`, and build scripts exist. With an existing lockfile, `npm.cmd ci` was used. This host has PowerShell `Restricted` execution policy, which blocks the `npm.ps1` shim. `npm.cmd` works without changing policy. Direct virtualenv Python paths avoid relying on `Activate.ps1`, which is also subject to script policy.
- The README requires copying `.env.example` to `services/api/.env` before its exact launch command. That file was absent. Running `python -m uvicorn app.main:app --app-dir services/api --env-file services/api/.env --reload` with the venv interpreter failed with `Invalid value for '--env-file': Path 'services/api/.env' does not exist.` Starting without `--env-file` passed using current health/CORS defaults. No fabricated credentials or env file were created.
- Browser build-time variables belong in `apps/web/.env` or the frontend process/deployment environment. Copying root `.env.example` only to `services/api/.env` cannot configure Vite. The frontend example exists separately; no backend secret should enter it.
- Supported audit reruns: in `apps/web`, `npm.cmd ci`, `npm.cmd run build`, `npm.cmd run dev`; at root, `.\.venv\Scripts\python.exe -m pytest -q` and `.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir services/api --reload`. When real server configuration exists, add the documented `--env-file` argument.

## API calls and data ownership boundaries

The only application HTTP API call in frontend source is ``fetch(`${apiBaseUrl}/api/health`)`` in `apps/web/src/lib/api.js:4`. `getHealth` is not imported by any component. There is no axios, authenticated fetch wrapper, Supabase client, WebSocket, EventSource, or browser storage persistence in application source. External government hyperlinks and Unsplash image URLs are not backend integrations.

| Data/action | Actual owner now | Required boundary later |
|---|---|---|
| User, role, profile, selected state | `AppContext.jsx` initialized with `INITIAL_USER_PROFILE`; persona switch changes local object | Verified identity/profile and role from backend; UI state cannot grant authority |
| Schemes, benefits, eligibility, excerpts, review dates, documents | Six schemes and static verification flags in `mockData.js`; filtered locally | Reviewed source corpus and rule engine, exposed via API with actual provenance |
| Saved schemes, chat, notifications | React state; seeded messages; keyword/timer responses; mark-read maps local array | Persistent per-user data where required; grounded AI API; optional notifications deferred |
| Complaint creation and review | Form/local review modal, then `addComplaint`; random `REQ-2025-####`, fixed ETA and stepper | Server-owned IDs/timestamps, validation, authenticated owner, durable records after explicit confirmation |
| Officer update and routing | Local array replacement; routing removes suggestion and displays toast | Server role guard, validated transition, department assignment, immutable actor/time audit events |
| Official reference and package | Clipboard template; direct mutation of the selected complaint object's fields | Separate user-recorded filing metadata endpoint; do not infer official filing from internal state or link clicks |
| Platform metrics | Constants in `Home.jsx`, `Officer.jsx`, and `mockData.js` | Measured aggregates from labeled platform records; preserve existing UI presentation |

Specific later-phase correctness issues, identified by source inspection rather than interaction tests:

- `ComplaintForm.jsx` Save as Draft only displays a toast. Upload toggles a stock image; pin control is simulated; duplicate count/resolution time is static. No file input, geolocation call, draft storage, or comparison service backs these claims.
- `AppContext.jsx:updateComplaintStatus` replaces complaint objects but does not refresh `activeComplaint`; `TrackStatus.jsx` independently retains `selectedTicket`. These snapshots can show stale state after officer updates. Local timeline rewrites are not event records and do not validate transitions or record actor/time.
- `ComplaintPackageModal.jsx:handleSaveOfficialRef` mutates a shared object rather than using a context setter/API; no durable write exists. Clipboard success is shown without awaiting/catching rejection. Package text asserts verified photo/location metadata without any verification implementation.
- Human-readable category labels in UI differ from the API's `road|water|sanitation|streetlight|other`; profile fields (`age`, `incomeBand`) and complaint camelCase fields also need explicit mapping to the eventual contract. Current fixture objects are not validated API models.
- `Home.jsx` shows literal `12.8 L+`, `540+`, `18.4 L+`, `96%`; voice control selects a predefined query. `Officer.jsx` filters only store selected labels; charts/KPIs/SLA and insights remain constants. Topbar language selection changes a label without translating content.
- Fixture scheme excerpts, eligibility percentages, review dates and document verification are displayed as authoritative-looking results but have no checked corpus or verification service. Their factual accuracy and external links were not certified by this audit.

## Missing configuration, dependencies and services

All documented variables were unset in this audit process. No credentials are required for the tested health endpoint or mock frontend.

| Variable | Current consumer/default | Requirement later |
|---|---|---|
| `VITE_API_BASE_URL` | `apps/web/src/lib/api.js`; defaults to `http://127.0.0.1:8000` | Actual API origin at frontend build time |
| `CORS_ORIGINS` | `services/api/app/config.py`; defaults to both `127.0.0.1:5173` and `localhost:5173` HTTP origins | Actual allowed frontend origins on API server |
| `VITE_SUPABASE_URL` | Example only; no code consumes it | Browser auth provider project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Example only; no code consumes it | Actual browser-safe publishable key |
| `SUPABASE_URL` | Example only; no DB/auth client | Server project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Example only; no consumer | Server-only credential if the selected backend adapter needs it |
| `OPENAI_API_KEY` | Example only; no model calls | Server-only credential for planned model workflows |
| `LLM_MODEL` | Example only; no configured default | Explicit supported model selection |
| `EMBEDDING_MODEL` | Example only; no configured default | Model selection whose dimensions agree with vector schema/index |

Missing services/artifacts: Supabase Auth, PostgreSQL tables/migrations, pgvector extension/search RPC, authenticated test identities and trusted officer profile, reviewed scheme dataset, synthetic persisted complaint seed, model integration, and hosting/CI configuration. No connection/service test can be claimed for these. The plan mentions 1,536-dimensional vectors; confirm schema/model alignment before building ingestion.

Existing manifests are sufficient for everything currently implemented and tested. No new libraries were needed for Phase 0. Future auth/JWT, DB/vector, model, and optional graph integration require selecting an implementation and then adding only the SDKs/drivers/validation libraries it actually uses. The architecture names LangGraph, but no graph or LangGraph dependency exists. Do not install speculative packages or change React/CSS/JavaScript tooling to compensate for missing services.

## Exact later-phase file work

These are planning targets, not changes performed in Phase 0. New files are explicitly identified; migrations/data should be created only after agreeing the contract and service setup.

| Work | Existing files requiring targeted modification | Planned new files |
|---|---|---|
| Contract, ownership, setup and honest status | `docs/api-contract.md`, `docs/architecture.md`, `docs/four-day-implementation-plan.md`, `task.md`, `README.md`, `.env.example`, `apps/web/.env.example`, this tracker | Runtime `.env` files only when configured; never commit them |
| Backend foundations and identity | `services/api/app/main.py`, `config.py`, `schemas.py`, `requirements.txt` | `services/api/app/db.py`, `models.py`, `auth.py`, `routers/profiles.py`, `migrations/001_initial.sql`; `services/api/tests/test_auth.py` |
| Frontend API/auth/data ownership | `apps/web/src/lib/api.js`, `context/AppContext.jsx`, `components/layout/Topbar.jsx`, `App.jsx` only if auth routing/guards require it | `apps/web/src/lib/auth.js`; narrowly scoped data hooks/adapters if needed |
| Real schemes, eligibility and evidence | `apps/web/src/pages/SchemeSearch.jsx`, `components/schemes/SchemeDetailModal.jsx`, shared context/API client | `data/schemes.csv`, `data/scheme_sources/`, `services/api/app/routers/schemes.py`, `app/ai/ingest.py`, `embeddings.py`, `rag.py`, `eligibility.py`; `services/api/tests/test_schemes.py`, `test_eligibility.py` |
| Complaint CRUD, analysis, drafts and tracking | `apps/web/src/pages/ComplaintForm.jsx`, `MyRequests.jsx`, `TrackStatus.jsx`, `components/complaints/ComplaintReviewModal.jsx`, shared context/API client | `services/api/app/routers/complaints.py`, `app/ai/classification.py`, `duplicates.py`, `data/seed_complaints.json`; `services/api/tests/test_complaints.py`, `test_complaint_analysis.py` |
| Officer state/audit/aggregates and official reference | `apps/web/src/pages/Officer.jsx`, `components/officer/TicketDetailModal.jsx`, `components/complaints/ComplaintPackageModal.jsx`, shared context/API client and complaint router | `services/api/app/routers/officer.py`, `migrations/002_complaint_events.sql` if separate from initial schema; `services/api/tests/test_officer.py`, `test_status_transitions.py` |
| Unified assistant | `apps/web/src/pages/Home.jsx`, `context/AppContext.jsx`, `lib/api.js`, backend router registration | `services/api/app/ai/graph.py`, `routers/agent.py`; `services/api/tests/test_agent.py` |
| Release evidence and optional features | `README.md`; `apps/web/src/pages/NotificationsPage.jsx` and `components/layout/Topbar.jsx` only if optional features are retained | `docs/demo-script.md`, actual chosen hosting/CI configuration and focused UI smoke tests |

Preserve `apps/web/src/data/mockData.js` until each consumer has a tested real replacement: `context/AppContext.jsx`, `pages/SchemeSearch.jsx`, and `pages/Officer.jsx` import it directly. Preserve existing components/styles; `index.css`, logos, layout structure, and assets do not need redesign for API integration. Manifest/lockfile edits are conditional on an actual required dependency.

## Recommended minimal execution order and blockers

1. Agree the contract and ownership before implementing. Resolve the four-day vs five-day plans, the stale `main` reference in the four-day plan (actual branch is `master`), conflicting ownership of classification/duplicates and scheme routes, and unsupported completion claims. Use this audit as the evidence baseline; make no branch rename.
2. Configure actual Supabase/auth services; implement migrations, profiles, JWT verification, server-resolved roles, and ownership. Test invalid tokens and cross-user access before exposing complaint data. Browser-safe config and server secrets must remain separate.
3. Deliver the smallest real complaint loop: confirmed create, citizen list/detail, durable data/events, officer update, citizen refresh, independent official reference. Add contract/client mapping and error/draft recovery without changing the UI design. Test ownership, officer authorization, allowed transitions and official-status separation.
4. Curate the verified scheme corpus; expose a real list/search and deterministic eligibility first. Connect the current cards/profile inputs and exercise missing-data/nonmatch cases before claiming eligibility results. Maintain mock consumers until their replacements pass.
5. Add ingestion/retrieval/cited answers and complaint analysis/duplicate suggestions using configured models and deterministic fallback behavior; then connect the unified agent to tested tools. Measure accuracy and abstention rather than retaining fixture percentages.
6. Replace dashboard constants with real aggregates, complete focused browser smoke/security checks, reconcile docs, and configure deployment/CORS. Defer notifications, language, voice, uploads and maps until the two core journeys pass.

Blocking prerequisites for live business features are absent service configuration/credentials, schema/auth/routers, and reviewed source data. They do not block local scaffolding or tests. The exact env-file launch and PowerShell shims have documented local workarounds. No blocker remains for Phase 0 itself.

Documentation discrepancies to resolve later: `task.md` claims a wired health badge and state selector absent from current Topbar; its progress percentages are not tested delivery evidence. README says the UI does not present placeholder facts/statistics as real, while current cards do. `docs/architecture.md` describes a target JWT/database/AI architecture rather than present behavior. Neither the current build nor the single health test establishes security or end-to-end product completion.

Phase 0 stops here. No Phase 1 code, schema, service configuration, credential, dependency-manifest change, or deployment was implemented.
