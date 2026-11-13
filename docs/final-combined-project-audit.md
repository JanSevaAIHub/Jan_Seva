# JanSeva AI final combined project audit

Audit date: **13 November 2026 (Asia/Kolkata)**. Workspace: `C:\Projects\JanSeva-Final`.

## Verdict

**LOCALLY VERIFIED — LIVE INTEGRATIONS PENDING**.

This is an audit of the existing combined application, not a rebuild. Local regression tests use isolated storage, signed local JWTs and explicitly identified provider/Auth doubles. They do not certify Supabase, PostgreSQL, pgvector, email delivery, external model quality or a hosted deployment. No production service, government account or live database was modified.

The original `JanSeva_AI_5_Day_Two_Developer_Implementation_Plan.pdf` was not found in the repository. Requirements were checked against the requested audit, README, API contract, architecture, implementation and deployment documents. Original PDF page-level acceptance criteria, original visual references and completeness relative to that specification remain **NOT VERIFIED**.

## A. Git integrity and scope

- Branch at audit start: `master`; audited starting commit: `b95f26038ceec11dfef775296f6b7a4807622921`.
- `git fetch origin master` succeeded. `git rev-list --left-right --count master...origin/master` returned `0 0` before changes. Remote: `https://github.com/JanSevaAIHub/Jan_Seva.git`.
- The combined merge has parents `c203940930684ed7d84713e0403eccdf92201214` and `3b545ee6e8173966188024248391bd9828aafed2`. Ancestry checks succeeded for Developer B's completion commit `c203940`, Developer A's `239e8a4`, `0fa1518`, `3dbfd62`, `167f982`, and retained commits `3b545ee`, `fb6df16`, `99b84b0`.
- Initial tracked/untracked working tree was clean; there were no unrelated local edits to preserve. Changes in the local audit commit are limited to the four fixes and regression coverage listed below, plus this report. Both developers' histories remain intact; the audit commit is a descendant of the combined merge.
- No nested `.git` directories, gitlinks or unresolved merge markers were found. No missing tracked source files were observed. The shared complaint analysis route remains a single route with both client contracts; `complaint_analysis.py` intentionally adapts the shared classifier rather than duplicating it.
- Ignore checks confirmed `.env`, nested environment files, `.venv`, `node_modules`, `dist`, test results and reports are excluded. Templates remain tracked. Inspection did not find embedded private credentials in frontend source. No secret values were printed.
- Only ignored local tools/build artifacts were generated: `.venv/`, `apps/web/node_modules/`, `apps/web/dist/`, `apps/web/test-results/`, Python caches and `.tmp/` verification XML. No old project directory was modified.
- The report records the starting SHA because its containing commit cannot embed its own hash. Obtain the final audit commit with `git log -1 --format=%H`. No push, reset, history rewrite or deployment was performed.

## B. Module status

| Module | Local evidence and findings | External limit |
| --- | --- | --- |
| React/Vite frontend | Unit contracts and production build pass. Browser coverage exercises navigation, mobile widths, dialogs, errors, retry, stale responses and form preservation. Existing navy/violet/teal/orange design retained. | Hosted SPA routes and real public configuration pending. |
| Authentication | Signed ES256/RS256 JWT checks, expiry/issuer/audience, role claims, first-login citizen provisioning and role escalation defenses covered. SDK signup/login/recovery/logout covered using isolated Auth. | Real Supabase project, JWKS, SMTP, confirmation and callback settings pending. |
| Scheme RAG | 12-scheme corpus/12 chunks validate; official URL checks, exact citations, abstention, filters, lexical fallback and injection quarantine covered. Ten stored-text retrieval questions executed. | Live vector similarity, provider evidence selection and real ingestion rerun not verified. |
| Eligibility | 67 cases across rule evaluation and evidence validation; only `POTENTIAL`, `NOT_MATCHED`, `NEEDS_INFO`. Missing/ranged profile data and unmodeled conditions remain uncertain. | Stored rule currency and administering-authority decisions are not certified. |
| Complaint AI | Existing keyword classifier and routing suggestions shared by form and agent. 15 classification samples and ten owner/locality-aware duplicate pairs executed. User text remains editable. | Heuristic scores are uncalibrated; no production accuracy claim. No generative complaint-writing provider is implemented; the editable proposal preserves supplied text. |
| Complaint lifecycle | Real FastAPI routes against isolated SQLite with signed JWTs test create/list/detail, atomic event persistence, ownership, status updates and filing metadata. | Actual PostgreSQL transactions/RLS/data persistence pending. |
| Officer dashboard | Assignment-scoped queue, category/status/locality filters, counters, category distribution, trends, details and citizen timeline tested locally. | Non-demo ticket assignment needs an approved operational workflow; see blockers. |
| LangGraph agent | 32 cases cover scheme/complaint/mixed/clarify, actual service adapters, read-only private tools, confirmation actions, evidence gates, injection and failures. Partial draft crash fixed. | Live intent model/provider calls not executed. |
| Database | Reviewed migrations 001–004, core ORM constraints and raw vector metadata access. Core runner applies 001/003/004; vector runner applies 002 separately. No migrations edited or executed. | Connectivity and pending migrations are **BLOCKED/UNKNOWN**, not assumed missing or applied. |
| Deployment | Dockerfile, Procfile, Render, Vercel, both Netlify files, templates and production guide reviewed; deployment configuration tests pass. Real app starts and `/api/health` responds. | Preflight fails on missing values; Docker runtime and hosted deployment not verified. |

Disabled routing automation, officer bulk duplicate review, SLA targets, notifications and translations are explicitly unavailable in the current prototype; they are not simulated as implemented. File upload is disabled, with no enabled upload endpoint to certify. These limitations were preserved rather than adding features.

### Endpoint and security review

| Actual method/path | Boundary and executed local coverage |
| --- | --- |
| `GET /api/health` | Public process health; 200 does not certify dependencies. |
| `GET /api/me` | Verified JWT; server-managed profile/role; new verified users become citizens. |
| `GET /api/schemes` | Public stored listing/search; bounded query/filters; only accepted official sources. |
| `POST /api/schemes/ask` | Public bounded model work; evidence/citation validation, abstention and labelled fallback. |
| `POST /api/schemes/eligibility` | Public validated profile and stored scheme ID; deterministic rules only. |
| `POST /api/complaints/analyze` | Citizen authentication; validation, shared response compatibility and owner-only related tickets. |
| `POST /api/complaints` | Citizen-only; server supplies owner/status/assignment; complaint and initial event commit together. |
| `GET /api/complaints` | Citizen ownership or officer assignment scope; optional status/category/locality filters. |
| `GET /api/complaints/{id}` | Scope check before detail/audit disclosure; inaccessible IDs return 404. |
| `GET /api/officer/complaints` | Officer-only assignment-scoped queue and filters. |
| `PATCH /api/officer/complaints/{id}` | Officer role and assignment; permitted next state only; compare-and-set protects concurrent updates; audit event is atomic. |
| `PATCH /api/complaints/{id}/official-ref` | Citizen owner only; reference/channel/date validation; old clients retain omitted metadata. Internal status is independent. |
| `POST /api/agent/message` | Optional verified identity; invalid bearer is rejected; private reads scoped; graph has no complaint-write tool. |

Executed auth cases include missing/malformed tokens, invalid signatures, unsupported algorithms, expired/future claims, wrong issuer/audience, missing claims, anonymous/service roles, citizen officer-access attempts, another citizen's ticket and another officer's assignment. There are 37 authentication and four authorization tests, plus workflow enforcement tests. Frontend 401 handling clears the matching expired session without replaying writes or signing out a newer account.

CORS tests cover exact allowed origins and rejected origins. SQL uses parameters; error responses omit validation input and database/provider details. Browser credentials are public Supabase keys only. Migration 001 enables RLS and revokes browser-role table access; live policy/privilege verification remains pending. No confirmed critical security vulnerability remains in the executed local scope. This is not a penetration-test or dependency-supply-chain certification.

## C. Reproduced bugs and fixes

### 1. P1 — Incomplete agent complaint drafts caused server errors

- **Reproduction:** POST `/api/agent/message` with `{"message":"Help with a road complaint","complaint":{"title":"X","description":"Fix"}}`. The agent request schema accepts this editable proposal; the analysis adapter raised an internal Pydantic validation exception.
- **Root cause:** The agent's partial-draft contract was passed into the stricter public analysis request schema, which requires a longer description/title.
- **Fix:** Validate internal proposals with the existing `ComplaintDraft` schema and reuse the same classifier. Public analysis and ticket-create validation remain strict; no text padding, rewriting, synthetic success or automatic persistence.
- **Files:** `services/api/app/ai/complaint_analysis.py`, `services/api/app/ai/complaint_classifier.py`, `services/api/tests/test_agent.py`.
- **Regression:** `test_incomplete_agent_drafts_remain_editable_without_server_error` (three payloads) verifies response, unchanged draft, confirmation and zero complaint writes. Failures reproduced before fix; focused tests passed afterward.

### 2. P1 — Officer status/locality filtering was unavailable in the dashboard

- **Reproduction:** Sign in as officer and open `/officer`: category/time selectors existed, but no status or locality controls were present despite API support and the requested queue workflow.
- **Root cause:** The queue's UI predicate included category and age only.
- **Fix:** Add accessible status/locality controls within the existing wrapping filter row and apply all filters to the shared queue used by rows, counters and charts. Authorization scope is unchanged.
- **Files:** `apps/web/src/pages/Officer.jsx`, `apps/web/tests/final-audit.spec.js`.
- **Regression:** `officer status and locality filters update the queue and counters together` creates a real isolated ticket, changes account, combines category/status/locality filters and checks empty/visible rows and counter consistency. Failed before fix on missing control; passed afterward.

### 3. P1 — Evaluation Markdown labelled unexecuted security checks PASS

- **Reproduction:** Inspect/run the authorized evaluation's report-generation path: JSON sets security outcomes to `None`, while Markdown unconditionally emitted `PASS`. It also asserted fixed low latency targets regardless of measured values.
- **Root cause:** Static Markdown labels and acceptance prose contradicted actual execution state.
- **Fix:** Derive each security label from its tri-state outcome; unexecuted checks say `NOT VERIFIED`. Remove unmeasured latency/availability and blanket completion claims. Retain the development-target guard; this audit did not run the database-writing evaluator against a live target.
- **Files:** `services/api/app/scripts/evaluate_complaints.py`, `services/api/tests/test_merge_integration.py`.
- **Regression:** Three cases in `test_security_report_labels_only_measured_results` exercise unverified/pass/fail. Passed after fix. Real JWT security evidence comes from pytest, not the planned report matrix.

### 4. P1 — Duplicate F1 calculation could reward entirely wrong predictions

- **Reproduction:** In the previous metric expression, `tp=0, fp=5, fn=5` gives zero precision/recall but takes the zero-denominator fallback and reports **100% F1**.
- **Root cause:** Undefined/zero harmonic means defaulted to 100 instead of zero.
- **Fix:** Calculate percentage precision/recall/F1 from observed counts with an explicit zero-score convention for undefined denominators.
- **Files:** `services/api/app/scripts/evaluate_complaints.py`, `services/api/tests/test_merge_integration.py`.
- **Regression:** Five count combinations cover perfect, entirely incorrect, no predicted positives, empty and partial outcomes in `test_duplicate_metrics_never_reward_zero_correct_predictions`. All passed in the final suite.

## D. Commands and measured verification

Commands use PowerShell from repository root unless a working directory is stated. `npm.cmd` avoids the machine's disabled `npm.ps1` execution policy. Global Python packages did not match project requirements, so a new ignored environment was installed.

```powershell
git status --short --branch
git fetch origin master
git rev-list --left-right --count master...origin/master
git log -12 --oneline
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r services/api/requirements.txt
npm.cmd --prefix apps/web ci
Set-Location apps/web
npx.cmd playwright install chromium
Set-Location ../..
$env:PYTHONPATH = 'services/api'
.\.venv\Scripts\python.exe -m pytest services/api/tests -q --tb=short -ra --junitxml=.tmp/backend-audit.xml
npm.cmd --prefix apps/web run test:client
npm.cmd --prefix apps/web run build
npm.cmd --prefix apps/web run test:e2e -- --reporter=line
.\.venv\Scripts\python.exe -m app.scripts.ingest_schemes --validate-only
.\.venv\Scripts\python.exe -m pip check
.\.venv\Scripts\python.exe -m compileall -q services/api/app
git diff --check
```

| Check | Current result |
| --- | --- |
| Complete backend suite | **361 passed, 0 failed, 1 skipped**, 79.44 seconds. Includes the five metric regression cases added after the first full run (356 passed, 1 skipped). |
| Frontend unit contracts | **57 passed, 0 failed, 0 skipped** after UI fix. |
| Full Chromium/Playwright suite | **54 passed, 0 failed, 0 skipped**, 6.3 minutes; includes the new filter regression. |
| Production Vite build | **PASS**, 1,650 modules; final generated JS approximately 427 kB / 122 kB gzip. Generic build success is distinct from the production environment gate. |
| Corpus validation | **12 records, 12 chunks, 0 failures**. |
| Eligibility suite | **67 passed** (`test_eligibility.py` and `test_eligibility_citations.py`). |
| Ten stored-text retrieval questions | **10 passed** in `test_ten_questions_retrieve_real_stored_sources`, included in full suite. Uses actual curated text stored in isolated SQLite, not live vectors. |
| Complaint classification | **15/15** category and department matches from actual `classify_text` predictions on retained fixtures; 100% on these fixtures only. |
| Duplicate pairs | **10/10**: five true positives, five true negatives, zero false positives/negatives using actual `find_duplicates` over isolated rows. Precision/recall/F1 100% on these fixtures only. |
| Agent | **32 passed** in the final full suite; includes partial drafts, mixed intent, prompt injection and no-write checks. |
| Authentication / authorization | **37 + 4 passed**, plus workflow-specific checks. |
| Dependency integrity | `pip check`: no broken requirements. `npm ci`: audited 101 packages, zero reported vulnerabilities. |
| Python compilation / whitespace | **PASS**. |
| Lint / static typing | No lint or typecheck commands/configured tools found; **NOT CONFIGURED**, not a passing check. |
| Docker build/runtime | Docker executable unavailable; **BLOCKED**. Static configuration tests passed. |

Focused commands also executed:

```powershell
.\.venv\Scripts\python.exe -m pytest services/api/tests/test_agent.py services/api/tests/test_merge_integration.py services/api/tests/test_rag_foundation.py -q --tb=short
.\.venv\Scripts\python.exe -m pytest services/api/tests/test_eligibility.py services/api/tests/test_eligibility_citations.py -q --tb=short --junitxml=.tmp/eligibility-audit.xml
npm.cmd --prefix apps/web run test:e2e -- --grep 'officer status and locality' --reporter=line
```

The first focused backend command passed 101 cases before the five metric cases were added. Red regression runs intentionally failed before their fixes; those are not hidden as passing checks. Early attempts during dependency installation could not import pytest/LangGraph yet; testing resumed after installation completed successfully.

### Explicitly blocked commands

```powershell
.\.venv\Scripts\python.exe -m app.scripts.check_configuration
.\.venv\Scripts\python.exe -m app.scripts.check_db
.\.venv\Scripts\python.exe -m app.scripts.evaluate_schemes
npm.cmd --prefix apps/web run check:deployment
```

- Backend configuration checker: **BLOCKED**, seven required variables absent.
- Database checker: **BLOCKED**, `DATABASE_URL` not configured; no connection or migration-state claim.
- Scheme evaluation: all five configured-service questions returned `execution: blocked` for missing database configuration. No live RAG percentage claimed.
- Frontend deployment checker: **BLOCKED**, all three required public variables absent.
- Opt-in live pytest skipped one test. That test includes ingestion writes; it was deliberately not enabled without target/backup/review/approval.
- Connected complaint evaluator was not authorized against a development database, so its live writes/latency run was not attempted. The retained 15/10 fixtures were executed safely through pytest instead.

An additional direct `TestClient(app)` smoke run without dependency overrides executed `/api/health` (200), `/api/me` (401), `/api/schemes` (sanitized configuration 503), `/api/officer/complaints` (401). This verifies process startup/fail-closed behavior with missing services, not normal live operation.

### Browser journeys and isolation

The Playwright server runs the real frontend and FastAPI routes with temporary SQLite, local signed JWTs, an isolated Supabase-compatible Auth double, a vector/catalog adapter and deterministic provider doubles. Some failure/timing tests intercept HTTP explicitly. Government navigation tests intercept the destination; they never submit a grievance. See `services/api/tests/e2e_server.py` and the individual browser test comments for these boundaries.

- **Journey A — PASS locally:** Homepage assistant → scheme tools → Scheme Discovery → local profile → eligibility → stored official citation/source navigation. Executed in `agent.spec.js` and `stability.spec.js`; external page content is not certified by navigation doubles.
- **Journey B — PASS locally:** Citizen login → editable analysis/duplicates → review → confirmed save → internal ID → My Requests, including failure/retry and refresh. Executed in `auth-citizen.spec.js`, `complaints.spec.js`, `merge-integration.spec.js`.
- **Journey C — PASS locally:** Citizen ticket → separate officer session → assigned queue → status/audit update → citizen refreshed timeline. Executed in `complaints.spec.js` and `release.spec.js`; approved demo assignment is configured only in the isolated fixture.
- **Journey D — PASS locally:** Mixed scheme/complaint request invokes both service paths, returns citations and a draft review action, with no complaint write until citizen confirmation. Executed in `agent.spec.js` and backend agent tests.

All 54 browser cases executed successfully, including 320/375/768/1280px coverage where specified by the tests. Generated mobile homepage and officer-dialog screenshots were also visually inspected: text, actions and the existing palette/layout remained usable. Live versions of these journeys remain pending.

## E. Official sources and filing boundaries

[CPGRAMS](https://pgportal.gov.in/) was read successfully during this audit and identifies its government grievance service. [Connect Punjab](https://connect.punjab.gov.in/) resolved in the web tool but yielded no readable text; its live login/filing workflow was not verified. The application uses fixed HTTPS links with separate-tab safety. Opening them creates no filing reference, acknowledgment or internal status change; local tests exercise that behavior.

Ten distinct corpus source URLs cover twelve records. Nine were readable in the web tool: [PM-KISAN](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2191651&lang=2&reg=48), [NMMSS](https://www.pib.gov.in/newsite/erelcontent.aspx?lang=2&reg=48&relid=294184), [PMSBY](https://financialservices.gov.in/pmsby), [APY](https://sansad.in/getFile/loksabhaquestions/annex/182/AU2081_we23z8.pdf?source=pqals), [SSY](https://www.pib.gov.in/PressNoteDetails.aspx?ModuleId=3&NoteId=157019&lang=1&reg=44), [PM Vishwakarma](https://www.pib.gov.in/PressNoteDetails.aspx?ModuleId=3&NoteId=159998&lang=1&reg=20), [Punjab Ashirwad](https://faridkot.nic.in/department-of-social-justice-empowerment-minorities/), [Ladakh pension source for three schemes](https://helphub.ladakh.gov.in/landing/pension), [PM-SYM](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2108082&lang=2&reg=3). The existing [PMJJBY source](https://www.financialservices.gov.in/pmjjby) timed out twice; current reachability remains unverified, not declared a broken link. This was a source identity/reachability review, not reapproval of every eligibility rule or current application deadline. Stored evidence is labelled reviewed paraphrase, and regional pension evidence does not establish nationwide eligibility.

## F. Exact remaining release blockers

1. **Configure the intended development backend privately:** `DATABASE_URL`, `SUPABASE_URL`, `EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS`, `OPENAI_API_KEY`, `LLM_MODEL`, `CORS_ORIGINS`. No actual target, credentials or public origins were supplied. The optional service-role key is not required for ordinary JWT verification.
2. **Configure the frontend:** `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`; confirm the same Supabase project on both sides. Production build gate must pass with actual approved HTTPS values.
3. **Establish database state read-only:** identify target/project/role; inspect core tables, RLS/revoked privileges, constraints, vector extension/schema/type, stored model/dimensions and migrations 001–004. There is no migration ledger; filenames do not prove application. Pending migration state is unknown. Before any required write, obtain target identification, backup evidence, migration review and separate execution approval.
4. **Verify real Auth:** asymmetric signing/JWKS, citizen signup/confirmation, SMTP delivery, refresh/logout, exact Site URL and callback/recovery allowlist. Re-run cross-user and officer authorization with real dedicated accounts.
5. **Verify actual complaint assignment and persistence:** normal new citizens' tickets are intentionally unassigned; only the explicit configured demo citizen/officer pair gets automatic assignment. Assignment-scoped officers cannot see arbitrary unassigned tickets. Supply an approved operational assignment process and run the real citizen → officer → citizen journey; this audit did not invent a default assignee or widen queue access.
6. **Verify live RAG/provider:** actual model availability and billing/quotas, embedding dimensions, reviewed corpus ingestion/idempotency and pgvector results. Re-run retrieval/citation and mixed-agent evaluation on the real development data. Existing local provider doubles do not satisfy this gate.
7. **Hosting verification after separate release approval:** actual frontend/backend origins, HTTPS, CORS, SPA deep links, Auth callbacks, container/provider runtime, health plus dependency smoke checks, backup/observability and shared abuse controls. In-process model quotas are not shared across workers. No public deployment was inferred from configuration files.
8. **Resolve evidence limits:** recheck PMJJBY source and Connect Punjab content/workflow, and supply the original implementation-plan PDF if original-spec acceptance certification is required.

The next release step is to configure and verify those external dependencies under the existing deployment runbook. This audit authorizes no push, hosting deployment, migration or production-data change.
