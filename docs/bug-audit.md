# Strict full-project bug audit and fixes

Date: 2026-11-07 (Asia/Calcutta). Baseline: clean `release/phase-5-mvp-review`, commit `4d7e743`. `git status --short` and `git diff --stat` were empty before edits. Work is isolated on `fix/full-project-bug-audit`; the earlier release branch and draft PR are unchanged. No reset, rebase, force push, deleted source files, framework/dependency additions or UI redesign.

## 1. Project status

| Area | Status | Evidence and boundary |
|---|---|---|
| Frontend | PASS | Production builds and 18 actual Chromium tests pass, including navigation, error handling, mobile layouts and keyboard modals |
| Backend | PASS | 109 pytest passes, normal Uvicorn startup, health 200 and expected protected-route failures |
| Database | PARTIAL | Isolated SQLAlchemy/SQLite integrity and seed tests plus migration SQL/reflection/runner checks pass; actual PostgreSQL connection, repair, vector migration and policies BLOCKED |
| Authentication | PARTIAL | Signed ES256/RS256 JWT, expiry/signature/claim rejection, roles/isolation tested; actual Supabase accounts unavailable |
| Complaint workflow | PARTIAL | Real isolated API writes/events, independent sessions, all internal statuses and refresh persistence pass; real PostgreSQL/account journey BLOCKED |
| Scheme RAG | PARTIAL | Implemented embeddings/pgvector/evidence selection and deterministic safety tests; live vectors, ingestion rerun and five-question relevance BLOCKED |

PASS is limited to the stated local evidence. No mocked/isolated test is counted as a live provider test. This is not a claim that every possible hidden bug has been eliminated.

## 2. Bugs reproduced and fixed

### A01 ? P0: streetlight complaints cannot fit the original PostgreSQL column

- Files: `services/api/migrations/001_initial.sql`, new `003_complaint_category_width.sql`, `app/scripts/migrate.py`, `tests/test_migration_contract.py`.
- Root cause: SQL used VARCHAR(10), but `streetlight` has 11 characters and the ORM expects 11. SQLite ignores VARCHAR lengths; the readiness validator checked presence/nullability but not width, so existing tests/checks missed this PostgreSQL failure.
- Before: SQL contract test failed with `assert 10 >= 11`; an accurate reflected-schema fixture showed the checker did not raise for the undersized column.
- Fix: correct new-install width, add a rerunnable widening-only repair for existing installations, apply it with 001 before validation in the same transaction, and reject insufficient reflected string widths.
- Verification: **3 migration regression tests pass** (SQL contract, reflected old schema rejection, repair-before-validation transaction runner). Real PostgreSQL execution remains **BLOCKED**; no actual ALTER success is claimed. Operators must rerun `app.scripts.migrate` before check/setup/vector migration.

### A02 ? P0: successful complaint acknowledgment is lost during token refresh

- Files: `apps/web/src/context/AppContext.jsx`, `apps/web/tests/audit.spec.js`.
- Root cause: the version used to suppress prior-account results changed on every access-token refresh. A complaint could already be committed while the frontend discarded its 201 response, leaving confirmation open and permitting a duplicate retry.
- Before: browser reproduction held a real committed POST response, called the actual Supabase SDK refresh against the isolated provider, then released 201. Expected 0 dialogs, received 1.
- Fix: use a separate identity generation for writes while preserving token generation for reads/401 handling. Suppress stale refresh callbacks using their actual token. Account changes still discard prior-user results; requests are never automatically replayed.
- Verification: same-account refresh regression passes with the real isolated POST, saved UUID and closed confirmation. Existing account-switch/late-401/complaint tests pass. Server-side mutation idempotency is still not implemented, so a genuinely lost network response remains an explicit limitation.

### A03 ? P0: scheme conversation crosses authenticated accounts

- Files: `apps/web/src/context/AppContext.jsx`, `apps/web/tests/audit.spec.js`.
- Root cause: changing/signing out accounts cleared tickets but not scheme-chat messages/errors or pending replies. The next account could see the prior account's questions and late response.
- Before: citizen-to-officer browser switch still showed one prior private question where zero was expected.
- Fix: clear chat on identity change/logout/expiry, invalidate in-flight chat generations, reset busy state, and ignore old success/error/finally callbacks. Same-account token refresh does not erase the conversation.
- Verification: account-switch and deliberately delayed reply regression passes. Answer response is explicitly a UI fixture, not a live model result.

### A04 ? P1: an older queue snapshot erases a newer detail

- Files: `apps/web/src/context/AppContext.jsx`, `apps/web/tests/audit.spec.js`.
- Root cause: list request ordering did not account for a newer detail/write applied after a list began.
- Before: hold a real GET snapshot, create a ticket through an independent real API request, load its real detail, then release the older snapshot. The displayed ticket disappears.
- Fix: track complaint application revision and discard list snapshots started before a newer detail/write. Loading completion still runs.
- Verification: exact ordered-response browser regression passes and the newer UUID/detail remains visible. This addresses list-versus-detail ordering; it does not add an offline cache or real-time subscription.

### A05 ? P1: a citizen filing-reference event replaces the officer note

- Files: `apps/web/src/lib/complaints.js`, `apps/web/tests-unit/complaints.test.js`.
- Root cause: any event with an old status was treated as an officer note, including a same-status citizen reference event.
- Before: client assertion received `Citizen recorded an unverified reference.` instead of `Officer is reviewing this report.`
- Fix: only use genuine status-change events for the displayed officer note. Keep all events in the audit timeline.
- Verification: regression passes; three timeline entries remain and the filing event retains its user-reported label.

### A06 ? P1: modal keyboard focus remains behind the overlay

- Files: new `apps/web/src/lib/useDialog.js`; existing Login, SchemeDetail, ComplaintReview, ComplaintPackage and TicketDetail modal components; `apps/web/tests/audit.spec.js`.
- Root cause: role/aria-modal attributes were present without focus entry, Tab containment, Escape dismissal or opener restoration.
- Before: browser focus assertion expected focus inside sign-in, received false.
- Fix: a small shared hook manages keyboard focus in the top dialog, cycles eligible controls, closes on Escape when not busy and restores the opener. Added names to icon close buttons. Existing markup/styles/layout remain.
- Verification: focus/Tab/Escape/restoration test passes; scheme, complaint review (draft retained), package and officer dialogs dismiss by keyboard. All existing browser/mobile cases pass. This is targeted keyboard verification, not a full accessibility certification.

### A07 ? P1: malformed generation items escape provider error handling

- Files: `services/api/app/ai/provider.py`, `services/api/tests/test_schemes.py`.
- Root cause: unexpected null/string entries in the model response caused AttributeError outside the sanitized exception boundary.
- Before: three provider response fixtures failed with unhandled AttributeError.
- Fix: normalize this malformed-response exception to ProviderError; the existing RAG layer can use its explicitly labeled extractive fallback. No synthetic answer or citation is introduced.
- Verification: all three malformed response tests pass, along with the retained fallback/citation/prompt-injection safety contracts.

Documentation finding: architecture still claimed LangGraph, rule-based eligibility and duplicate suggestions as implemented. It now describes actual code; API documentation separates three unregistered design proposals from implemented endpoints. README/status include current evidence and repair steps. Local document links are checked before handoff.

## 3. Commands, actual results and limitations

PowerShell from repository root; `python` means `.venv/Scripts/python.exe`. Web commands run inside `apps/web`.

| Command/check | Actual result |
|---|---|
| Baseline `python -m pytest -q` | 103 passed, 1 skipped, 1 warning in 26.53s |
| Baseline `npm.cmd run build` | Passed; 1640 modules, 6.03s |
| Baseline `npm.cmd run test:client` | 8 passed, 0 failed |
| New regressions before fixes | Migration 2 failed; client officer-note 1 failed; first browser group 3 failed; token-refresh browser 1 failed; malformed provider 3 failed. These are intentionally exposed defects, not hidden final failures. |
| `python -m pytest -q services/api/tests/test_schemes.py services/api/tests/test_migration_contract.py` | 31 passed, 1 warning in 2.74s |
| Final `python -m pytest -q` | **109 passed, 1 skipped, 1 warning in 32.79s**, exit 0 |
| `python -m pip check` | `No broken requirements found.`, exit 0 |
| `python -m compileall -q services/api/app` | No errors, exit 0 |
| `npm.cmd run test:client` | **9 passed, 0 failed**, exit 0, 306.6171ms |
| `npm.cmd run test:e2e` | **18 passed (3.4m)**, actual Chromium, exit 0 |
| `npm.cmd run build` (no Auth configuration) | Passed; 1641 modules, JS 396.11 kB / gzip 112.28 kB |
| Auth-configured build with public placeholder URL/key | Passed; JS 613.35 kB / gzip 167.88 kB; existing >500 kB advisory. Placeholders do not prove valid live configuration. |
| `npm.cmd audit --json` | 0 reported vulnerabilities in every severity category, exit 0 |
| Normal `uvicorn app.main:app --app-dir services/api --host 127.0.0.1 --port 8766` smoke | Health 200; six anonymous protected calls 401; actual scheme list/ask 503 without database. Nine expected results, no test-provider paths in OpenAPI; server stopped. |
| `python -m app.scripts.check_db` | Exit 1, `Database check failed: DATABASE_URL is not configured.` |
| `python -m app.scripts.migrate` | Exit 1, `Migration not applied: DATABASE_URL is not configured.` |
| `python -m app.scripts.migrate_schemes` | Exit 1, same missing URL; vector migration not applied |
| `python -m app.scripts.ingest_schemes --validate-only` | Exit 0, 8 validated records, 0 failures, 8 chunks |
| `python -m app.scripts.evaluate_schemes` | Exit 1; all 5 cases explicitly blocked by missing DATABASE_URL |
| `git diff --check` / final diff review | Intended bug fixes/tests/docs only; no generated build/browser artifacts staged |

Security/configuration checks: a heuristic scan covered **196 reachable Git blobs (192 text blobs)** and **121 current project paths**, with **0 findings**. Only `.env.example` and `apps/web/.env.example` are tracked; `git check-ignore` confirms root/backend/web real env paths are ignored. Actual provider variable presence was checked without printing values: all required ones were absent. This scoped scan is not exhaustive secret detection.

The one pytest skip is the opt-in real PostgreSQL/pgvector/OpenAI test, not a pass. The existing Starlette/httpx deprecation remains a warning; it was not hidden or suppressed. Frontend build timings vary; the configured size advisory is not a build failure. pip check verifies installed dependency compatibility, not a full vulnerability audit.

Browser scope: Vite + real FastAPI/SQLite, a local fake Auth provider with genuinely verified ES256 signatures, generated test password and independent storage contexts. Real complaint writes/events/persistence are exercised. Database scheme cards are real isolated records; scheme answers and external citation navigation use labeled fixtures. Real Supabase login, live official-page content, vector SQL and provider quality are not proven. Test dependencies never enable a production auth bypass. Retained 320/375/1280 layout checks pass. Six added browser cases cover the new race/privacy/refresh/keyboard regressions and history/unknown routes.

## 4. Remaining issues

### Unfixed bugs

No identified reproducible locally testable P0 remains failing. The PostgreSQL width repair is implemented and locally contract-tested, but deployment execution is still blocked; an existing live database is not fixed merely by updating files. No comprehensive bug-free or penetration-test guarantee is made.

### Features not implemented

Government filing/integrations, personalized eligibility decisions, general homepage AI/voice, complaint AI/semantic duplicates, verified uploads/GPS, notification/translation backend, persistent bookmarks, complaint edit/delete and deployment automation remain outside implemented scope. Deferred visuals are preserved/labeled. Internal RESOLVED is never official government resolution.

### Live tests blocked

No real backend/web env files or required provider variables are configured. Actual Supabase identities, database/policy checks, migrations 001/003/002, embeddings/storage/reruns, five live RAG evaluations and the actual-account complaint journey remain BLOCKED. No local PostgreSQL/Docker executable was available for a disposable real PostgreSQL reproduction. SQLite is not represented as a vector or VARCHAR-enforcement test.

### Optional/operational improvements

Public model routes lack rate limiting/cost quotas. Python dependencies lack a resolved lockfile; no deployment/CI/monitoring or full Python security audit is verified. JWT signature verification does not instantly revoke an already issued token on logout. There are no mutation idempotency keys for ambiguous network outcomes. Scheme coverage remains 8 dated reviewed summaries and requires currency checks; historical APY/Punjab limitations and the passed NMMSS deadline remain documented. These are not claimed as fixed features.

## 5. Git changes and reproducibility

Baseline was clean; no uncommitted user changes were overwritten. Current work is on the new local branch `fix/full-project-bug-audit` based on `4d7e743`; the earlier release branch/draft PR are preserved. Scoped backend, frontend and documentation commits are listed in the final handoff. No push or merge is performed for this audit.

Changed files (21):

- Backend (6): `services/api/app/ai/provider.py`, `services/api/app/scripts/migrate.py`, `services/api/migrations/001_initial.sql`, new `services/api/migrations/003_complaint_category_width.sql`, new `services/api/tests/test_migration_contract.py`, `services/api/tests/test_schemes.py`.
- Frontend (10): `apps/web/src/context/AppContext.jsx`, `apps/web/src/lib/complaints.js`, new `apps/web/src/lib/useDialog.js`, five existing modal components (`common/LoginModal`, `complaints/ComplaintReviewModal`, `complaints/ComplaintPackageModal`, `officer/TicketDetailModal`, `schemes/SchemeDetailModal`), new `apps/web/tests-unit/complaints.test.js`, new `apps/web/tests/audit.spec.js`.
- Documentation (5): `README.md`, `docs/api-contract.md`, `docs/architecture.md`, `docs/implementation-status.md`, new `docs/bug-audit.md`.

Reproduce local checks using the README install commands, then pytest, client tests, Chromium installation and `npm.cmd run test:e2e`. Never deploy `services/api/tests/e2e_server.py`; its temporary database/Auth fixture is for tests only. To reproduce the real demo, configure actual providers and provisioned accounts, rerun the core/003 migration command before 002, check the DB, ingest twice and evaluate. Set actual provider-issued demo assignment UUIDs, then use separate Arjun/R. Singh browser profiles for submit/review/refresh. See README for exact operator commands. Existing Phase 5 screenshots remain labeled synthetic test captures; no new production screenshot is claimed.

## 6. Final readiness

**Ready for a reliable isolated local test demonstration with disclosed fixtures and limitations. Not yet verified for the actual-account/live AI demonstration or public production use.** Configure real services, apply and verify repair 003, and complete the live gates before describing those workflows as fully verified. Existing design and working behavior are preserved; no scope expansion was used to hide missing dependencies.
