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
2. Frontend terminal: `cd apps/web`, `npm install`, `npm run dev`.
3. API terminal from the repository root: `python -m venv .venv`, `.venv\Scripts\Activate.ps1`, `pip install -r services/api/requirements.txt`, then `uvicorn app.main:app --app-dir services/api --env-file services/api/.env --reload`.
4. Open `http://127.0.0.1:5173`; API health is at `http://127.0.0.1:8000/api/health` and API docs at `/docs`.

Day 1 provides the navigable visual shell and health endpoint. Scheme search, authentication, complaint workflows, and AI features are added in later implementation phases; the UI does not present placeholder scheme facts or government statistics as real data.

## Trust boundaries

- Scheme claims must cite verified official sources and their review dates.
- Eligibility is rule-based and can return `NEEDS_INFO`.
- Citizens confirm before an internal complaint is created.
- Internal status is distinct from official filing/acknowledgment status.
- Government portal submission is performed by the user; JanSeva does not automate it.

