# JanSeva AI final bug-fix and release report

This document records the initial repair before main-branch integration. See [main integration and push verification](MAIN-PUSH-VERIFICATION.md) for the latest combined code, tests and publication scope.
Date: **2026-11-19 (Asia/Calcutta)**. Branch: `feature/combined-work`; baseline `c4fa4dc`.

## A. Executive summary

**PARTIALLY VERIFIED.** The application has targeted repairs and passing local regression evidence: **243 backend tests passed, 14 client tests passed, 33 Chromium browser tests passed, and the production build passed.** One existing live RAG test is skipped. The requested Supabase project's public Auth settings and ES256 JWKS are reachable. All eight final curated source URLs return HTTP 200 at official destinations.

The baseline could not build because Home imported a deleted image. General chat, complaint analysis, personal eligibility and evidence persistence were missing. These paths are now implemented, together with safe complaint retries, internal officer routing, saved-event activity notifications and bounded queue loading. Existing design, routes, functionality and working-tree image deletions were preserved.

**This is not READY FOR DEMO.** Real PostgreSQL connectivity, hosted schema/pgvector/RLS state, authenticated Supabase journeys, model availability/quality and actual Supabase Storage persistence cannot be verified without the missing backend secrets and authorized test identities. The new migration has not been applied to a hosted project. Local SQLite, Auth/Storage doubles and provider fixtures are not represented as live integration success.

No commit, push, deployment, destructive Git command, database reset, hosted migration, seed or privileged role change was performed.

## B. Bug inventory

The detailed [bug audit](final-bug-audit.md) records J-01 through J-17 with severity, reproduction, cause, implementation and regression evidence. The material repairs are:

| Bugs | Result |
|---|---|
| J-01, build | Missing hero asset is optional; original deletions remain. Build and routes work. |
| J-02/J-03/J-09/J-11, assistants | Real read-only endpoints, structured advice, ordinary plural intent routing, bounded history, editable quick prompts, typing state, keyboard sending and preserved failure drafts. |
| J-04/J-13/J-16, evidence | Actual file selection and private upload architecture; ownership, size/MIME/content/pixel validation; worker-thread persistence; explicit metadata removal for JPEG/PNG/WebP; signed access and partial-failure recovery. |
| J-05, duplicate submission | Owner/key/payload-bound idempotency, unique constraints and atomic initial event. |
| J-06, eligibility | Independent deterministic screening and editable beneficiary profile, with missing-field explanations and no guarantee. |
| J-07, configuration | Supplied public project configured locally and verified publicly. Six missing server variables and management-account access remain blockers. |
| J-08, signup | Citizen signup and confirmation guidance; roles remain server-owned; browser demo-password autofill removed. |
| J-10, queues | Server pagination and clearly labelled 1,000-ticket UI bound. |
| J-12, citation link | PMJJBY source changed from failing www host to verified canonical host. |
| J-14/J-15/J-17, officer/activity/department | Assigned-officer internal category routing with an audit event, notifications from persisted accessible events, and correct category/department mapping. |

No reproducible P0/P1 **code defect** remains in the exercised local scenarios. P1 external configuration/integration gates remain open; this statement is not a certification of unexercised live behavior.

## C. Files changed

Material source changes, grouped for review:

- `services/api/app/ai/assistant.py`: read-only intent classification and validated complaint advice. `provider.py`: reuse the existing Responses REST integration with strict structured output and `store: false`. `scheme_schemas.py`/`rag.py`: bounded prior user questions for follow-ups. `eligibility.py`: conservative rules for the eight curated IDs. `budget.py`: shared AI feedback applies beyond scheme chat.
- `services/api/app/routers/agent.py`: scheme, complaint, mixed and clarification responses; successful mixed-request parts survive another tool's failure. `complaints.py`: citizen analysis, owner-only related-ticket suggestions, idempotent creation and pagination. `schemes.py`: eligibility and explicit keyword search alongside semantic retrieval. `officer.py`: assignment-scoped internal routing and persisted events. `evidence.py`: bounded binary upload, metadata and authorized access links.
- `services/api/app/storage.py`: private bucket checks, randomized server object names, verified image decoding/re-encoding, metadata removal, bounded image dimensions, short-lived signing, replacement cleanup and sanitized errors. Only Pillow was added to runtime dependencies.
- `services/api/app/models.py`: `complaint_submissions` and `complaint_evidence`. `migrations/20261118223800_complaint_evidence_and_submissions.sql`: additive tables, constraints, RLS/revoked browser grants, private bucket and restrictive API-only Storage policy. Generated with the Supabase CLI; **not applied remotely**. `scripts/migrate.py` applies this upgrade before schema validation only when an operator explicitly runs it.
- `services/api/app/main.py`: route registration and upload/idempotency CORS headers. `db.py`: reject recognized mismatched Supabase database projects. `scripts/check_db.py`: current schema wording. `scripts/verify_services.py` and `check_sources.py`: repeatable read-only probes.
- `apps/web/src/context/AppContext.jsx`: session drafts/history, guarded AI requests, account-change isolation, durable submission keys, photo-only retries, bounded queue loading, saved-event notifications and routing integration. `lib/api.js`: binary transport and appropriate timeouts. `lib/complaints.js`: event-derived activity, department labels and correct same-status timeline labels.
- New `AgentChat.jsx`, `EvidencePicker.jsx`, `EvidencePanel.jsx`, `EligibilityChecker.jsx`: functional assistant, evidence selection/access/retry, and screening controls. `LoginModal.jsx`: signup. `ComplaintReviewModal.jsx`: selected-photo review and disabled dismissal during save. `ComplaintFeedback.jsx`: honest queue bound. `TicketDetailModal.jsx`: evidence and internal routing.
- `Home.jsx`, `SchemeSearch.jsx`, `ComplaintForm.jsx`, `TrackStatus.jsx`, `Officer.jsx`, `NotificationsPage.jsx`, `Topbar.jsx`: connect those controls while retaining the existing layout/palette. Home's deleted-image import is optional; there is no generated replacement design.
- `data/schemes.csv`, `data/scheme_sources/pmjjby.txt`, `data/README.md`: canonical PMJJBY URL and provenance note. Existing source-summary currency limits remain.
- New `test_final_assistant.py`, `test_final_evidence.py`, `test_final_integrations.py`, `final-critical.spec.js`; expanded client, CORS and migration-order tests. `tests/e2e_server.py` contains explicit Auth/Storage doubles solely for tests. Existing tests were retained; the obsolete homepage assertion now verifies the implemented assistant, and migration ordering includes the additive upgrade.
- `.env.example`, `.gitignore`, `README.md`, `docs/api-contract.md`, this report, the audit and verification artifacts: current setup, contract, limits and evidence. Local `.env` files are ignored and not tracked. A `.vscode` directory that appeared during the session was left untouched.

## D. AI chatbot verification

| Location | Implemented route and observed result | Live status |
|---|---|---|
| Home Citizen AI Assistant | `/api/agent/message`: real local clarification, multiple turns, Enter/Shift+Enter, preserved draft/history across routes and retry after network failure. Validated citation rendering also tested with an explicit HTTP fixture. | LLM/embeddings blocked by missing configuration. |
| Scheme Discovery assistant | `/api/schemes/ask`: history, editable chips, safe citations, loading and failure recovery; source modal and official-link navigation pass. RAG paragraph/URL checks pass in isolated provider tests. | Actual pgvector retrieval/model answer blocked. |
| Complaint-page Citizen AI Assistant | Shared agent implementation and session state; complaint intent reaches the provider integration. Missing configuration returns a truthful retry state. | Real model response blocked. |
| Complaint Analyze with AI | `/api/complaints/analyze`: signed citizen access, strict response validation, editable category/draft, server department mapping and own-ticket similarity. | Fifteen fixture contracts pass; **classification accuracy was not measured against a real model**. |
| Eligibility | `/api/schemes/eligibility`: deterministic screening, independent of LLM; local database/browser tests pass. | Hosted records/schema not verified. |
| Other widgets | No independent floating chatbot implementation was found. Mobile uses these same tested components. | Voice remains clearly unavailable. |

The agent has no mutation tool and cannot submit a ticket or file externally. Unknown intent uses labelled clarification, not a fabricated provider answer. Missing/invalid/provider-timeout errors are sanitized. The pre-existing extractive scheme fallback remains explicitly labelled. The repository had no LangGraph implementation to repair; no unnecessary orchestration dependency was introduced.

## E. Photo-upload verification

The complaint workflow is selection, local preview, review, explicit confirmation, internal ticket creation, then evidence upload. Upload failure retains the successful ticket and selected file for a photo-only retry. Tracking and officer details load authorized metadata and request a fresh five-minute access link. One optional photograph is supported; replacement commits new metadata before deleting the previous object.

Security implemented: JWT and citizen ownership before reading bytes, streamed byte bound, JPEG/PNG/WebP content/MIME agreement, still-image and 20-megapixel bound, fresh randomized object path, path-safe display filename, decoded metadata removal, private-bucket validation, API-only metadata, assignment-scoped officer reads, sanitized errors, and cleanup on metadata failure. `EVIDENCE_MAX_BYTES` defaults to 5 MB; operators must align bucket limits if changing it. Modern secret API keys use `apikey`; legacy service-role JWTs also use Authorization, following [Supabase's API key guidance](https://supabase.com/docs/guides/getting-started/api-keys).

**24 dedicated backend evidence tests pass**, including three real image decoders, rejected/disguised/mismatched/empty/oversized content, missing/other-user/wrong-role authorization, private metadata/access, optional absence, replacement/retry deduplication, failed metadata commit cleanup, and Storage HTTP/private-bucket contracts. Metadata stripping passes separately for all three formats. Browser desktop/mobile selection, preview, remove/replace, upload, reload, denied unsigned access and partial-failure retry pass.

These tests use an explicit Storage service double. **Actual Supabase object persistence, permissions and signed download remain blocked.** Crash/ambiguous-network cleanup cannot be made atomic across PostgreSQL and Storage; safe cleanup failures log `EVIDENCE_ORPHAN_CLEANUP_REQUIRED` for reconciliation. A signed URL remains usable by someone possessing it until expiry, consistent with [private Storage access](https://supabase.com/docs/guides/storage/serving/downloads).

## F. Supabase verification

Requested project: `https://rmexxrdtqszlnsndcrpj.supabase.co`. Frontend and backend public URLs match. No previous backend URL existed, so no existing local project mismatch was found. The connected management account lists other projects, not this target; no credentials, data or migrations from those projects were used.

[Read-only service results](service-verification.json): Auth settings **200**, email authentication enabled; JWKS **200**, ES256 signing key advertised. JWT signature/issuer/audience/expiry/role safeguards pass locally with signed test tokens. These public probes do **not** establish successful signup/login, provider session restore or officer provisioning.

Exact missing backend variables:

```text
DATABASE_URL
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
LLM_MODEL
EMBEDDING_MODEL
EMBEDDING_DIMENSIONS
```

`app.scripts.check_db` exits 1 with `DATABASE_URL is not configured.` Therefore **SELECT 1 did not run successfully against the target**, and hosted table/index/constraint/migration/pgvector/RLS state remains unverified. Bucket existence, privacy, restrictive policy and object writes are likewise unverified. No credentials were invented or copied from another project. The rotated password was not available here and was not recovered from preserved history.

`.env` files are ignored and untracked. A scoped private-key/API-secret pattern scan found no matches in reviewable files. This is not comprehensive security certification. No live backend secrets were available to include in bundles. Browser configuration contains only the supplied public project values.

## G. Test results and commands

Final executed checks:

| Command, from repository root unless stated | Passed | Failed | Skipped | Scope |
|---|---:|---:|---:|---|
| `.\.venv\Scripts\python.exe -m pytest -q --junitxml=docs/backend-test-results.xml` | 243 | 0 | 1 | Full backend; 62.53 seconds. [JUnit evidence](backend-test-results.xml). |
| `npm.cmd --prefix apps/web run test:client` | 14 | 0 | 0 | Transport, citations, timeline/activity. |
| `npm.cmd --prefix apps/web run test:e2e -- --reporter=line` | 33 | 0 | 0 | Full Chromium suite; 6.5 minutes; real Vite/FastAPI, isolated DB/Auth/Storage. |
| `npm.cmd --prefix apps/web run build` | 1 build | 0 | 0 | Production bundle; advisory for approximately 635 kB JS chunk, 174 kB gzip. |
| `npm.cmd --prefix apps/web audit --json` | Completed | 0 findings | 0 | npm reported zero vulnerabilities, including dev dependencies. |
| `.\.venv\Scripts\python.exe -m pip check` | Completed | 0 broken requirements | 0 | Installed environment dependency consistency. |
| `git diff --check` | Completed | 0 whitespace errors | 0 | Git emits line-ending advisories only. |
| `python -m app.scripts.check_sources --output docs/source-url-verification.json` with `PYTHONPATH=services/api` | 8 URLs | 0 | 0 | Reachability/official destination, not fresh certification of every condition. |
| `python -m app.scripts.verify_services` with `PYTHONPATH=services/api` | 2 public probes | 0 public failures | 0 | DB/Storage/model gates reported blocked, not passed. |
| `python -m app.scripts.check_db` with `PYTHONPATH=services/api` | 0 | 1 prerequisite failure | 0 | Missing database URL; no hosted schema query. |

There are **eight blocked live acceptance groups**, not eight skipped test cases: PostgreSQL/schema/RLS, pgvector ingestion/retrieval, citizen signup/login/restore/logout, real provider scheme answers, real provider complaint classification, hosted photo write/reload/private access, real officer assignment/status/timeline, and live two-citizen access control. No pass count is assigned to these groups.

Minimum evaluation coverage is represented honestly: 18 deterministic eligibility cases; 25 existing scheme/RAG safety tests plus provider boundary tests; 15 complaint structured-output fixtures (not live accuracy); 10 duplicate pairs; 8 explicit intent cases plus failure/mixed tests; authorization matrices across Auth, complaints, evidence and routing; 24 dedicated evidence tests; and 33 browser tests covering critical interactions and journeys. Live AI evaluations remain blocked.

Intermediate failures were not hidden: baseline build failed on the missing asset; the migration-order test initially expected validation before the new upgrade; six new assistant tests caught plural “potholes” being treated as unknown; the first full browser run had **30 passed / 1 failed** because a new selector used “Scheme Discovery” instead of the actual “Find Schemes” link. All were corrected and rerun. An earlier exploratory browser run was interrupted during source editing after hot reload produced a transient context error; it is not counted as final evidence. The final full browser run had no failures. Pytest retains one upstream Starlette/httpx deprecation warning.

## H. Browser testing and artifacts

Tested Home, schemes, complaint creation, requests, tracking/details, officer queue/detail, activity notifications, signup/sign-in dialogs, review/package/source modals, unknown routes and browser history. Existing viewport checks cover **320, 375 and 1280 px**; new photo/mobile checks use **390 px**. No overflow or unexpected JavaScript page exception was observed in the exercised assertions. Expected simulated network errors/401/503 states and aborted decorative external-image requests are not counted as live provider success or unexpected application exceptions. There is no claim of exhaustive console-log capture or every possible device/browser.

| Requested workflow | Observed evidence |
|---|---|
| A, authentication | Signup confirmation, login, reload/restore, logout/expiry and role denial pass with Auth double. |
| B, schemes | Actual isolated database keyword search/filter/reset, deterministic screening, citation UI and official navigation. Semantic answers use explicit provider/HTTP fixtures. |
| C, assistant | Real local agent request/clarification, multiple turns, shared route history, input preservation, citation rendering fixture. Live model invocation blocked. |
| D/E, complaint with/without photo | Real complaint/event persistence, explicit confirmation, internal UUID, upload metadata, reload and optional absence; Storage double. |
| F, officer | Separate citizen/officer browser sessions, assigned queue, permitted status step, saved event; additional internal-routing/activity journey. |
| G, access control | Second signed test citizen receives 404 for another ticket/evidence/access link and 403 for officer mutation. Unsigned photo URL is denied by test Storage. |
| H, failures | Network/provider-configuration/storage failures preserve input or ticket and permit retry without a second complaint. |
| I, mobile | Photo selection/preview/removal/replacement/reload and critical route layouts pass. |
| J, fresh browser | New isolated contexts, guest navigation, login, reload and independent account sessions pass. |

Screenshots show **synthetic test data**, not a real uploaded citizen complaint or hosted Storage proof:

- [Mobile Home](screenshots/final/mobile-home.png)
- [Mobile complaint evidence](screenshots/final/mobile-evidence.png) — tiny generated test image, backed by the isolated Storage double.
- [Mobile officer audit](screenshots/final/mobile-officer-audit.png)

The normal `app.main:app` process was also started, stopped and restarted on a loopback test port without test hooks: health **200**, clarification **200**, configured-origin CORS preflight **200** on both runs. See [restart evidence](backend-process-verification.json). This checks process recovery, not hosted database durability. The final Playwright `.last-run.json` reports `passed` and no failed test IDs.

## I. Remaining blockers and safe next actions

1. Populate the six missing variables in ignored `services/api/.env` using credentials for the exact requested project. Use only the rotated database password, correctly encoded. Supply authorized citizen/officer account details through local environment configuration, not chat or frontend secrets.
2. Confirm target project access, its development status, backup/recovery arrangements and explicit migration approval. Review the additive migration and existing policies. No hosted migration is authorized merely by this report.
3. Run read-only probes and `SELECT 1`/schema checks. After approval, apply reviewed migrations; align bucket privacy/type/size restrictions and verify the restrictive Storage policy. Provision/assign only explicitly authorized test identities, never promote a user through user-controlled metadata.
4. Verify existing corpus/vector model/dimension compatibility; ingest only with development-data write approval. The historical `JANSEVA_LIVE_RAG` test performs ingestion and billable model work and must not be run against an unknown production database.
5. Run all live acceptance groups above, including actual photo upload/download/reload, two-citizen isolation and officer timeline persistence. Re-run failed gates after correcting configuration; only then reconsider readiness.

Other declared limitations: in-process rather than shared quotas; session-only draft/photo/read state; no immediate JWT revocation check; possible orphan-object reconciliation after crashes; no production load/security certification; no GPS/voice/translation/SLA implementation or external government filing. The named five-day plan was not present as a separate supplied file; the existing repository implementation, available plan/contract and explicit request guided the repairs.

## J. Final decision

**PARTIALLY VERIFIED.** Local implementation, regression/browser workflows, public Auth connectivity and production build are verified within the stated scopes. Missing secrets, unavailable authorized accounts and unapplied/unverified hosted schema/storage gates prevent **READY FOR DEMO**. All work remains uncommitted and reviewable.
