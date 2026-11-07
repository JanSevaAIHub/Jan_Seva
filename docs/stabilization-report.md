# JanSeva AI stabilization report

Audit date: 2026-11-08 (Asia/Calcutta).

## 1. Project status

Working branch: **`feature/combined-work`** in the separate `Jan_Seva-combined` worktree. Starting commit: `57d8b5b8168e2da254fdf2178dd0d76d1f85e3c7`. Local safety checkpoint: `checkpoint/combined-before-stabilization-20261108`, pointing to that starting commit. Repository remote was verified as `https://github.com/JanSevaAIHub/Jan_Seva.git`; the worktree was clean before this audit.

Original master `a382a665c9b9ba34d5deb7c48e37ff6a6521550c`, PR #1 `4d7e74351ee47350f6a84ee5352bf4357e2ebcf6`, and PR #2 `be3e8e3e2480257ac30bbed451b0a9c265f2c0ff` remain ancestors of the combined branch. PR #2 already includes PR #1. No unresolved merge is present. The original checkout and the separate `fix/full-project-bug-audit` branch are preserved. Applicable fixes from that existing audit were individually reproduced and carried into the combined branch without merging or moving the source branch. No `.env` file was copied, edited or staged. Existing backend configuration was inspected only to report whether required variables were populated; no credential values were printed.

Inspected React routing, context, API transport, login/session refresh, complaint form/review/package/tracking, My Requests, officer queue/detail, scheme search/chat/citations, notifications, navigation, responsive styles, backend routers/schemas/auth/configuration, database models/scripts/migrations, corpus/ingestion/retrieval/provider/answer validation, existing unit tests and browser fixtures, README and implementation/release/setup documents.

| Capability | Actual state |
|---|---|
| React navigation, complaint form and dashboards | Implemented; browser-tested against real local FastAPI and temporary SQLite |
| Password login/logout, token refresh | Supabase SDK implemented; browser tests use local signed-token Auth double, not hosted Supabase |
| First-login profile | Implemented server-side citizen provisioning; verified JWT required; cannot self-assign officer |
| Complaint create/list/detail | Implemented, UUID tracking, ownership enforced, persistent local integration tested |
| Officer status updates | Implemented, assignment-scoped, linear transitions, atomic event writes, compare-and-set concurrency |
| Filing-reference recording | Implemented as citizen-reported metadata; never evidence of verified government filing |
| Scheme listing | Real stored records; eight curated records exercised locally |
| RAG retrieval/generation | Implemented PostgreSQL/pgvector and server-side provider calls; safety contracts tested with explicit doubles |
| Public AI work limits | Implemented per process: 10 requests/client/minute, 30 total/minute, 2 active requests |
| Demo fixtures | Twenty labeled synthetic complaints; isolated idempotent seed tests pass |
| Self-service signup, complaint edit/delete, general chatbot/voice, personalized eligibility, uploads/GPS, government filing, notification/translation backend | Missing/deferred; no fake backend success substituted |
| Bookmarks | Browsing-session state only |
| Live PostgreSQL, Supabase, pgvector and OpenAI | Not verified in this audit; private worktree configuration absent |

## 2. Bugs found and fixed

Failures were reproduced before fixes. Browser tests intentionally delay real local responses to expose ordering bugs; provider fixtures never call a paid service.

| Severity | Root cause and affected function | Fix and modified source | Regression evidence |
|---|---|---|---|
| P1 | `AppProvider.refreshComplaints`: an older list snapshot overwrote newer detail/write state | Add complaint revision checks and reject obsolete-token refresh calls in `apps/web/src/context/AppContext.jsx` | Delayed queue response after independent API creation and detail retrieval no longer erases the ticket |
| P1 | `addComplaint`, detail and update functions treated same-user token rotation as an account switch, discarding a committed result | Separate identity changes from token changes in `AppContext.jsx`; retain token-specific protection for late 401 responses | Hold an actual successful POST, refresh the same user's SDK session, release the response; confirmation completes without a duplicate |
| P1 | Scheme conversation and late replies remained visible after switching accounts | Clear chat and advance a chat generation on identity change; ignore obsolete completions in `AppContext.jsx`; clear chat input in `pages/SchemeSearch.jsx` | Account-switch test verifies the old question/reply/input disappear and the new account can ask a question |
| P1 | PR #2 success banner kept a full saved complaint in component state after account switch, permitting its package to reopen | Reset confirmation on identity change and require matching session user ID in `pages/ComplaintForm.jsx`; clear old review state in `AppContext.jsx` | Citizen creates, switches to officer without navigation; previous confirmation and package button disappear |
| P1 | `addComplaint` relied on asynchronously rendered React state as its submission lock | Add an immediate ref lock, released in `finally`, in `AppContext.jsx` | Two synchronous confirmation clicks produced two POSTs before the fix; the test now requires exactly one |
| P1 | `select_evidence` accessed `.get()` on malformed provider output items, raising uncaught `AttributeError` instead of the defined fallback error | Normalize this parse failure to `ProviderError` in `services/api/app/ai/provider.py` | Three malformed output shapes failed before the fix; now handled as sanitized provider errors |
| P1 | Public `/schemes/ask` and vector-search GET requests admitted unlimited paid work | Add thread-safe bounded rolling-window and concurrent-work budget in `app/ai/budget.py`, enforced by `app/routers/schemes.py`; reject excess work with 429 and `Retry-After` | Excess request originally returned 200; now 429 without invoking answer generation; shared query/chat budget, untrusted forwarded header, expiry, global bound and release-on-error checks pass |
| P1 | `validate_schema` accepted a PostgreSQL category column too short for valid `streetlight` complaints | Validate reflected string types and minimum widths in `app/scripts/migrate.py`; retain existing additive migration 003 | Reflection double of the original VARCHAR(10) was accepted before the fix and is now rejected; migration order/transaction contract also checked |
| P2 | `schemeAnswer` silently dropped unsafe citations but retained the purportedly grounded factual answer | Reject invalid citation sets and citation-free grounded/fallback answers in `apps/web/src/lib/schemes.js` | Unit cases plus a browser HTTP double verify no unsupported answer is displayed and the question is kept |
| P2 | `complaintView` selected a same-status citizen filing-reference event as the officer note | Select status-transition notes in `apps/web/src/lib/complaints.js`; preserve every timeline event | Filing reference no longer replaces the displayed officer update |
| P2 | Existing modals neither contained keyboard focus nor supported Escape/return focus | Add shared `lib/useDialog.js`; integrate it into login, complaint review/package, officer review and scheme detail; add close-button labels | Keyboard-only sign-in and all existing modal dismissal workflows pass; pending operations remain protected from Escape dismissal |

Also correct the seed script's stale ten-fixture docstring to twenty. No runtime dependency was added and no UI redesign was performed.

## 3. Test results

Final backend run: **134 passed, 0 failed, 1 skipped**, one dependency deprecation warning. Final frontend unit run: **11 passed, 0 failed**. Final full Chromium run: **21 passed, 0 failed** (2.3 minutes). Category rows overlap; they are evidence groups rather than counts to sum.

| Test category | Passed | Failed | Skipped/blocked |
|---|---|---|---|
| Backend | 134 pytest cases | 0 | 1 live RAG test skipped |
| Frontend | 11 Node cases | 0 | No configured lint/type-check command |
| Browser E2E | 21 | 0 | Chromium only; hosted services not exercised |
| Authentication | 37 JWT/profile cases + 4 authorization cases | 0 | Hosted Supabase login/signup not tested |
| Complaint create/read/reference | 18 complaint suite cases, including officer coverage | 0 | Edit/delete not implemented |
| Officer workflow | 8 directly relevant complaint-suite cases, plus browser journeys | 0 | Real PostgreSQL concurrency not exercised |
| Database | 7 DB cases + 17 model/seed cases + 2 migration contract cases | 0 local | PostgreSQL/pgvector/RLS execution blocked |
| RAG/AI | 25 scheme cases + 9 provider boundary cases | 0 | 1 paid/live test skipped; no retrieval-quality claim |
| Security | JWT/authorization/CORS tests, 4 model-budget cases, secret/merge scan | 0 local | Historical password rotation requires its owner; no penetration-test certification |
| Production build | 2 builds; development-autofill exclusion check | 0 | Configured bundle-size advisory (616 kB minified) |

Commands actually executed, from the repository root unless a different directory is shown:

```powershell
.\.venv\Scripts\python.exe -m pip install -r services/api/requirements.txt
.\.venv\Scripts\python.exe -m pip check
.\.venv\Scripts\python.exe -m compileall -q services/api
$env:JANSEVA_LIVE_RAG = '0'
.\.venv\Scripts\python.exe -m pytest services/api/tests/test_stabilization.py -q
.\.venv\Scripts\python.exe -m pytest services/api/tests/test_ai_budget.py -q
.\.venv\Scripts\python.exe -m pytest -q --junitxml=.tmp/stabilization-pytest.xml
$env:PYTHONPATH = 'services/api'
.\.venv\Scripts\python.exe -m app.scripts.ingest_schemes --validate-only
.\.venv\Scripts\python.exe -m app.scripts.check_db
Set-Location apps/web
npm.cmd ci
npm.cmd run test:client
npm.cmd run test:e2e -- tests/audit.spec.js
npm.cmd run test:e2e -- tests/audit.spec.js --grep 'saved ticket confirmation'
npm.cmd run test:e2e -- tests/audit.spec.js --grep 'repeated confirmation'
npm.cmd run test:e2e
npm.cmd run build
npm.cmd audit --omit=dev
```

- Backend module-import walk and OpenAPI generation passed: all application modules import and nine API operations have unique IDs. Syntax compilation passed. No configured ESLint, TypeScript or Python lint command exists; those checks are **NOT CONFIGURED**, not passed.
- `pip check` found no broken requirements. `npm ci` reported zero vulnerabilities across its install audit; production-only npm audit also reported zero. Python vulnerability-database scanning was **NOT RUN**; dependency compatibility is a different claim.
- Corpus validation: eight records, zero failures, eight chunks. No embeddings were requested.
- `check_db` exited 1 with `DATABASE_URL is not configured`; this is a **BLOCKED live check**, not a passing DB integration test. The combined worktree has no backend `.env`; the original checkout's backend `.env` also has none of the required database/Auth/model configuration values populated. Only presence flags were emitted, never their values. No live migration/seed/role helper was run. Docker/PostgreSQL executables were not available on PATH for a disposable PostgreSQL run.
- Existing browser coverage executes the citizen create/list/refresh journey, an assigned officer update, and citizen follow-up with persistent audit history. It also uses independent browser contexts, validates protection/error states, and checks 320/375/1280-pixel layouts. Auth is a local signed-token double, storage is real temporary SQLite, and scheme answer/navigation cases explicitly identify their HTTP doubles.
- The final run's generated mobile home and officer-modal screenshots were visually inspected. Their content remains readable and within the viewport; automated page-overflow checks pass. Screenshots and traces remain ignored local test artifacts, not committed files.
- The added officer concurrency test synchronizes two real local API requests after reading the same version. Exactly one returns 200 and one 409; one status event is appended. Repeated identical create requests produce distinct UUIDs by design; server idempotency is still absent.
- A scoped current-source scan found no candidates for the checked provider-key/DB-password/hardcoded-password patterns and no tracked `.env` files. A history check reconfirmed PR #2's hardcoded-password revision; values were never printed. This is a heuristic, not a comprehensive secret audit.
- Early deliberate regression runs failed (four backend boundary cases, officer-note unit case, six browser regressions, citation-validation unit case, and unlimited-AI probe). After the first fixes, the full browser suite was 20 passed/1 failed and exposed the synchronous duplicate submission. These are real pre-fix results, not final passing claims.

## 4. Remaining risks

1. **Live services:** no fresh hosted Supabase Auth, actual PostgreSQL migrations/relationships/privileges, row-level-security enforcement, pgvector extension/vector compatibility, OpenAI generation, or deployment was verified. Test-double success must not be presented as live success. Migration 003 is covered by local contract tests, not PostgreSQL execution.
2. **Inherited credential:** PR #2's demo password remains in Git history because original history and PR branches must be preserved. If real, its owner must rotate it and inspect account activity before shared/live use. The current tip does not embed that password. No secret values appear in this report.
3. **Abuse and billing:** the new AI budget is bounded and thread-safe within one process, but resets on restart and is independent across workers/replicas. Configure shared authentication-aware quotas and billing ceilings before public use. NAT/proxy peers can share a client bucket; configure proxy trust explicitly. Application code does not trust arbitrary `X-Forwarded-For` headers.
4. **Duplicate/lost responses:** the UI blocks simultaneous confirmation clicks; the server does not support idempotency keys. A user retry after a lost committed response, another tab, or a direct API caller can create another ticket. Check My Requests before retrying an ambiguous submission. No automatic mutation retry was added.
5. **Bounded prototype scope:** complaint lists have no pagination, JWT validation does not instantly revoke provider sessions, and a trusted DB operator can modify data outside API rules. Audit events are appended by API code; no event edit/delete route is exposed. Actual database policy enforcement still requires live review.
6. **Tooling and product limits:** backend ranges remain unlocked; a Starlette/httpx deprecation warning remains; configured JavaScript has a bundle-size advisory. Chromium was tested; other browsers and a formal accessibility/contrast audit were not. Scheme source coverage is small, dated and not an eligibility decision. Deferred capabilities are listed above.

## 5. Next phase readiness

**CONDITIONALLY READY** for local feature development. The final local backend, frontend, build and browser regressions pass, with no known unresolved reproduced P0/P1 defect in the local baseline. External validation, inherited-credential handling and public-deployment controls remain explicit gates. This verdict does not certify a production release or fully working hosted AI integration.

## 6. Next implementation guidance

Continue on **`feature/combined-work`**, in `C:\Users\HP\OneDrive\Desktop\final_project\Jan_Seva-combined`. Do not reset or overwrite the original checkout. The stabilization commit containing this report identifies the baseline (`git log -1 --format=%H` after checkout/pull). The checkpoint preserves the pre-audit state.

For isolated development, install the existing requirements/lockfile and run the tests above; Playwright uses synthetic credentials and temporary storage. For actual application operation, privately configure `services/api/.env` and `apps/web/.env` using the examples, set only publishable values in `VITE_*`, and verify the same Supabase project on both sides. Never replace existing private files blindly.

In an explicitly authorized development database, run `app.scripts.migrate` (001 + additive 003), `app.scripts.migrate_schemes` (002), and `app.scripts.check_db`; confirm browser-role revocations/RLS. Provision demo accounts and configure their actual UUID assignment pair if using the demo officer journey. Validate corpus before paid ingestion; then run the opt-in live RAG evaluation with cost controls. Use separate citizen/officer identities. No production records need to be deleted or reset.

Only `feature/combined-work` is eligible for a normal push. No PR creation, master update, source PR update, force-push, reset or production write is part of this audit.
