# Four-day two-developer execution plan

This plan follows the approved four-day limit and the JanSeva AI PDF. It deliberately ships the scheme and complaint journeys before optional features. The detailed shared request/response boundary is in [api-contract.md](api-contract.md).

## Ownership and coordination

- **Developer A:** all `apps/web/**` files; `services/api/app/ai/**`; verified scheme source data and ingestion.
- **Developer B:** API configuration, auth, database, migrations, complaint/officer routers and synthetic ticket data.
- **Shared:** agree any contract change in `docs/api-contract.md` and `apps/web/src/lib/types.ts` first. Keep `main` runnable and test the integrated behavior at each day’s exit gate.
- **Scope baseline:** Punjab first, selected national schemes, Uttar Pradesh only where official source text/rules are verified. No fabricated data, benefits, eligibility, URLs, or statistics.

## Day 1 — Repository, scaffold, design shell, contracts

| Owner/task | Exact files | Depends on | Expected output / acceptance |
|---|---|---|---|
| Both: initialize monorepo and record boundaries | `.gitignore`, `.env.example`, `README.md`, `docs/architecture.md`, `docs/api-contract.md`, `docs/four-day-implementation-plan.md` | Empty workspace; Node, Python, Git | Git initialized; frontend/backend/data/docs areas agreed; secrets documented server-only; endpoint/error/auth contract stable and visible to both developers. |
| A: React/Vite shell and design tokens | `apps/web/package.json`, `apps/web/package-lock.json`, `apps/web/index.html`, `apps/web/vite.config.ts`, `apps/web/tsconfig.json`, `apps/web/.env.example`, `apps/web/src/main.tsx`, `apps/web/src/App.tsx`, `apps/web/src/index.css`, `apps/web/src/lib/{api,types}.ts`, `apps/web/src/components/layout/{AppShell,Sidebar,Topbar}.tsx`, `apps/web/src/pages/{Home,SchemeSearch,ComplaintForm,MyRequests,Officer}.tsx` | Shared routes and design tokens | Five client routes load in one responsive shell. Navy sidebar, violet/teal/orange palette, rounded cards, headings, and responsive bottom nav follow PDF. No fake metrics/results; not-yet-wired controls are visibly disabled/labeled. |
| B: FastAPI skeleton and health API | `services/api/requirements.txt`, `services/api/app/{__init__,main,config,schemas}.py`, `services/api/app/routers/{__init__,health}.py`, `services/api/tests/test_health.py`, root `pytest.ini` | Shared API/error contract | API starts; `/api/health` returns `{"status":"ok"}`; CORS comes from env; health behavior has a test. No auth is claimed until JWT verification exists. |
| Both: Day 1 gate | Files above | Frontend and API running | Five routes return the app shell; health route returns 200; frontend production build passes; no secrets or real-looking seed claims committed. |

**Commands** (repo root unless indicated): `git init`; `cd apps/web; npm install`; `npm run dev`; `npm run build`; repo root: `python -m venv .venv`; `.venv\Scripts\Activate.ps1`; `pip install -r services/api/requirements.txt`; `uvicorn app.main:app --app-dir services/api --env-file services/api/.env --reload`; `python -m pytest`.

## Day 2 — Punjab-first scheme search and complaint persistence

| Owner/task | Exact files | Depends on | Expected output / acceptance |
|---|---|---|---|
| A: source set, ingestion, retrieval and rules | `data/schemes.csv`, `data/scheme_sources/**`, `services/api/app/ai/{ingest,embeddings,rag,eligibility}.py`, `services/api/app/routers/schemes.py`, `apps/web/src/components/schemes/**`, `apps/web/src/pages/SchemeSearch.tsx`, `apps/web/src/lib/api.ts` | Contract; Supabase URL/keys and pgvector RPC from B; official source text | Initial verified Punjab schemes and selected central schemes, with review date and official URL. Search results cite retrieved passages. Deterministic rules return only `POTENTIAL`, `NOT_MATCHED`, or `NEEDS_INFO`; absent evidence abstains. |
| B: DB, JWT auth, scheme and complaint REST foundation | `services/api/app/{db,auth,models}.py`, `services/api/app/routers/{profiles,schemes,complaints}.py`, `services/api/migrations/001_initial.sql`, `data/seed_complaints.json`, `.env.example` | Day 1 contract; configured Supabase | Tables/RLS or backend checks established; Supabase JWT verified; `/api/me`, scheme list, complaint create/list/detail available; citizens read/write only their own tickets. |
| Both: integrate core data | `apps/web/src/lib/{api,auth}.ts`, scheme and complaint hooks/forms, `services/api/tests/{test_auth,test_complaints}.py` | Above routes | Source URL/review date visible; create and read a citizen’s internal ticket; cross-user read blocked; API failures preserve draft. |

**Commands:** apply `services/api/migrations/001_initial.sql` through Supabase SQL editor/CLI; `python -m pytest`; `cd apps/web; npm run build`. **Test:** manually open every scheme source; run known/missing/non-match rule cases; create/list ticket and try a different user token.

## Day 3 — Complaint analysis, review, officer queue and audit

| Owner/task | Exact files | Depends on | Expected output / acceptance |
|---|---|---|---|
| A: classification/duplicate suggestions and citizen review UX | `services/api/app/ai/{classification,duplicates}.py`, `services/api/app/routers/complaints.py`, `apps/web/src/components/complaints/**`, `apps/web/src/pages/{ComplaintForm,MyRequests}.tsx` | Day 2 complaint schema, embeddings/search contract | Category among road/water/sanitation/streetlight/other is a suggestion and remains editable. Similar tickets are labeled suggestions. User reviews normalized draft before create; timeline reads actual events. |
| B: officer authorization, state transitions and audit | `services/api/app/routers/{officer,complaints}.py`, `services/api/app/auth.py`, `services/api/migrations/002_complaint_events.sql`, `services/api/tests/{test_officer,test_status_transitions}.py` | Day 2 JWT/ownership, complaint table | Role-protected queue/update; backend validates allowed internal transitions; every update appends actor/time/old/new status. Official filing status/reference stays separate and user-recorded. |
| Both: complete complaint loop | `apps/web/src/components/officer/**`, `apps/web/src/pages/Officer.tsx`, citizen timeline, API tests | Above behavior | Citizen submit → officer internal update → citizen timeline works; unauthorized role/ticket actions are rejected; no government filing is triggered. |

**Commands:** `python -m pytest`; `cd apps/web; npm run build`. **Test:** citizen cannot update officer state or view another ticket; officer update creates audit event; local status never changes official status.

## Day 4 — Unified agent, integration, deployment and demo

| Owner/task | Exact files | Depends on | Expected output / acceptance |
|---|---|---|---|
| A: intent graph, tool trace, citation and failure UX | `services/api/app/ai/graph.py`, `services/api/app/routers/agent.py`, `apps/web/src/components/{assistant,schemes}/**`, `apps/web/src/pages/Home.tsx`, `apps/web/src/lib/api.ts` | Day 2 scheme and Day 3 complaint tools | Scheme/complaint/mixed requests route to real tools, ask clarification when needed, return citations and trace. Complaint writes require a separate confirmed frontend action. Graceful retry preserves user text. |
| B: dashboard aggregates, environment/deploy support | `services/api/app/routers/{officer,agent}.py`, `services/api/migrations/**`, `data/seed_complaints.json`, `docs/architecture.md`, `.env.example` | Day 3 officer APIs; hosting credentials | KPI/chart data comes from synthetic platform records; deploy API with restricted CORS and server-only secrets; seed/reset works. |
| Both: release gate and demo docs | `README.md`, `docs/demo-script.md`, `services/api/tests/**`, UI smoke checklist | All journeys | Frontend/API work from clean browser; citizen and simulated officer journeys demonstrated; verified scheme links work; limits and measured results are documented honestly. |

**Commands:** `cd apps/web; npm run build`; repo root `python -m pytest`; use the selected frontend/API host deployment commands; verify `/api/health`, sign-in, both journeys, role enforcement and source links in a clean browser.

## Defer until both core journeys and deployment pass

Photo upload, map picker, Hindi responses, PDF complaint export, notifications, heat maps/advanced analytics, agent memory, multiple agents, OCR, external WhatsApp/email submission, and government portal automation/integration. Government submission is never automated in this MVP.
