# JanSeva AI

Independent citizen-assistance prototype for discovering verified public schemes and preparing civic complaints. JanSeva tracking is internal; official grievance filing happens on the relevant government channel and is never automated.

## Monorepo

- `apps/web` — React, JavaScript, Vite citizen and officer interface.
- `services/api` — FastAPI service and AI workflows.
- `data` — reviewed scheme sources and synthetic demo records.
- `docs` — architecture, API contract, and demo notes.

## Local development

Requirements: Node.js 20.19+ or 22.12+, Python 3.11+, Git.

1. Copy `.env.example` to `services/api/.env` and set server credentials when available. Never commit `.env` or expose service keys to the browser.
2. Frontend terminal: `cd apps/web`, copy `.env.example` to `.env` and configure the public Supabase URL/key, then `npm ci`, `npm run dev`.
3. API terminal from the repository root: `python -m venv .venv`, `.venv\Scripts\Activate.ps1`, `pip install -r services/api/requirements.txt`, then `uvicorn app.main:app --app-dir services/api --env-file services/api/.env --reload`.
4. Open `http://127.0.0.1:5173`; API health is at `http://127.0.0.1:8000/api/health` and API docs at `/docs`.

Citizen complaints and the officer queue now use authenticated API requests and database persistence. Configure Supabase sign-in, provision profiles, and opt in to explicit demo assignment using [Phase 2 setup and verification](docs/phase-2-setup.md). The existing UI, routes and review/package modals are retained. Scheme discovery now uses the database and a pgvector/OpenAI RAG implementation; see [Phase 3 setup, evidence and live blockers](docs/phase-3-setup.md). Live vector ingestion/retrieval still requires real database and model configuration. Unrelated dashboard content retains demonstration fixtures; advanced complaint AI and government integrations are not implemented. [Phase 1 setup](docs/phase-1-setup.md) describes the database migration and JWT foundation.

## Trust boundaries

- Scheme claims must cite verified official sources and their review dates.
- Eligibility is rule-based and can return `NEEDS_INFO`.
- Citizens confirm before an internal complaint is created.
- Internal status is distinct from official filing/acknowledgment status.
- Government portal submission is performed by the user; JanSeva does not automate it.

