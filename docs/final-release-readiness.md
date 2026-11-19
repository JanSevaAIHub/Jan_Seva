# Final release-readiness audit

Started 2026-11-10; final verification continued 2026-11-11 (Asia/Calcutta). Repository: `C:\Projects\JanSeva-Combined-Latest`. Branch: `master`; unchanged starting commit: `e71516fc8928a465f8b2c3131927057a308baf73`. Changes remain uncommitted for review. No merge, push, branch rename, history rewrite or live-data mutation was performed.

## Verdict

**READY FOR DEPLOYMENT CONFIGURATION**, under the final integration request's readiness definitions. Local code and configuration checks pass. Public deployment is not approved or verified: this checkout has no database, Supabase project, embedding configuration, model configuration or provider key. Migration 004 has not been executed against PostgreSQL; real signup/verification/recovery emails and hosted scheme/agent integrations remain unverified. See the current integration handoff below and the [deployment runbook](deployment-runbook.md). Historical audit results below are retained as evidence, not claims of live integration.

No reproduced application P0 authorization defect was found. Required local P1 changes are implemented. The complete browser suite passed 52/52; the final affected citizen checks also verify whitespace normalization without changing the visible draft. No known unresolved P0/P1 code defect remains in the exercised local journeys.

## Bugs found and fixed

| Bug | Priority | Root cause and reproduction | Fix / affected files | Verification |
|---|---|---|---|---|
| Citizens could not self-register | P1 | Citizen login offered only provisioned-account password sign-in | Existing LoginModal and AppContext now use Supabase signup without role metadata; server-owned citizen provisioning retained | Signup with/without required confirmation; authenticated profile and persistence journeys |
| No forgot/reset-password journey | P1 | No reset request, recovery dialog or callback routes; URL session detection disabled | SDK resetPasswordForEmail, PASSWORD_RECOVERY handling, updateUser and `/auth/reset`; confirmation callback route | Local provider callback, token-fragment cleanup, old password rejected and new password accepted |
| Complaint analysis unavailable to the agent; no shared description-aware analysis | P1 | Agent always returned unavailable; form used a title-only heuristic | Shared read-only deterministic keyword service and `/complaints/analyze`; optional editable suggestions, unchanged description, owner-only related suggestions; agent reuses it | 12 new analysis tests plus agent/browser regressions; outage still permits manual complaint save |
| Filing channel/submission date could not be recorded | P1 | Model/API/UI only supported reference number; extra fields rejected | Nullable fields, additive migration 004, owner-only validated atomic update and package/track UI | New metadata persistence, authorization, validation and legacy-client tests; browser portal handoff |
| Unsupported category silently saved as `other` | P1 | Public Transport option had no corresponding backend enum | Form now offers only existing supported categories | Confirmed save tests use backend category values; existing regression journeys |
| Text could include PostgreSQL-incompatible NUL; reference accepted control characters | P2 | Boundary strings lacked these validations; three complaint cases returned 201 in SQLite | Shared API text rejects NUL; reference rejects controls; invalid requests return 422 before writes | Three initially failing NUL cases and reference validation now pass |
| Guest dashboard mixed login notice with empty complaint list | P2 | No protected view wrapper for private list/detail routes | AccountRequired gates `/requests` and `/track` and retains the intended URL; backend scopes unchanged | Guest protection, login continuation and cross-user browser denial |
| Existing account-based tracking was hard to discover | P2 | My Requests naming and ID-first tracking entry | My Complaints navigation, direct detail links and a visible return to all saved records | Signup/create/logout/login/list/detail journey; existing officer updates and timeline tests |
| Review displayed unsupported department names | P2 | Hardcoded department labels unrelated to verified jurisdiction | Clearly labelled local authority suggestions; package requires jurisdiction confirmation | Review/package browser tests; no official routing claim |
| Empty message appeared during loading/error | P2 | Empty-state condition ignored request state | My Complaints suppresses empty-result message during loading/error | Existing loading/error/retry regressions |

Detailed initial reproduction inventory: [final-bug-inventory.md](final-bug-inventory.md). Existing complaint ownership, server role enforcement, review-before-save, durable listing, audit history and safe external links were reused rather than rebuilt. No scheme engine, officer workflow or UI architecture was replaced.

## Features verified

`PASS` means automated local verification using synthetic users, isolated storage and explicitly identified doubles. It does not mean a successful hosted service integration.

| Feature | Local status | Evidence / practical limit |
|---|---|---|
| Citizen signup | PASS | Actual Supabase SDK against isolated Auth double; both confirmation-required and immediate-session behavior; no role metadata |
| Login/logout | PASS | Credential validation, friendly invalid-login errors, existing accounts preserved and local session removal |
| Password reset | PASS | Request, recovery callback, authenticated password update, old/new credential checks and URL-fragment cleanup; email delivery NOT VERIFIED |
| Session restoration | PASS | Browser reload and logout/login persistence; identity changes clear private state |
| Complaint creation | PASS | Real FastAPI routes, signed local JWTs and isolated DB; explicit confirmation; failures retain draft |
| Automatic complaint tracking | PASS | Owned records load after login, direct details without typing ID, real audit events, persistence across logout/login |
| Government portal handoff | PASS | Complaint saved before package/portal button; separate tab, noopener/noreferrer; local navigation double; opening portal changes no filing status |
| Official reference persistence | PASS | Reference/channel/date saved and retrieved; future/invalid values rejected; user report remains unverified; internal status unchanged |
| Officer workflow | PASS | Backend-controlled role, assignment-only queue, permitted transitions and atomic event recording |
| Scheme search | PASS | Stored curated corpus, filters, reset, citations, loading/error/retry and stale-response guards; live pgvector/provider NOT VERIFIED |
| Eligibility engine | PASS | Existing deterministic rules, contradictions and NEEDS_INFO; no guaranteed approval |
| Complaint analysis / related suggestions | PASS | Clearly labelled keyword method; exact supplied description, editable category, own-record-only conservative related suggestions; no automatic merge/write |
| Agentic AI | PASS | Existing single LangGraph workflow reuses scheme/rule/complaint services; confirmation-only drafts, evidence checks and source-injection guards retained |
| Responsive/accessibility | PASS | Desktop/tablet/phone, keyboard focus, modal dismissal/restoration and existing navigation checks included |

Guest complaint drafts remain editable before login; saving and all private list/detail access require authentication. Complaint assistance is deterministic keyword analysis, not an LLM-generated factual rewrite or a measured classification-accuracy claim. Ambiguous/no keyword matches use `other`. The validated description is copied without rewriting; outer whitespace is normalized by the existing API boundary, while the visible form draft remains unchanged. Related complaints require the same locality/category and conservative word overlap over at most 50 of the verified owner's records; up to three suggestions are shown. Guest agent suggestions do not query private complaints. No government complaint/status API was called, and no CAPTCHA or authenticated government page was scraped.

## Measured test results

| Run | Passed | Failed | Skipped |
|---|---:|---:|---:|
| Initial backend baseline | 276 | 0 | 1 |
| Initial client baseline | 41 | 0 | 0 |
| Initial browser run during implementation | 44 | 1 | 0 |
| New filing tests before fix | 4 | 2 | 0 |
| New NUL complaint tests before fix | 3 | 3 | 0 |
| Complaint/agent/analysis focused suite after implementation | 65 | 0 | 0 |
| New citizen browser journeys after fixture corrections | 5 | 0 | 0 |
| Final backend suite | 298 | 0 | 1 |
| Final client suite | 47 | 0 | 0 |
| Browser full run before focus-fixture correction | 50 | 2 | 0 |
| Full browser suite after focus correction | 52 | 0 | 0 |
| Final affected citizen browser suite after whitespace fix | 7 | 0 | 0 |

Counts overlap; do not sum them. Final production build passed. `pip check`: no broken requirements. Corpus validation: 12 records / 12 chunks / 0 errors. Diff whitespace checks passed. No separate lint/typecheck scripts are configured in this JavaScript project.

Intermediate failures are retained here rather than hidden: the first browser run had a heading visibility failure while files were being changed; one backend run picked up the older migration-test expectation (293 passed / 1 failed / 1 skipped) before its additive-migration assertion was updated. A new browser run initially had 11 passed / 3 failed because the helper recognized only demo display names, the isolated server lacked PUT CORS before restart, and a new test used the wrong package button label. These fixtures were corrected while preserving their assertions. The later 50/2 run caught the old modal focus-order assumption and a delayed-response test timeout during a Windows connection-reset event and an unusually long execution pause. The final complete run passed all 52 cases, including both previously failing checks. No timeout was raised or failing test skipped to obtain passing results. The focus test now verifies the added Forgot-password control before requiring tab wrapping, Escape dismissal and opener focus restoration.

Security verification is included in the full passing backend/client suites: signed ES256/RS256 JWTs, expiry/signature/issuer/audience checks, no metadata role escalation, first-login citizen provisioning and duplicate-profile protection, owner/assignment scope, 404 for another citizen's complaint, citizen denial at officer routes, atomic status events, invalid transition rejection, request validation, CORS rejection for unrelated origins, bounded model requests and source-injection/citation rejection. The new browser persistence journey also authenticates a different citizen and requires a 404 for the first user's complaint. These tests do not certify hosted RLS, production quotas, mail delivery, operational monitoring or a live penetration test.

## Configuration and migration gates

1. Configure the existing ignored server `.env` and public frontend settings for an authorized development Supabase project. No real values were provided, generated, printed or committed here. Current presence checks for DATABASE_URL, SUPABASE_URL, embedding model/dimensions, OPENAI_API_KEY and LLM_MODEL all returned false.
2. Configure Supabase Site URL and allow the exact frontend `/auth/callback` and `/auth/reset` URLs. The static host must serve the SPA at those routes. Configure required email confirmation, SMTP, password policy and provider abuse controls. Test delivery, verification, recovery expiry and session behavior against real Supabase before a public release.
3. Apply migration 004 before deploying the new complaint model. It adds nullable channel/date columns and check constraints, preserves previous references and history, uses the existing transactional runner and does not reset/drop tables. Previous migration files remain unchanged. Actual PostgreSQL execution, rerun, RLS and rollback checks remain NOT VERIFIED in this environment.
4. Restore actual embedding/model configuration, run real ingestion twice and the opt-in live RAG evaluation. Local source files and stored-text fallback do not establish live cosine-retrieval quality.
5. Verify deployment-specific HTTPS/CORS, shared production quotas, backups and observability in the target environment; no authorization bypass or permissive CORS change was introduced to make tests pass.

Local database check exited 1: `DATABASE_URL is not configured`. The paid/live test remains skipped for that explicit configuration gate. No live migration or external Auth email was attempted.

## Commands

Commands executed from repository root:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m pytest services/api/tests/test_complaints.py services/api/tests/test_complaint_analysis.py services/api/tests/test_agent.py -q
npm.cmd --prefix apps/web run test:client
npm.cmd --prefix apps/web run test:e2e
npm.cmd --prefix apps/web run test:e2e -- auth-citizen.spec.js
npm.cmd --prefix apps/web run build
.\.venv\Scripts\python.exe -m pip check
$env:PYTHONPATH = 'services/api'
.\.venv\Scripts\python.exe -m app.scripts.check_db
.\.venv\Scripts\python.exe -m app.scripts.ingest_schemes --validate-only
git diff --check
git status --short --branch
```

After explicitly configuring an authorized development database, the **pending** migration command is:

```powershell
$env:PYTHONPATH = 'services/api'
.\.venv\Scripts\python.exe -m app.scripts.migrate
```

Run that before the new API version; it applies 001/003/004 within the existing transaction before schema validation. Migration 002 retains its existing separate setup. The old `{official_ref}` PATCH contract remains compatible and preserves optional channel/date when omitted; explicit null clears those optional values.

## Git and source safety

Current branch and HEAD remain unchanged. No staging, commit, push, merge, reset or branch deletion. Original untracked `docs/developer-a-prompt-1.md` retains SHA-256 `f5e9ec5567bfb10fd765b0058a7b26fd5f8c1e28cb696b952986a3afbed58b31`. Changed/new implementation files were scanned for private-key/provider-token/GitHub-token/AWS-key patterns and private `.env` paths; no findings. This pattern scan is not a guarantee against every possible credential format. Test passwords and identities are explicitly synthetic and confined to tests. The provider double and its user/password endpoints remain exclusively in `services/api/tests/e2e_server.py`, never registered in production app.main.

Modified areas: existing auth modal/context/Supabase setup and two callback routes; protected complaint views and clearer navigation; complaint package/tracking metadata; shared complaint-analysis service and read-only route/agent adapter; validated schemas/models and migration runner; additive migration 004; focused backend/client/browser tests; README, API contract and audit reports. Existing Developer A/B implementations and government/internal status separation are preserved.

References checked during implementation: [Supabase signup](https://supabase.com/docs/reference/javascript/auth-signup), [password recovery](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail), [password authentication](https://supabase.com/docs/guides/auth/passwords), [CPGRAMS](https://pgportal.gov.in/), [CPGRAMS status page](https://pgportal.gov.in/Status) and [Connect Punjab](https://connect.punjab.gov.in/). Portal links are a manual external handoff, not an authorized government-service integration.

## Repeated-request verification — 2026-11-11

The newly supplied attachment was byte-for-byte identical to the original final-audit request. Existing implementation changes were reviewed and preserved; no duplicate features or replacement architecture were introduced. The current complete working tree was verified again after the final whitespace fix:

| Fresh check | Actual result |
|---|---|
| Complete backend pytest suite | 298 passed, 0 failed, 1 live test skipped |
| Client tests | 47 passed, 0 failed, 0 skipped |
| Complete Chromium browser suite | 52 passed, 0 failed, 0 skipped; 5.9 minutes |
| Production build | Passed |
| Production JavaScript dependency audit | `npm.cmd --prefix apps/web audit --omit=dev --json`: 0 reported vulnerabilities |
| Corpus validation | 12 records, 12 chunks, 0 failures |
| Changed/new file secret-pattern scan | 36 paths scanned, no findings; not an exhaustive credential-format guarantee |
| Working-tree safety | No staged files; original untracked audit note unchanged |

No additional P0/P1 defect was confirmed in this follow-up review. Database, Supabase project, embedding configuration and AI-provider configuration presence checks still returned false. `check_db` again reported `DATABASE_URL is not configured`. The deployment verdict and live-service gates above therefore remain unchanged. Existing local PASS results must not be represented as live Supabase/email/PostgreSQL/provider verification. No commit, migration execution, merge or push was performed.

## Final integration, migration and deployment handoff — 2026-11-11

This section is the current handoff for the subsequent integration request. Its verdict uses that request's definitions: **READY FOR DEPLOYMENT CONFIGURATION**. No unresolved reproduced application P0/P1 blocker remains in the tested local implementation. Public deployment is not verified or approved; external configuration and live checks remain necessary. Signup, complaint tracking, UI architecture and the reviewed 12-scheme corpus were preserved.

### Actions performed in this task

- Inspected ignored environment-file locations without displaying values. None existed. The actual missing backend names are `DATABASE_URL`, `SUPABASE_URL`, `CORS_ORIGINS`, `EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS`, `OPENAI_API_KEY`, `LLM_MODEL`. Missing frontend names are `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. The service-role key is optional for privileged operator setup, not ordinary runtime JWT verification.
- Ran the existing read-only database checker: exit 1, `DATABASE_URL is not configured`. No project/organization was created or switched. No credential was invented and no real environment file was written or overwritten.
- Added `netlify.toml` for the existing Vite frontend and `render.yaml` for the existing API. No previous hosting configuration was found. Netlify has an asset-preserving SPA rewrite and public-environment gate. Render uses the correct `services/api` root, `app.main:app`, `$PORT`, health path and Python 3.12 family, with auto-deploy off and no migration/ingestion hook. These are prepared configurations, not evidence of hosting-provider deployment or validation.
- Added read-only backend/frontend configuration checks and an explicit `check:deployment` npm script. They report names/codes only, reject server secrets in browser variables, malformed origins, wildcard CORS, invalid dimensions, unsafe remote TLS settings and unsupported Supabase transaction-pooler configuration. A configuration PASS establishes syntax/placement only, not live connectivity or project identity. Placeholder templates remain safe and existing environment files are untouched.
- Found and reproduced a schema-validation defect: a conflicting text-type `official_submitted_on` passed the existing validator. Added one failing test, then a narrow Date-type check in the existing migration runner. It now stops for manual review, without changing data or migration SQL. All prior migration files, including 004, are unchanged by this task.
- Wrote [deployment-runbook.md](deployment-runbook.md) with numbered Supabase Dashboard, backup/target verification, catalog checks, before/after data fingerprints, migration, real Auth, complaint/AI and hosting instructions. The runbook uses actual existing script/variable names and no invented deployed URLs.
- Ran the complete regression suites and a real local Uvicorn startup from the proposed backend root. Health returned 200 with `{"status":"ok"}`; unauthenticated complaint access returned 401. This uses production app.main and does not establish hosted database/Auth integration.

### Database and Auth status

Database connection: **BLOCKED**. Live applied migrations, schema, role privileges, pgvector installation/dimensions and existing complaint rows: **NOT VERIFIED**. No configured database means the target cannot be identified and backup safety cannot be established. Accordingly, no migration, ingestion, schema mutation or complaint write was executed against PostgreSQL. Migration 004 may already exist remotely; that is unknown, not assumed either way. The local source set contains 001/002/003/004, with the existing core runner applying 001/003/004 transactionally and the vector runner handling 002 separately.

Data-preservation evidence is limited to local tests and absence of live writes. No claim is made that actual rows were counted or compared. Before any populated development migration, the operator must confirm target identity, a recoverable backup, no schema conflict and appropriate privileges; compare the runbook's before/after fingerprints in a quiet window. Stop for production, unknown target, missing backup or incompatible schema. Use only the existing runner after those gates pass.

Signup/confirmation/login/logout/recovery/session restoration, citizen provisioning and JWT/role checks pass with isolated Auth/storage. Real Supabase project settings, email delivery, actual JWKS and hosted profiles are **NOT VERIFIED**. No real registration email or password was sent to a provider. No server-owned role policy was weakened.

### AI status

Curated source validation passed: **12 records, 12 chunks, 0 failures**. The five real evaluation requests all reported **BLOCKED** due to missing `DATABASE_URL`; none executed live retrieval. No live embedding or generation request was made and existing embeddings were not overwritten. Stored-text fallback, evidence validation, deterministic eligibility, keyword complaint assistance and agent safeguards pass isolated tests. No accuracy, classification percentage or latency was invented.

### Final live integration checklist

Local PASS below means direct automated local evidence, including explicitly isolated provider/catalog/Auth doubles where noted. It is not a live-service result.

| Integration | Local tests | Real integration | Remaining action |
|---|---|---|---|
| Supabase authentication | PASS | NOT VERIFIED | Configure existing project, exact redirects, asymmetric keys and SMTP; test dedicated owned inboxes |
| PostgreSQL connection | BLOCKED | BLOCKED | Privately configure intended development DATABASE_URL and run existing checker |
| Migration 004 | PASS | BLOCKED | Confirm target/backup/catalog/privileges, then use existing runner and verify preserved rows |
| Citizen profiles | PASS | NOT VERIFIED | Verify real JWT-to-profile provisioning and retained citizen/officer roles |
| Complaint persistence | PASS | NOT VERIFIED | Run the real PostgreSQL logout/login and cross-user-denial journey |
| Official reference saving | PASS | NOT VERIFIED | Verify real owner-only reference/channel/date persistence and internal-status separation |
| Officer status workflow | PASS | NOT VERIFIED | Use approved test officer/assignment; verify atomic live events |
| Scheme retrieval | PASS | NOT VERIFIED | Inspect stored corpus/vectors and run real five-question evaluation |
| Embedding provider | PASS | NOT VERIFIED | Supply actual model/dimension/key; verify provider and vector schema without blind replacement |
| AI agent | PASS | NOT VERIFIED | Test actual configured scheme tools and provider-outage complaint behavior |
| Frontend hosting | PASS | NOT VERIFIED | Review prepared Netlify config, set public env, obtain approval and verify actual hosted routes |
| Backend hosting | PASS | NOT VERIFIED | Review prepared Render config, set secrets/CORS, obtain approval and verify hosted health/services |

### Exact final results

| Check | Passed | Failed | Skipped |
|---|---:|---:|---:|
| Complete backend suite after schema-conflict fix | 313 | 0 | 1 |
| Client suite, including deployment checks | 57 | 0 | 0 |
| Complete browser suite | 52 | 0 | 0 |
| Schema-conflict regression before fix | 0 | 1 | 0 |
| Schema-conflict regression after fix | 1 | 0 | 0 |

Counts overlap. The single skipped test is the explicitly opt-in live PostgreSQL/pgvector/provider test. An earlier full run before the extra Date regression passed 312 with 1 live skip. Production frontend build passed; `pip check` found no broken requirements; production JavaScript dependency audit reported 0 vulnerabilities. New TOML/start-command/credential-placement tests passed. Render/Netlify service-side configuration validation and hosted dependency installation are NOT VERIFIED. No lint/typecheck scripts are configured.

Backend and frontend deployment gates both returned BLOCKED with missing variable names only. The existing DB checker exited 1. All five live AI evaluations exited blocked, not passed. These are configuration blockers, not hidden test-suite failures. Neither the health endpoint nor a successful local bundle proves the app is publicly configured.

The secret scan covered 50 changed/new source and generated text assets, found no known credential/private-key patterns or private env paths, and printed no secret values. It is not a guarantee for every credential format. Hash comparison checked all 37 pre-existing modified/untracked files: only README, this report and the explicitly repaired migration validator changed within the authorized scope. No unexpected prior-work change occurred; the original audit note was preserved. Nothing is staged.

### Commands and remaining manual work

Executed: complete `pytest -q`, client tests, complete Playwright tests, production build, `pip check`, production `npm audit --omit=dev --json`, both read-only deployment gates, existing DB checker, corpus validate-only, existing five-question evaluation, local Uvicorn health/401 smoke and `git diff --check`. No paid/live test was enabled. See the runbook for exact shell commands and numbered dashboard instructions.

Next manual steps, in order: (1) identify the existing development project; (2) privately configure the listed env names; (3) confirm backup/recovery, privileges and live catalog state; (4) apply/verify the existing migrations only if needed and authorized; (5) configure Auth redirects/signing/email and run real synthetic-user/complaint journeys; (6) inspect vectors and run authorized live AI checks; (7) review hosting settings and obtain explicit approval before any public deployment. No private credentials should be pasted into chat.

Deployment status: frontend and backend configuration prepared only. No host, Supabase project, database or production resource was provisioned or deployed. Any pre-existing remote hosting remains unknown. Current branch `master`, HEAD `e71516fc8928a465f8b2c3131927057a308baf73`; no commit, push, merge, reset or branch deletion.

Files added by this task: `netlify.toml`, `render.yaml`, `services/api/.python-version`, `apps/web/scripts/check-deployment.mjs`, `apps/web/tests-unit/deployment.test.js`, `services/api/app/scripts/check_configuration.py`, `services/api/tests/test_deployment_configuration.py`, `docs/deployment-runbook.md`. Updated by this task: `.env.example`, `apps/web/.env.example`, `apps/web/package.json`, `services/api/app/scripts/migrate.py`, `README.md`, this report. An ignored `.tmp/integration-preservation-start.json` stores only prior-path hashes for preservation checking; it is not a deployment asset or credential file. The full current working-tree inventory below also includes earlier uncommitted fixes.

### Current Git inventory

Modified tracked files (includes preserved earlier fixes):

```text
.env.example
README.md
apps/web/.env.example
apps/web/package.json
apps/web/src/App.jsx
apps/web/src/components/common/LoginModal.jsx
apps/web/src/components/complaints/ComplaintPackageModal.jsx
apps/web/src/components/layout/Sidebar.jsx
apps/web/src/components/layout/Topbar.jsx
apps/web/src/context/AppContext.jsx
apps/web/src/lib/complaints.js
apps/web/src/lib/supabase.js
apps/web/src/pages/ComplaintForm.jsx
apps/web/src/pages/MyRequests.jsx
apps/web/src/pages/TrackStatus.jsx
apps/web/tests/agent.spec.js
apps/web/tests/audit.spec.js
apps/web/tests/helpers/auth.js
docs/api-contract.md
services/api/app/ai/agent.py
services/api/app/ai/agent_tools.py
services/api/app/models.py
services/api/app/routers/complaints.py
services/api/app/schemas.py
services/api/app/scripts/migrate.py
services/api/tests/e2e_server.py
services/api/tests/test_agent.py
services/api/tests/test_complaints.py
services/api/tests/test_stabilization.py
```

Untracked files (includes preserved earlier work):

```text
apps/web/scripts/check-deployment.mjs
apps/web/src/components/common/AccountRequired.jsx
apps/web/src/lib/auth.js
apps/web/src/pages/AuthReturn.jsx
apps/web/tests-unit/auth.test.js
apps/web/tests-unit/deployment.test.js
apps/web/tests/auth-citizen.spec.js
docs/deployment-runbook.md
docs/developer-a-prompt-1.md
docs/final-bug-inventory.md
docs/final-release-readiness.md
netlify.toml
render.yaml
services/api/.python-version
services/api/app/ai/complaint_analysis.py
services/api/app/scripts/check_configuration.py
services/api/migrations/004_official_filing_metadata.sql
services/api/tests/test_complaint_analysis.py
services/api/tests/test_deployment_configuration.py
```
