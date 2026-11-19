# JanSeva AI — final production readiness

Date: **14 November 2026, Asia/Kolkata**. Workspace: `C:\Projects\JanSeva-Final`.

## Verdict

**LOCALLY READY — LIVE VERIFICATION PENDING**.

Requested signup/profile fields, private evidence upload/view/removal, retry-safe complaint creation and explicit demo routing are implemented in the existing project. Upload and routing switches remain **off by default**. Local success does not satisfy the user's real-service acceptance gates. Supabase Auth/email, PostgreSQL persistence/restart, Storage/RLS, pgvector/provider and actual production-origin/hosting checks remain **BLOCKED**.

No service credentials, named development target, backup evidence or authorization for live migration/test-data/storage writes were supplied. These were requested during the audit. No live account, database record, bucket, policy, role or production service was created/modified. No migration was run; migration 004 is not presumed applied. No push or deployment occurred.

## Initial safety matrix and repository state

| Initial check | Result | Evidence |
| --- | --- | --- |
| Correct workspace / branch | PASS | Existing repository, `master`; no replacement directory. |
| Working tree before changes | PASS | Clean tracked/untracked tree; unrelated edits absent. |
| Remote comparison | PASS | Fresh `git fetch origin master`; local was one commit ahead, zero behind. |
| Starting local commit | PASS | `942f6cd96de39f224c80d3d62fcce3328a8b9569`; previous audit preserved. |
| Combined histories | PASS | Descendant of `b95f26038ceec11dfef775296f6b7a4807622921`; no reset/rewrite. |
| Backend baseline re-execution | LOCAL PASS | **361 passed, 1 skipped**, 32.56 seconds; historical counts were not assumed current. |
| Environment files / values | BLOCKED | Root `.env`, `services/api/.env`, `apps/web/.env` absent; no relevant configured process variables found. Values were never displayed. |
| Backend production preflight | BLOCKED | Seven mandatory settings absent. |
| Frontend production preflight | BLOCKED | Three mandatory public settings absent. |
| Named target / backup / write approval | BLOCKED | Not provided; affected live operations stopped. |
| Real Auth / database / AI connectivity | BLOCKED | No configured development services. |
| Existing evidence functionality | NOT IMPLEMENTED | Form offered a decorative sample preview; there was no persistent evidence model/endpoint. |
| New-citizen officer assignment | BLOCKED | Original assignment covered one configured citizen pair; other new users remained unassigned. |
| Docker runtime | BLOCKED | Docker executable unavailable. |

Existing migrations 001–004, profile/auth/session code, complaint lifecycle, tracking, officer scope and deployment contracts were inspected before extending them. Existing PostgreSQL foreign keys, RLS and server-managed roles were retained. The original implementation-plan PDF remains unavailable, as recorded in the previous audit.

## Feature acceptance matrix

Status vocabulary: **PASS** means actual required dependencies verified; **LOCAL PASS** means isolated tests only; **FAIL** means tested and broken; **BLOCKED** means missing configuration/access/approval; **NOT IMPLEMENTED** means absent.

| Feature | Status | Executed evidence / remaining acceptance requirement |
| --- | --- | --- |
| 1. Real signup and email confirmation | BLOCKED | Local signup form, metadata whitelist and confirmation-required UI pass. Actual Supabase account creation, inbox delivery, link confirmation and subsequent login not executed. |
| 2. Profile persistence in Supabase/PostgreSQL | BLOCKED | LOCAL PASS: authenticated `/me` provisioning and `PATCH /me` save only permitted display fields; independently opened SQLite session confirms persistence. Real Auth-user foreign key and PostgreSQL row not verified. |
| 3. Login, logout, refresh and recovery | BLOCKED | LOCAL PASS with real local signed JWTs and an isolated Auth double. Real JWKS, SMTP, callback allowlist, confirmation/recovery policy and provider session behavior pending. |
| 4. Complaint creation | LOCAL PASS | Existing request contract, ownership, review confirmation, initial state/event and retry key tested. Real PostgreSQL persistence pending. |
| 5. Image upload | LOCAL PASS | JPEG/PNG/WebP, content/MIME/size/count validation, previews, private storage adapter and pending/retry states tested; live Storage upload blocked. Off by default. |
| 6. Image retrieval / authorization / removal | LOCAL PASS | Owner/assigned-officer reads, anonymous/other-citizen/other-officer denial, owner-only deletion, expired token rejection and no-cache image responses tested. Real bucket/policy enforcement pending. |
| 7. Complaint tracking after relogin | LOCAL PASS | Browser logout/login, refresh and persistent local records; actual PostgreSQL plus backend restart gate blocked. |
| 8. Officer assignment | LOCAL PASS | Explicit server-configured default demo officer serves new citizens; original pair retained. Role/assignment validation and unrelated-ticket denial pass. Real designated officer configuration pending. |
| 9. Officer status updates | LOCAL PASS | Allowed progression, role/assignment guards and concurrent-update regressions pass. Real development journey pending. |
| 10. Audit history | LOCAL PASS | Initial and officer events, atomic rollback, timeline/notes and citizen refetch tests pass against isolated storage. |
| 11. Scheme retrieval | LOCAL PASS | 12-record/12-chunk corpus validates; ten stored-text retrieval questions and citation/fallback tests pass. Actual PostgreSQL/pgvector/model integration blocked. |
| 12. Eligibility | LOCAL PASS | 67 deterministic rule/citation cases pass; only POTENTIAL / NOT_MATCHED / NEEDS_INFO. Real stored scheme rows still require live verification. |
| 13. LangGraph agent | LOCAL PASS | 32 scenarios cover actual service adapters, citations, injection, mixed routing and confirmation-only actions; provider inference uses doubles/fallback locally. No LLM-written complaint draft is claimed. |
| 14. Production configuration | BLOCKED | Syntax/contract tests pass; actual backend/frontend preflights fail for missing variables. Generic build passes; a build with approved production values was not possible. |
| 15. Hosted frontend/backend | BLOCKED | Deployment files are prepared, not deployed. HTTPS, hosted routes/callbacks, CORS, runtime and health/dependency smoke checks pending. |

## Changes and verified defects

### Requested release additions

1. **Signup profile fields.** The existing form collects required name plus optional state/occupation. `citizenProfile` trims and validates a whitelist; role and identity metadata cannot be forwarded. Supabase carries these display fields through confirmation; after authenticated `/me` provisioning, the frontend persists them using `PATCH /me`. The API validates allowed fields, targets the verified user only and never accepts role/user-ID changes. Failed profile saves surface as retryable account-loading errors; a signup message is not proof of a profile write.
2. **Private complaint evidence.** The existing form now provides real file selection/preview; review shows the selected count and two-step save/upload behavior. Form, tracking and officer detail use shared evidence components. The API validates decoded image content, re-encodes pixels without EXIF/GPS/trailing content, uses safe UUID object paths, three reserved slots and 5 MiB limits. `PENDING` and `DELETE_PENDING` records survive partial failures honestly; retries target stable paths/keys. Only owner citizens upload/delete; owners and assigned officers read.
3. **Storage access enforcement.** A fixed dedicated private bucket is required. Before bytes are written/read/deleted, PostgreSQL catalog checks require the reviewed restrictive all-command PUBLIC policy for that bucket; the storage adapter independently refuses public/unverifiable buckets. Broad permissive policies cannot override the restrictive denial. Catalog tests are explicitly doubles, not live RLS evidence. The browser receives no storage credential/public URL.
4. **Demo assignment for new users.** `DEMO_ASSIGNMENT_ENABLED` and `DEMO_DEFAULT_OFFICER_USER_ID` opt into deterministic assignment of new tickets to an existing approved officer. Original pair behavior retains precedence. The code changes no officer role, grants no unrestricted queue, ignores no ownership checks and does not reassign historical records.

These are requested additions/completions, not features claimed to have passed real services before implementation. The smallest compatible persistent addition is migration **005**, documented below.

### Reproducible defects and fixes

| Severity | Reproduction / root cause | Fix and regression |
| --- | --- | --- |
| P1 | A complaint POST can commit, then its response can be lost. Previously retrying performed another distinct POST; the UI's in-flight guard could not resolve that ambiguity. | Optional citizen-scoped UUID submission key + unique DB constraint; stable browser key retained for the same draft. Lost-response browser regression verifies the same ID on retry; backend checks one ticket/initial event and rejects changed details for the same key. Old clients without keys remain compatible. |
| P1 | During evidence implementation, an account change while the upload's final metadata refetch was pending could allow its completion callback to clear the next account's form. | Invalidate the mounted account/ticket scope and recheck it after the awaited refetch. Browser regression delays that response, changes accounts, edits the new draft and verifies it survives. No account's image result is inserted into another account's state. |
| P2 | Deployment guide showed an unauthenticated `/complaints/analyze` smoke request expecting success, although the merged route requires a citizen token. | Corrected the documented request to include a bearer placeholder; runtime authentication remains strict. Existing anonymous-analysis tests still require 401. |

No real-service failure is labelled repaired without execution. Missing target/configuration and migration state are unresolved external blockers, not fake passing checks.

### Persistent schema and recovery

Migration `005_private_evidence_and_submission_keys.sql` adds:

- Nullable complaint submission key and per-citizen uniqueness.
- `complaint_evidence` with complaint/owner FKs, upload key, slot, state, content metadata/hash and creation time; count/state/size/extension constraints, RLS and revoked browser table access.
- Restrictive `storage.objects` policy for **`janseva-complaint-evidence`**. No bucket is created. Existing policies/rows and migrations 001–004 remain intact.

The core runner now applies 001/003/004/005 in one transaction and validates six application tables. Vector 002 remains separate. The migration-order regression was updated to require 005 before validation; security validation was not removed. Existing deployed code/database must be upgraded together under approval: this version cannot be certified against a schema missing 005.

**Applied evidence:** none available. **Pending evidence:** unknown for 001–004; new 005 was authored but not executed during this audit. No connection, catalog result, PostgreSQL version, RLS privilege result, object receipt, backup or real Auth-user row was invented.

Storage/SQL cannot commit atomically. Persisting a pending path before remote writes makes interrupted uploads recoverable. Read APIs refuse pending/deleting records. Deletion removes the object before metadata; failed removal remains tracked and retryable. Owners can remove incomplete attachments in tracking. Automatic retention/orphan cleanup for abandoned accounts is not implemented; operator retention policy and recovery review are required. See [private evidence setup and recovery](private-evidence-and-release-setup.md).

Images use authenticated API fetch rather than signed URLs. Every read checks JWT expiration and current authorization; there is no signed URL to expire. The required expiration behavior is exercised using an expired bearer token returning 401. Live direct-Storage denial must also be verified before enabling the feature. Browser blob URLs are revoked on disposal; downloaded content cannot be recalled from an authorized recipient.

## Tests actually executed

All commands below were run in this workspace. Python tests use the existing ignored `.venv`; `npm.cmd` avoids the machine's PowerShell script restriction. No live writes were enabled.

| Command | Result | Dependency scope |
| --- | --- | --- |
| `git fetch origin master`; `git rev-list --left-right --count master...origin/master` | PASS; initial `1 0` | Actual Git remote; no push. |
| `.\.venv\Scripts\python.exe -m pip install -r services/api/requirements.txt` | PASS; installed Pillow 13.0.0 | Actual package install; no application-service writes. |
| `.\.venv\Scripts\python.exe -m pytest services/api/tests -q --tb=short -ra` before edits | **361 passed, 1 skipped** | Isolated SQLite/local JWT/provider doubles; live RAG skipped. |
| `.\.venv\Scripts\python.exe -m pytest services/api/tests -q --tb=short -ra --junitxml=.tmp/production-backend.xml` final backend | **394 passed, 1 skipped**, 43.63 seconds | Real application routes and isolated data; no real Supabase/PostgreSQL/Storage/provider. |
| `npm.cmd --prefix apps/web run test:client` | **61 passed, 0 failed/skipped** | Node contracts including binary transport, profile whitelist and picker limits. |
| `npm.cmd --prefix apps/web run test:e2e -- --reporter=line` | **58 passed, 0 failed/skipped**, 3.9 minutes | Real React/FastAPI with isolated Auth, SQLite, storage and policy/catalog doubles. |
| `npm.cmd --prefix apps/web run build` | PASS; 1,652 modules; JS about 434 kB / 124 kB gzip | Actual Vite production compilation; no approved production values available. |
| `.\.venv\Scripts\python.exe -m app.scripts.ingest_schemes --validate-only` | **12 records / 12 chunks / 0 failures** | Actual curated files, no ingestion writes. |
| `.\.venv\Scripts\python.exe -m app.scripts.check_configuration` | BLOCKED, seven required names missing | Actual environment, syntax-only checker. |
| `.\.venv\Scripts\python.exe -m app.scripts.check_db` | BLOCKED: database URL absent | No database connection or migration claim. |
| `.\.venv\Scripts\python.exe -m app.scripts.check_evidence_storage` | BLOCKED: evidence not configured | No bucket/policy claim and no object writes. |
| `.\.venv\Scripts\python.exe -m app.scripts.evaluate_schemes` | **All five cases BLOCKED** by absent database configuration | Configured-service path attempted without substituting test data. |
| `npm.cmd --prefix apps/web run check:deployment` | BLOCKED, three public settings missing | Actual environment; not a passing deployment gate. |
| `.\.venv\Scripts\python.exe -m pip check` | PASS: no broken requirements | Installed Python dependency integrity, not a vulnerability certification. |
| `.\.venv\Scripts\python.exe -m compileall -q services/api/app`; `git diff --check` | PASS | Compilation/whitespace only. |
| Docker runtime/build | BLOCKED; executable absent | Deployment configurations inspected statically. |
| Lint/static typing | NOT IMPLEMENTED as configured repository commands | No fabricated lint/typecheck pass. |

Backend commands require `$env:PYTHONPATH = 'services/api'`, or the repository pytest configuration for pytest itself.

Focused commands executed while implementing:

```powershell
.\.venv\Scripts\python.exe -m pytest services/api/tests/test_evidence.py -q --tb=short
.\.venv\Scripts\python.exe -m pytest services/api/tests/test_release_workflows.py services/api/tests/test_evidence.py -q --tb=short
.\.venv\Scripts\python.exe -m pytest services/api/tests/test_evidence.py services/api/tests/test_release_workflows.py services/api/tests/test_stabilization.py services/api/tests/test_cors.py services/api/tests/test_deployment_configuration.py -q --tb=short
npm.cmd --prefix apps/web run test:e2e -- --grep 'new citizen signup|confirmation-required signup' --reporter=line
npm.cmd --prefix apps/web run test:e2e -- production-readiness.spec.js --reporter=line
```

Measured focused results: 14 initial evidence cases passed after fixing test IDs; 20 evidence/workflow cases passed; the later focused security/configuration group passed 63 cases. Two signup browser cases and the initial three new release journeys passed. The fourth release browser case adds the account-change completion regression to the final full run.

Failures encountered and resolved: the first evidence test run had 13 passes and two fixture errors because a 5 MiB parameter was expanded into an overlong Windows temporary-path ID; explicit short parameter IDs fixed the harness. One interim full backend run had **380 passed, 1 failed, 1 skipped**: the migration-order test still expected validation after three SQL files; it now asserts migration 005 and validation after all four. A subsequent interim backend run passed 384 cases before the final policy/configuration regressions brought the total to 394. None of these were live-service passes.

The final backend evidence includes **24 evidence cases**, six profile/idempotency/demo-workflow cases, 37 authentication cases, four authorization cases, six CORS cases, 16 deployment-configuration cases, 67 eligibility/citation cases, 32 agent cases, ten stored-text retrieval questions and the retained 15 classification / ten duplicate samples. Predictions are executed, not hardcoded metric values. Live vectors, classification generalization and model quality are not certified by these fixtures.

### Browser journeys

The complete browser suite exercises existing navigation, Auth/recovery, schemes/profile/eligibility, agent routing, review-confirm-save, tracking, filing references, officer updates and phone/tablet/desktop layouts. Added tests cover:

- Named citizen signup and stored profile fields, valid PNG selection/preview, a simulated storage failure, preserved draft, successful retry to the same ticket, refresh/relogin evidence persistence, another citizen's denial and assigned-officer image access.
- Actual isolated complaint commit followed by an intentionally lost response; retry carries the same submission key and returns the original ID.
- Unsupported picker types, removal and no page overflow at 320/768/1280px.
- Late prior-account evidence refetch cannot erase the current account's draft.

These are **LOCAL PASS**, not real Supabase acceptance. The fixture's storage and PostgreSQL policy/catalog behavior are explicitly replaced with doubles; neither byte storage nor catalog simulation certifies actual Supabase RLS.

## Deployment and security review

Reviewed `render.yaml`, Dockerfile, Procfile, Vercel, both Netlify files, environment templates and production/deployment guides. Render keeps auto-deployment off and adds evidence/demo flags defaulted off. No hosting command runs a migration, bucket setup, ingestion or test server. The frontend build gate requires approved public values; no private setting is embedded as a workaround. Existing provider/JWKS verification, role enforcement, parameterized SQL and complaint status lifecycle remain strict.

Migration 005/policy ownership and actual Storage permissions are unverified. Storage adapter failures are sanitized; images are bounded and decoded rather than trusted by filename. Evidence object paths are generated by the server, metadata contains no object credentials/path, every API operation scopes the ticket, expired JWTs fail and API image caching is disabled. Officer image reads follow assignment scope; mutation is owner-citizen only. Local policy gate rejects public buckets, permissive/missing/changed restrictions and mismatched formats.

The reviewed implementation follows [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control), [Pillow image verification](https://pillow.readthedocs.io/en/stable/reference/Image.html), and PostgreSQL's [restrictive policy semantics](https://www.postgresql.org/docs/current/sql-createpolicy.html). Those references inform the implementation; they do not establish live verification.

## Exact remaining blockers and required evidence

1. **Named development/test target and authorization:** project/environment identity, recoverable backup reference, approved test inboxes/officer and explicit permission for migrations, bucket setup, Auth test accounts and test-data writes. These are still absent. Do not substitute a production target or assume approval from elapsed time.
2. **Missing backend configuration:** `DATABASE_URL`, `SUPABASE_URL`, `CORS_ORIGINS`, `OPENAI_API_KEY`, `LLM_MODEL`, `EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS`.
3. **Missing frontend configuration:** `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` using the same real project and approved origins.
4. **Evidence enablement prerequisites:** server-only `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_EVIDENCE_BUCKET`, approved private bucket and restrictive policy, applied/verified 005 and deliberate `EVIDENCE_UPLOAD_ENABLED` setting. No bucket or live policy was created. Check direct browser Storage denial as well as API authorization before enabling release uploads.
5. **Officer routing prerequisites:** approved existing officer profile and deliberate `DEMO_ASSIGNMENT_ENABLED` / `DEMO_DEFAULT_OFFICER_USER_ID` configuration, or the preserved original pair. Verify a genuine new citizen → assigned officer → citizen event journey against PostgreSQL. Historical unassigned tickets need separately approved administration.
6. **Actual schema/connection evidence:** PostgreSQL version/TLS, 001–005 catalog state, keys/indexes/constraints, RLS/grants, transaction behavior, vector model/dimensions and preservation counts/backups. No live applied/pending state is available. Migration execution remains blocked.
7. **Actual Auth/email evidence:** two real citizen accounts plus authorized officer; confirmation, valid/invalid login, safe duplicate signup, logout/refresh/recovery and correct profile rows linked to real `auth.users`. Configure exact callback URLs and SMTP. A local Auth double does not fulfill this gate.
8. **Actual persistence and evidence journey:** complaint + atomic initial event, backend restart, refresh/relogin, cross-user denial, three image formats, storage outages/retries/deletion, direct Storage denial and expired-token reads on the approved live development project. Retain IDs/counts/status receipts without credentials or unrelated personal data.
9. **Live AI/provider and hosting:** approved vector ingestion/idempotency/provider evaluation and model cost authorization; actual production-origin build/preflight, HTTPS/CORS/callback smoke, hosting/container runtime, backups/observability and deployment-wide abuse quotas. None is assumed from configuration files.

Follow [the implementation-specific setup guide](private-evidence-and-release-setup.md) and the existing deployment approval gates. No separate migration, push or public release authorization is implied by this report.

## Changed files and Git delivery

Implementation commit: **`c0b71e6f8a44b2dab5e2e350eb8c6378e9dadbb8`** — `feat: add private complaint evidence and controlled demo workflows`. This report is delivered in a separate documentation commit so the implementation SHA is recorded without rewriting history. Final delivery state: `master`, three local commits ahead of the fetched `origin/master`, with a clean tracked/untracked working tree after the report commit. The earlier audit commit is preserved. No push, deployment or live migration was performed. All intended changes are enumerated here; no private environment or generated build/test files were staged.

- Configuration/documentation: `.env.example`, `README.md`, `render.yaml`, `docs/api-contract.md`, `docs/deployment-runbook.md`, `docs/production-deployment.md`, `docs/private-evidence-and-release-setup.md`, this report.
- Frontend: `apps/web/src/components/common/LoginModal.jsx`, `apps/web/src/components/complaints/ComplaintEvidence.jsx`, `apps/web/src/components/complaints/ComplaintReviewModal.jsx`, `apps/web/src/components/officer/TicketDetailModal.jsx`, `apps/web/src/context/AppContext.jsx`, `apps/web/src/lib/api.js`, `apps/web/src/lib/auth.js`, `apps/web/src/lib/evidence.js`, `apps/web/src/pages/ComplaintForm.jsx`, `apps/web/src/pages/TrackStatus.jsx`.
- Backend: `services/api/requirements.txt`, `services/api/app/config.py`, `services/api/app/main.py`, `services/api/app/models.py`, `services/api/app/schemas.py`, `services/api/app/evidence_storage.py`, `services/api/app/routers/complaints.py`, `services/api/app/routers/evidence.py`, `services/api/app/routers/profiles.py`, `services/api/app/scripts/check_configuration.py`, `services/api/app/scripts/check_db.py`, `services/api/app/scripts/check_evidence_storage.py`, `services/api/app/scripts/migrate.py`, `services/api/migrations/005_private_evidence_and_submission_keys.sql`.
- Tests: `apps/web/tests-unit/api.test.js`, `apps/web/tests-unit/auth.test.js`, `apps/web/tests-unit/evidence.test.js`, `apps/web/tests/auth-citizen.spec.js`, `apps/web/tests/production-readiness.spec.js`, `services/api/tests/e2e_server.py`, `services/api/tests/test_cors.py`, `services/api/tests/test_deployment_configuration.py`, `services/api/tests/test_evidence.py`, `services/api/tests/test_release_workflows.py`, `services/api/tests/test_stabilization.py`.

Ignored `.venv`, node dependencies, build outputs, caches, browser artifacts and `.tmp/production-backend.xml` remain local only. Both developers' Git histories and all unrelated files are preserved.
