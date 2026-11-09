# Developer A — Day 1 Phase 2: eligibility and Scheme Navigator

Reviewed 2026-11-09 (Asia/Calcutta). The existing Scheme Discovery screen now supports the complete local search/profile/eligibility/evidence workflow. Hosted Supabase/PostgreSQL/provider checks remain unverified. No Phase 3 work was started.

## Baseline and scope

Continued in `C:\Projects\JanSeva-Combined-Latest` on `developer-a/final-ai`, after Phase 1 commit `167f9829ef8e8154e884c7af982d3c4afbe38315`. Preserved and completed the already uncommitted eligibility module, route, tests and related documentation. The older untracked `docs/developer-a-prompt-1.md` remains separate. No reset, pull, merge, live ingestion or schema migration was performed.

Task 0 inspected Phase 1 retrieval/ingestion, structured rules, the existing evaluator/route, SchemeSearch, scheme details, AppContext, shared API client, styling and test tooling. The targeted baseline was **109 passed**: 69 Phase 1 scheme/corpus/RAG checks plus 40 existing eligibility checks. Search/chat already used the API; missing connections were editable eligibility profiles, an eligibility action/result UI and an evidence drawer. No repository AGENTS.md or design PDF was present. The current layout and supplied palette were used; exact PDF-page comparison remains unavailable.

## Features completed

- The existing three-column discovery layout, navigation, cards and details dialog are retained. Navy sidebar `#171A45`, violet primary `#6552CE`, teal `#00A8A0` and orange warning accent `#F58B30` are applied. The existing white mobile bottom navigation remains responsive.
- Keyword search, state/category filters, reset, saved/reviewed tabs, actual metadata/cards/details, official sources and verified application portals are connected. Plain listing requests up to the existing bounded limit of 50 so the 12-record corpus is available; query retrieval still obeys Phase 1's five-passage bound. No recommendations or government statistics are fabricated.
- Search invalidation starts on query/filter change, including the debounce interval and invalid short queries. Loading, no-results, error and retry states are visible. Older responses cannot replace newer results.
- The profile editor accepts optional exact/ranged age, state, occupation, distinct INR monthly/annual income and documented scheme-specific conditions. Unknown is separate from No, and zero is retained. Input bounds, finite numbers and ordered ranges are validated in both frontend and backend. No Aadhaar numbers, documents or precise addresses are requested.
- There is no profile-write API. Edits stay in React provider memory for the current tab, survive in-app navigation and clear on reload/account change. The UI states this explicitly and never claims Supabase persistence. Profile edits invalidate prior and pending eligibility results. Cancel leaves the previous applied profile unchanged.
- Cards show actual names, category/department, coverage, supported document records, source/review date, application link where verified, current assessment state and an explanation after checking. Details distinguish published conditions from matched conditions and unresolved information. No assessment is labelled approval.
- The existing `/schemes/ask` integration now uses the shared authenticated transport when signed in, with the same transport's public wrapper for guests. It sends only supported state/occupation context to the assistant. Typed questions survive failures; answers, cited scheme names, evidence buttons, loading and meaningful errors are displayed. Eligibility is never inferred by that assistant.
- The source-evidence drawer displays actual API excerpts, associated scheme, review date and official URL. Exact stored evidence and scheme/source identity are checked for eligibility replies before results are displayed. Invalid citations cause an error, never an unsupported assessment. Application links use the stored verified allowlist.
- Existing dialog focus containment/Escape/return-focus behavior is reused, including a drawer stacked above scheme details. Profile editing restores focus after use/cancel. Mobile input sizing was fixed without hiding horizontal overflow.

## Eligibility architecture and contract

`POST /api/schemes/eligibility` uses the existing database session and stored Scheme JSON rules. It is public/read-only like scheme listing; a signed-in browser uses the existing bearer client. No LLM, embedding call or profile write is part of eligibility. Scheme UUID, status, matched rules, missing fields, reasons and citations retain their existing response names/types.

Exactly three statuses are returned:

- `POTENTIAL`: all applicable known conditions pass and no unresolved source conditions remain. This is not official approval or guaranteed eligibility.
- `NOT_MATCHED`: an applicable known condition is contradicted, even when other required information is missing.
- `NEEDS_INFO`: missing/ambiguous information, unmodeled conditions or insufficient/unsafe evidence prevents a determination without a confirmed contradiction. A regional coverage mismatch remains a source-coverage abstention, not a fabricated nationwide exclusion.

Optional `age_range`, `monthly_income_range` and `annual_income_range` use inclusive `{min,max}` bounds. The entire range must satisfy a rule to match. Wholly contradictory ranges fail; crossing a threshold requests more precision. No midpoint or monthly/annual conversion is guessed. Supplying an exact value and its range simultaneously, reversed ranges, wrong types or invalid bounds returns 422.

Matched-rule descriptions are now readable sentences. Each citation contains an exact stored supporting passage; multiple distinct passages can produce separate citations for one scheme. Invalid title/source/review metadata or unsupported rule evidence produces abstention. Complex original scheme conditions remain explicitly unresolved rather than guessed. The [API contract](api-contract.md#ranges-and-scheme-navigator-integration) documents field semantics, error codes and persistence limits.

[Captured local API examples](phase-2-eligibility-examples.json) contain complete actual HTTP responses from the E2E server:

| Stored PMSBY profile | HTTP | Result |
|---|---:|---|
| Age 22, participating account and auto-debit consent confirmed | 200 | `POTENTIAL` with exact source evidence |
| Age 17, same account/consent conditions | 200 | `NOT_MATCHED` with age explanation |
| Age range 16–20, same account/consent conditions | 200 | `NEEDS_INFO`, more precise age required |
| Empty profile | 200 | `NEEDS_INFO`, age/account/consent missing |

## Verification

| Check | Passed | Failed | Skipped |
|---|---:|---:|---:|
| Task 0 targeted baseline | 109 | 0 | 0 |
| Final backend suite | 245 | 0 | 1 |
| Eligibility file, included above | 52 | 0 | 0 |
| Eligibility citation/evidence file, included above | 15 | 0 | 0 |
| Final frontend client suite | 35 | 0 | 0 |
| Frontend invalid eligibility-citation cases, included above | 12 | 0 | 0 |
| Full Chromium suite | 36 | 0 | 0 |
| New Scheme Navigator browser file, included above | 15 | 0 | 0 |
| Post-visual-review responsive/modal rerun | 5 | 0 | 0 |

Production Vite build passed. Corpus validate-only: 12 records, 0 failures, 12 chunks. Git whitespace checks passed. Typecheck and lint scripts/configuration are **not configured** in this JavaScript/Vite repository; these are not claimed as passing checks. One inherited Starlette/httpx deprecation warning remains. Counts overlap and should not be summed.

Eligibility coverage includes exact/ranged age and income boundaries, matching/multiple conditions, contradictions with other missing fields, region coverage, unknown/missing state/occupation/income, free-text occupation limits, invalid profiles/ranges/IDs, missing schemes, invalid rules and database configuration failure. The 15 backend evidence cases include unsafe HTTP/hosts/credentials/fragments, invalid/missing review date, blank title, absent/changed evidence, changed source URL, incorrect evidence kind, unsupported version/configuration and valid exact stored identity/excerpts. The 12 frontend invalid-citation cases additionally check mismatched scheme, changed official URL/date, empty excerpt and unsupported excerpt. Source-free matched claims and inconsistent potential replies are rejected.

Browser coverage verifies search, state/category/reset, real cards/details/application/source metadata, profile editing and ranges, real eligibility responses, missing fields, source drawers, signed-in bearer requests, account clearing, navigation/reload, stale search and stale eligibility results, loading, empty/error/retry/chat draft retention, keyboard focus and 320/375/768/1280px layouts. Retained complaint, officer, auth/session, navigation and modal browser regressions pass. Screenshots from the responsive tests are ignored local artifacts and were visually reviewed. Visual review also caught a wrapped mobile Close label; footer sizing and paragraph spacing were corrected, followed by five passing responsive/modal checks and another successful build.

The test-first backend run reproduced **9 failures/58 passes** for range support and blank citation titles, then all 67 cases passed. The initial new client test failed before its profile module existed. Browser tests reproduced inaccessible selector names, duplicated dialog status and a real 320px search-input overflow. All are fixed; the earlier desktop-colour assertions were corrected to respect the existing white mobile navigation. No test was skipped or weakened to conceal a reproduced defect.

Final commands, run from repository root:

```powershell
.\.venv\Scripts\python.exe -m pytest services/api/tests/test_rag_foundation.py services/api/tests/test_schemes.py services/api/tests/test_corpus_validation.py services/api/tests/test_eligibility.py -q
.\.venv\Scripts\python.exe -m pytest services/api/tests/test_eligibility.py services/api/tests/test_eligibility_citations.py -q
.\.venv\Scripts\python.exe -m pytest -q
npm.cmd --prefix apps/web run test:client
npm.cmd --prefix apps/web run test:e2e
npm.cmd --prefix apps/web run build
$env:PYTHONPATH = 'services/api'
.\.venv\Scripts\python.exe -m app.scripts.ingest_schemes --validate-only
git diff --check
git diff --cached --check
```

## Local integration boundaries and remaining limitations

The actual FastAPI routes, reviewed schemes, persisted rows and deterministic eligibility engine are exercised using isolated SQLite. The test-only server now also stores real curated chunks. It explicitly bypasses the PostgreSQL catalog guard and disables provider keys/models, causing the real retrieval function to use stored-text lexical fallback and labelled extractive answers. No fake vectors or synthetic schemes are generated. Timing/failure tests use labelled HTTP doubles. These checks are actual local API/UI integration, not hosted pgvector, Supabase Auth or model evidence. Auth still uses the existing signed-token provider double.

Live database/provider configuration remains absent. The live RAG test is skipped; no live ingestion, schema migration, Supabase profile write or government submission was run. Before a hosted demo, safely configure and verify the existing PostgreSQL migrations/ingestion and provider access, then rerun hosted integration/relevance checks. Existing prose-only database rows safely require more information until updated rules are ingested. Profile persistence remains intentionally absent; reload clears edits. Broader policy coverage and source currency remain limited to the reviewed corpus. Exact PDF-page comparison was unavailable because the PDF was not supplied.

## Files and Git handoff

Phase 2 commit message: `feat(dev-a): finish scheme eligibility and UI integration`. Branch: `developer-a/final-ai`; the final chat reports the actual commit SHA. No push or Phase 3 work is included.

- `README.md`
- `apps/web/src/components/layout/AppShell.jsx`
- `apps/web/src/components/schemes/{SchemeDetailModal,SchemeProfileEditor,EligibilityAssessment,CitationDrawer}.jsx`
- `apps/web/src/context/AppContext.jsx`
- `apps/web/src/index.css`
- `apps/web/src/lib/{schemes,schemeProfile}.js`
- `apps/web/src/pages/SchemeSearch.jsx`
- `apps/web/tests-unit/scheme-profile.test.js`
- `apps/web/tests/scheme-navigator.spec.js`
- `services/api/app/ai/{eligibility,scheme_rules}.py`
- `services/api/app/routers/schemes.py`
- `services/api/tests/{test_eligibility,test_eligibility_citations,e2e_server}.py`
- `docs/api-contract.md`, `docs/implementation-status.md`
- `docs/developer-a-phase-2-ui.md`, `docs/phase-2-eligibility-examples.json`

No production complaint/officer/auth business logic or database migration changed. The older untracked `docs/developer-a-prompt-1.md` is preserved outside this commit. Generated dependencies, screenshots, traces and temporary validation artifacts remain ignored.
