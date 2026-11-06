# Phase 5 final MVP release review

Review date: 2026-11-07 (Asia/Calcutta). Scope frozen. Phase 5 changes only release tests and documentation; no new production features, redesign or frameworks.

## Release recommendation

**Approve a controlled local portfolio review with the limitations below. Do not approve a fully verified live AI MVP or public production launch yet.** All local P0 checks pass. Real Supabase demo accounts, PostgreSQL/pgvector execution, live model relevance and the actual-account journey remain blocked by absent configuration. No passing live result is invented. Stop after Phase 5; the remaining gates are operator instructions, not completed work.

## Feature completion

VERIFIED applies to the evidence explicitly stated; PARTIAL means implementation exists with unverified gates; BLOCKED means required external execution cannot run.

| Feature | Status | Actual evidence |
|---|---|---|
| Frontend build and P0 navigation | VERIFIED | Default/configured compilation; actual Chromium navigation and mobile checks |
| Unified API transport and error handling | VERIFIED | 8 client tests; browser malformed/network/401/retry checks |
| JWT validation and backend RBAC | VERIFIED | Signed-token unit/integration cases including invalid and expired JWT, wrong roles and cross-user isolation |
| Citizen create/list/detail and officer lifecycle | VERIFIED | Isolated real FastAPI/SQLite transactions, audit rollback, valid/invalid transitions and reload persistence |
| Independent authenticated sessions | VERIFIED | Separate Chromium contexts retain citizen/officer identities and observe shared persistent ticket events |
| CORS allowlist | VERIFIED | Actual middleware preflights: two local origins allowed, unrelated and null origins rejected |
| Dataset/source metadata validation | VERIFIED | 8 schemes, 8 notes, 8 current chunks, 0 invalid records |
| RAG retrieval and citation safeguards | PARTIAL | Local deterministic/provider-double safety tests pass; real vectors and model relevance unverified |
| Scheme page and citation opening | PARTIAL | Actual isolated database listing; answer and official-URL navigation fixtures, not live provider/page proof |
| Supabase real account login | BLOCKED | No configured real project/public key/demo credentials |
| PostgreSQL, migrations, policies and vector SQL | BLOCKED | Actual connection/migration commands fail closed without DATABASE_URL |
| Live model evaluation | BLOCKED | All five real evaluation cases report blocked, not passing |
| Live citizen-to-officer demonstration | BLOCKED | Needs actual providers and assignment UUIDs |
| Documentation and interview preparation | VERIFIED | README, status, this review, archive, two actual screenshots and 12 interview topics |
| Public deployment readiness | PARTIAL | No live/deployment verification, rate limiting or cost quotas |

## Commands and measured outputs

Commands run from repository root unless `apps/web` is specified. `python` below was the repository's `.venv/Scripts/python.exe`; the environment used Python 3.12.5, Node 24.19.0 and npm 11.17.0. Baseline pytest was 99 passed/1 skipped before four CORS cases were added. No P0 application test failed or required a production-code fix.

| Command | Real final output / result |
|---|---|
| `python -m pytest -q` | **103 passed, 1 skipped, 1 warning in 13.00s**, exit 0 (previous final run 14.51s) |
| `python -m pip check` | `No broken requirements found.`, exit 0 |
| `python -m compileall -q services/api/app` | No errors, exit 0 |
| `npm.cmd run test:client` (web) | **tests 8, pass 8, fail 0**, exit 0; latest duration 205.9482 ms |
| `npm.cmd run test:e2e` (web) | **12 passed (1.6m)**, actual Chromium, exit 0 |
| `npm.cmd run build` (web, no Auth variables) | **1640 modules transformed; built in 1.61s**, exit 0 |
| Same build with non-secret public placeholder URL/key | **1640 modules transformed; built in 1.42s**, exit 0; chunk advisory |
| `npm.cmd audit --json` (web) | Vulnerabilities: info/low/moderate/high/critical/total **0**; exit 0 |
| `python -m app.scripts.check_db` | `Database check failed: DATABASE_URL is not configured.`, exit 1 |
| `python -m app.scripts.migrate_schemes` | `Scheme migration not applied: DATABASE_URL is not configured.`, exit 1 |
| `python -m app.scripts.ingest_schemes --validate-only` | `{"validated_records": 8, "failed_records": 0, "chunks": 8}`, exit 0 |
| `python -m app.scripts.evaluate_schemes` | Five JSON results with `execution: blocked`, `error: DATABASE_URL is not configured.`, exit 1 |
| `git status`, `git diff`, `git diff --check` | Reviewed intended changes only; final whitespace check required before commit |
| `git ls-remote origin HEAD refs/heads/master refs/heads/release/phase-5-mvp-review` | Remote HEAD/master at `a382a665c9b9ba34d5deb7c48e37ff6a6521550c` at review |
| `git push --dry-run origin HEAD:refs/heads/release/phase-5-mvp-review` | New branch dry run accepted, exit 0; no force or merge |

The final pytest warning is the existing Starlette/httpx TestClient deprecation. The single skipped test is the opt-in live PostgreSQL/pgvector/OpenAI test, **not a pass**. Backend tests cover configuration/model relationships, JWT/RBAC, complaint create/read/status behavior and atomic events, and RAG retrieval/citation contracts. Arbitrary complaint edit/delete is outside the implemented API.

Build sizes: default JS **394.50 kB (111.71 kB gzip)**; configured Auth JS **611.72 kB (167.31 kB gzip)**; CSS **55.90 kB (10.62 kB gzip)**. The configured build warns about a chunk over 500 kB; no bundle refactor was added under frozen scope. Placeholder configuration proves compilation only and is not valid service configuration. Final local build output was restored to the default configuration.

Actual five evaluation cases: farmer support in Punjab, student schemes, Sukanya documents, Haryana applicant/Punjab domicile, and unknown Galactic Farming Grant. Every case was blocked by missing database configuration. No live quality percentage can be reported.

## Browser verification and its boundary

Chromium was available and actually ran twelve tests. The harness starts Vite and real FastAPI routes on isolated ports, uses temporary SQLite, and exercises the real Supabase client against a local Auth double with ES256 signatures/JWKS and a generated test password. It does not grant production authorization through React state. These are synthetic identities, not the configured real demo accounts.

Verified: homepage, six P0 routes at 320/375/1280 widths, scheme database cards, scheme response/empty/error handling, official citation URL opening through a navigation fixture, login/logout, citizen POST with real saved UUID, failed-request draft retention, My Requests, tracking, assigned officer queue and PATCH note/event, returning citizen, browser refresh persistence, independent citizen/officer contexts, unauthorized guards, session races, queue retry and malformed/network backend responses without a React crash.

Complaint browser journeys use the real isolated backend, not intercepted success replies. Scheme answer tests deliberately use labeled HTTP doubles; they do **not** establish live embeddings, model generation, retrieval quality or external official-page availability. The two screenshots are copied from the actual successful release run: [mobile home](screenshots/mobile-home.png), [officer audit modal](screenshots/mobile-officer-audit.png). Officer content is synthetic. Ignored Playwright artifacts remain local, not a deployed test service.

## Security review

| Check | Finding |
|---|---|
| Committed secrets | Heuristic scan of all reachable Git objects: **186 blobs, 184 text blobs, 0 findings** before the release commit. Patterns cover private keys, common provider tokens, literal JWTs and credentialed PostgreSQL URLs. This is not exhaustive secret detection. |
| Hardcoded demo passwords | Tracked source/config scan found **0 quoted-literal candidates**. Passwords are entered at runtime/operator configuration; test password is generated. Only example env files are tracked. |
| Invalid/expired JWT | Rejected in backend tests; trusted JWKS, allowed algorithms, issuer, audience and required claims validated |
| Citizen officer action | Backend rejects wrong role even if client state is changed |
| Cross-user/other-officer ticket | Ownership/assignment enforced; inaccessible tickets return 404 |
| Validation/atomicity | Pydantic validation, parameterized queries and transactional status/event writes tested |
| CORS | Explicit origin allowlist; no wildcard credential grant; four release preflight cases |
| Government filing | NOT_FILED by default; user reference remains explicitly unverified; internal RESOLVED is not official resolution |
| Citation fabrication | Stored official URLs plus local full-paragraph/chunk/URL checks; live accuracy/currentness not certified |
| Dependencies | npm audit reports 0; pip check reports compatible installed requirements. No full Python vulnerability audit or penetration test was performed. |

Remaining security/operational limits: public scheme calls have no rate limiter or cost quota; JWT logout does not instantly revoke already issued tokens at the offline API; production database policies/privileges have not been exercised; no verified deployment/monitoring/CI. Use controlled access until these are addressed. Frontend public Auth keys are not server secrets. No credentials were invented or committed to unblock tests.

## Dataset and known limitations

The repository has **8 actual curated schemes**, eight manually reviewed paraphrase notes, and eight current evidence chunks. Optional complaint fixtures contain exactly **10 synthetic records**. The live database scheme count is unknown because it is not connected. APY includes a labeled historical source; Punjab Ashirwad omits unreconciled old numeric benefit amounts; NMMSS's September 2026 deadline is explicitly past. Review dates and official source checks remain necessary; no eligibility guarantee is made.

Not implemented: personalized eligibility engine, general homepage AI/voice, complaint AI/semantic duplicate detection, automatic routing beyond the explicit demo pair, government integration, verified upload/GPS, notification/translation backend, persistent bookmarks, complaint edit/delete, mutation idempotency keys, CI/deployment automation. Existing deferred UI is labeled; working layouts/modals/assets remain. A lost mutation response can follow a successful commit. Python requirements use ranges rather than a resolved lockfile.

## Files modified in Phase 5

- `README.md`: actual architecture/stack, install/configuration, migrations/demo setup, endpoints, workflows/security, measured checks, limits and live demo steps; removed the unsupported rule-based eligibility claim.
- `apps/web/tests/release.spec.js`: independent authenticated browser contexts, shared real ticket status/audit persistence.
- `services/api/tests/test_cors.py`: four real application preflight cases.
- `docs/implementation-status.md`: current evidence/status table, replacing the stale untracked Phase 0 assessment at the user's requested path.
- `docs/phase-0-audit.md`: preserved original Phase 0 assessment as historical evidence, not current claims.
- `docs/release-review.md`: this measured release report.
- `docs/interview-notes.md`: twelve concise beginner-friendly explanations tied to the implementation.
- `docs/screenshots/mobile-home.png`, `docs/screenshots/mobile-officer-audit.png`: actual Chromium release-run captures.

No application source, database migration, dependency or CSS was changed in Phase 5. Earlier implementation commits remain on the release branch and are included when comparing it with the remote Phase 0 master.

## Remaining manual configuration and reproducible demo

1. Follow README installation; configure actual PostgreSQL/Supabase and model credentials in ignored backend env, and only public Auth/API values in web env. Use ES256/RS256 Auth signing keys. Restart servers after configuration changes.
2. Apply migrations 001 and 002; run `app.scripts.check_db`. The operator needs pgvector installation/schema privileges. Do not confuse process health with database readiness.
3. Set operator demo emails/passwords; run `app.scripts.setup_demo`. Copy its actual returned Arjun/R. Singh UUIDs into the explicit server assignment pair. Role is provisioned server-side. Missing assignment leaves new complaints unassigned; partial/invalid assignment fails closed. It does not retroactively assign old tickets.
4. Run corpus validation, real ingestion twice and the five-question evaluator. Enable `JANSEVA_LIVE_RAG=1` and run `services/api/tests/test_schemes_live.py`. Confirm actual vectors and rerun behavior; inspect answers/citations for relevance. These operations can incur model costs.
5. Start the normal API and Vite entrypoints. In a citizen browser profile log in as Arjun, load schemes, ask a grounded question and open the actual official citation. Confirm current source evidence rather than assuming a live application window.
6. Submit a complaint; retain the backend's UUID. Confirm My Requests/detail and refresh. In a separate browser profile sign in as R. Singh, find that assigned UUID, open audit/review and advance one allowed status with a note.
7. Refresh Arjun's tracking page and verify the same UUID, updated status, actor/note and timestamps. Sign out/in and refresh again. Verify anonymous POST, citizen officer PATCH and another citizen's detail are blocked. Keep internal status separate from government filing.
8. Record actual live results before declaring the fully verified MVP complete. Keep public deployment gated on abuse/cost controls and operational review.

## Git and review

A separate `release/phase-5-mvp-review` branch preserves the existing implementation commits. Changes are reviewed and committed with a scoped release-test/documentation message; no force push or automatic merge is authorized. The connected GitHub identity reports read-only repository access, while local Git's authenticated push dry run succeeds. Publishing/PR outcome is recorded in the final handoff; a draft is appropriate because live gates remain open.
