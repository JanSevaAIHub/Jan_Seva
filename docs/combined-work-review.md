# Combined work review

Audit date: 2026-11-08 (Asia/Calcutta). Repository: `JanSevaAIHub/Jan_Seva`. Target: `feature/combined-work`.

## Source and preservation

- Original master: `a382a665c9b9ba34d5deb7c48e37ff6a6521550c`.
- PR #1: `release/phase-5-mvp-review`, `4d7e74351ee47350f6a84ee5352bf4357e2ebcf6`; open, draft, unmerged during audit.
- PR #2: `developer-b/backend-foundation`, `be3e8e3e2480257ac30bbed451b0a9c265f2c0ff`; open, unmerged during audit. This is the actual branch despite the task's Developer A label.
- PR #2 contains all seven PR #1 commits and six additional commits. Starting from PR #1 and merging PR #2 with `--ff-only` preserved the complete history without conflicts or a redundant merge commit.
- The original checkout was clean on `fix/full-project-bug-audit` at `c4fa5992c438ad920a22c0964aad1e92f12b9e1a`. Its separate audit work was left untouched and was not silently included in these two PRs. Local ignored configuration was not copied, opened or changed.
- Work runs in a separate `Jan_Seva-combined` worktree. No reset, force-push, source branch update, master update or PR mutation is required.

PR #1 functionality retained: original React design; authenticated citizen complaint creation/list/detail; officer assignment and validated status transitions; immutable event history; ownership/authorization checks; server-side JWT verification; stored scheme listing; curated eight-record evidence corpus; pgvector retrieval and citation-validated RAG; unit/browser coverage and setup/release documentation.

PR #2 functionality retained: first-login citizen provisioning with concurrent insertion protection; twenty idempotent synthetic complaint fixtures; successful-submission tracking banner, form clearing and callback; corrected initial category column width; added auth/configuration/error-response tests; demo sign-in and operator role helper capabilities with the safeguards below. Shared complaint CRUD, officer APIs, My Requests and RAG already descend from PR #1 and are not duplicated.

## Integration fixes

1. Declare `python-dotenv` directly because API configuration imports it (previously only present through `uvicorn[standard]`).
2. Retain demo autofill only in development, using explicitly supplied `VITE_DEMO_EMAIL` and `VITE_DEMO_PASSWORD`. Neither variable is required. Use disposable local test accounts only: Vite browser variables are public. Production code eliminates this development-only branch. No existing `.env` file was edited.
3. Require an explicit UUID for the operator-only role helper; validate role choices, use a transaction/row lock, close sessions, preserve names and avoid exception-detail output. It is not an API endpoint. With `PYTHONPATH=services/api`, run `python -m app.scripts.toggle_role --user-id <UUID> --role citizen` (or `officer`); omitting `--role` toggles only that selected profile. The helper was tested against isolated SQLite, never run against a live database.
4. Add migration 003 and execute it inside the existing migration transaction. Updating `CREATE TABLE IF NOT EXISTS` alone does not upgrade PR #1 databases. The upgrade widens only an existing bounded VARCHAR shorter than 50; it does not narrow wider/text columns or recreate tables. The ORM enum remains compatible with all five allowed categories.
5. Await clipboard writes and show a truthful failure message when browser permission is unavailable. Extend the browser journey to verify PR #2's banner, form clearing, tracking link and denied clipboard behavior.
6. Update current setup documentation to twenty fixtures and automatic first-login citizen profiles. Earlier phase documents retain their historical test claims.

## Validation

Validation uses a fresh worktree virtual environment and `npm ci` from the existing lockfile. No private configuration is needed. On Windows, use `npm.cmd` when PowerShell blocks the `npm.ps1` shim.

- `.venv/Scripts/python.exe -m pytest -q` with `JANSEVA_LIVE_RAG=0`: **113 passed, 1 skipped**, one Starlette/httpx deprecation warning. Covers authentication, authorization, complaint persistence, transitions, RAG behavior with doubles, profile concurrency, seed idempotence and explicit role administration.
- `python -m pip check`: no broken requirements.
- `python -m app.scripts.ingest_schemes --validate-only`: eight records, zero failures, eight chunks; no provider calls.
- `npm.cmd run test:client`: **8 passed**.
- `npm.cmd run build`: passed without Auth configuration; passed with explicitly synthetic public Auth configuration. Configured bundle is about 614 kB minified and has a size advisory.
- `npm ci`: zero reported npm vulnerabilities.
- OpenAPI generation: nine operations, unique operation IDs; citizen/officer/scheme routes remain registered once in the schema.
- `npm.cmd run test:e2e`: **12 Chromium tests passed** (1.8 minutes), including independent citizen/officer sessions, refresh persistence, error handling and mobile/desktop layouts.
- Production build with synthetic development autofill markers: passed; neither marker appeared in generated JavaScript.
- `git diff --check`: clean. Ancestor checks establish original master, PR #1 and PR #2 are in target history.

## Remaining gates

No live Supabase Auth, PostgreSQL, migration 003 execution, pgvector retrieval, OpenAI generation or deployment was tested in this audit. Browser tests use a local fake Auth provider, temporary SQLite storage and documented AI doubles. Previous PR descriptions claiming live success are not fresh verification. Run the documented database checks and opt-in RAG evaluations in an explicitly configured environment before deployment.

PR #2 committed demo login credentials. The combined tip no longer embeds them, but they remain in inherited Git history because source history must be preserved. If those credentials are real, their owner must rotate them and review the account. No credential values are reproduced here.

Public model routes still need rate limiting and cost controls. Backend dependency ranges remain unlocked. Complaint mutations lack idempotency keys; a lost response can follow a committed write. Operator role changes require careful account selection and can change access to assigned complaints. The corpus is small and needs current source review. Deferred AI, uploads, government filing and other limitations remain documented in README/release review.

The combined code is suitable for the next local implementation phase after local validation, with these live/deployment gates outstanding.
