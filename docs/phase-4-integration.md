# Phase 4: frontend integration and stability

Scope: the existing React/Vite frontend. Sidebar, routes, page layouts, colors, assets, responsive structure, icons and modals are retained. No UI framework migration, backend business-rule rewrite, new database migration or production auth bypass was added.

## Changes

- `api.js` now has one JSON transport behind the existing public/authenticated/health helpers. It supports GET/POST/PATCH, configurable `VITE_API_BASE_URL` (including a trailing `/api`), object or serialized JSON bodies, bearer tokens, JSON/204 responses, structured errors, non-JSON failures, cancellation and timeouts. Private requests require a token. Failures never replay writes automatically; network errors do not expose raw upstream details.
- Auth continues to use Supabase's real session persistence and refresh. Only `/api/me` establishes the application role. A failed queue fetch no longer discards a successfully loaded profile. Current-token 401s clear account data and attempt SDK local sign-out; a late 401 from an older account cannot sign out the new account. User logout clears records, selections, session-local bookmarks and old toasts. SDK configuration errors are visible without crashing the app. Demo choices open actual credential login for Arjun Mishra or R. Singh; no local role grant or embedded password exists.
- Home action cards navigate to the existing workflows. The homepage composer is explicitly scheme search/navigation, with general-purpose chat and voice marked unavailable. It does not silently send a scheme-chat request. Fabricated totals and activity/eligibility claims are replaced by the loaded role, scheme/ticket counts and real accessible tickets. Counts are not presented as platform-wide statistics.
- SchemeSearch keeps the real list/ask API paths, source links, filters and modal. Response validation prevents malformed successful JSON from reaching React rendering. Unsupported citation URLs are removed. An in-flight answer no longer erases a newly typed follow-up. Search/error/retry/empty states remain visible.
- ComplaintForm starts with empty editable fields. The optional sample loader supplies visibly synthetic text. Submission still waits for saved API data and preserves values on failure. Draft storage, photo/GPS and priority persistence are explicitly unavailable/previews; no fake save/upload/dispatch success is reported. Package labels no longer imply a recorded government department when only officer assignment is stored.
- My Requests uses the authenticated database-backed list. TrackStatus normalizes UUID lookup casing, refetches when the same ID is submitted again, displays real audit history and clears loading state when a session ends.
- Officer queue, status changes, counts and events remain assignment-scoped API data. Queue errors preserve the verified role, hide unavailable headline counts and support retry. Fake automated-triage claims are removed. The backend continues to enforce officer role, assignment and permitted transitions.
- Mock notifications are removed from production state. Existing notification components remain, visibly identifying the missing notification service. Unimplemented translations are disabled. `mockData.js` remains available for isolated previews; production source imports no longer use it.
- CSS fixes intrinsic grid/flex sizing, UUID wrapping, narrow search inputs and horizontal mobile navigation. The officer table keeps readable column widths and scrolls inside its existing container. Mobile notification menus fit the viewport; failed portrait downloads fall back to account initials. No color/theme changes were made.

## Integration status and browser evidence

Chromium was available and actually used through Playwright. The local harness runs real Vite and FastAPI servers with a temporary SQLite database, signed ES256 tokens and a fake Supabase Auth provider. It now inserts the eight reviewed corpus records into the isolated database, exercising the real scheme listing endpoint without HTTP stubbing. This is not live Supabase/PostgreSQL or OpenAI verification.

| Requested check | Actual evidence / limit |
|---|---|
| 1. Homepage opens | Browser rendered the preserved hero/cards, truthful loaded counts and navigation; no homepage chatbot request was sent |
| 2. Scheme page loads real records | Browser loaded reviewed scheme records through the actual FastAPI list route and isolated database |
| 3. Scheme question returns grounded answer | Request/answer/citation UI contract tested with explicitly labeled HTTP response doubles; live pgvector/OpenAI generation remains blocked by configuration |
| 4. Citation opens official source | Browser opened a new tab at the stored official URL. An explicit navigation fixture was used; live external page content was not claimed as verified |
| 5. Citizen authenticates | Actual Supabase SDK flow against the local Auth test provider, followed by real JWT verification and `/api/me` |
| 6. Citizen creates complaint | Actual POST through the retained review modal, saved database UUID returned; initial failed POST retained the draft for retry |
| 7. My Requests shows complaint | Actual scoped list/detail requests and durable isolated DB records |
| 8. Officer logs in | Session changed to the officer identity and role loaded from `/api/me` |
| 9. Officer updates status | Actual assignment-authorized PATCH, database status/event update and queue/detail refresh |
| 10. Citizen sees update after refresh | Actual account switch back to citizen, tracking detail/audit and browser reload |
| 11. Unauthorized actions blocked | Anonymous POST returned 401 and citizen officer PATCH returned 403; browser officer guard and retained backend ownership tests passed |
| 12. Backend errors do not crash React | Browser checked 503, network failure, malformed successful records/answers, queue outage/retry, expired sessions and stale-account 401s |

The browser suite also checks all six P0 pages at **320, 375 and 1280 pixels**, verifies no document-level horizontal overflow, and opens the actual officer audit modal on mobile. Visual inspection of generated screenshots caught and corrected a compressed officer table; its table now has a readable minimum width and internal horizontal scrolling. Source cards, sidebar, theme and modal styles remain intact.

Screenshots are ignored local Playwright artifacts under `apps/web/test-results/stability-P0-pages-and-mod-50649-at-phone-and-desktop-widths/`: `mobile-home.png` and `mobile-officer-audit.png`. They are actual browser captures, not generated mockups. Test servers are managed and stopped by Playwright. No test-provider endpoints or dependency overrides are installed by the normal production entrypoint.

## Verification commands

Final results on 2026-11-07 (Asia/Calcutta):

- `npm.cmd run test:e2e`: **11 passed (2.7m), exit 0**, in actual Chromium. Includes the full citizen/officer round trip, actual DB-backed scheme listing, API-contract scheme answer/citations, source URL navigation, failure recovery, auth expiry/logout/races, same-ID tracking refresh and mobile/desktop checks.
- `npm.cmd run test:client`: **8 passed, exit 0**. JSON/header handling, GET/POST/PATCH, 204, structured/non-JSON errors, missing/expired JWT behavior, network errors, timeout cancellation and external-path rejection.
- `npm.cmd run build`: **passed, exit 0**; Vite transformed 1,640 modules. Default configured-environment output: JS 394.50 kB (111.71 kB gzip), CSS 55.90 kB (10.62 kB gzip).
- Backend `python -m pytest -q`: **99 passed, 1 skipped, 1 warning in 14.95s, exit 0**. The skip is the explicit live PostgreSQL/pgvector/provider test, not a passing live RAG result. The warning is the retained Starlette/httpx TestClient deprecation.
- `pip check`: **passed**, no broken requirements. `git diff --check`: **passed**. No new package dependencies or production backend modifications.
- Live configuration recheck: neither backend nor frontend `.env` exists, and no database/Supabase/OpenAI/model configuration variables are available in this process. Live account/provider tests are therefore not reported as passing.

From the repository root:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m pip check
```

From `apps/web`:

```powershell
npm.cmd ci
npm.cmd run test:client
npx.cmd playwright install chromium  # only if the matching browser is missing
npm.cmd run test:e2e
npm.cmd run build
```

No new dependencies are required. `test:client` uses Node's built-in test runner. The browser harness runs on isolated ports 5174/8765 and generates an ephemeral test password; normal runtime still uses the configured Supabase project and actual provisioned demo credentials. Configure the API URL and public Supabase values in `apps/web/.env`; database, admin and model keys stay server-only. Existing [Phase 2](phase-2-setup.md) and [Phase 3](phase-3-setup.md) instructions describe real account provisioning, explicit assignment, database/vector migration and model configuration.

## Remaining issues and deliberate limits

- Real Supabase account login, PostgreSQL storage and live scheme RAG remain unverified until the missing project/database/provider configuration is supplied. The Phase 3 live test is intentionally skipped without opt-in configuration. No fake embeddings, invented answers or passing retrieval-quality percentages fill that gap.
- General-purpose homepage assistant, voice, notifications, translation, draft persistence, evidence upload/GPS verification, saved priority/SLA targets, advanced complaint AI and automated department routing remain unavailable or clearly labeled previews. Session-local scheme bookmarks are not represented as database profile writes.
- Updates refresh on page entry, focus, explicit tracking/queue retry and successful writes; there is no push notification or WebSocket service.
- A connection loss after a mutation may leave its commit outcome unknown. No mutation is automatically replayed; users should check saved tickets before retrying an uncertain submission. This phase does not add backend idempotency keys.
- The retained backend TestClient emits an existing Starlette/httpx deprecation warning. A configured production build can include the existing Supabase SDK chunk-size advisory; no unrelated bundle/framework migration is included.

## Changed files

- Transport/state: `apps/web/src/lib/{api,supabase,complaints,schemes}.js`, `apps/web/src/context/AppContext.jsx`.
- Pages: `apps/web/src/pages/{Home,ComplaintForm,TrackStatus,SchemeSearch,Officer,NotificationsPage}.jsx`. MyRequests was inspected and exercised; its already working implementation did not require a change.
- Components/style: `apps/web/src/components/layout/Topbar.jsx`, `apps/web/src/components/complaints/ComplaintPackageModal.jsx`, `apps/web/src/index.css`.
- Tests: `apps/web/tests-unit/api.test.js`, `apps/web/tests/helpers/auth.js`, `apps/web/tests/stability.spec.js`, updated complaint/scheme browser tests, `services/api/tests/e2e_server.py` (test-only reviewed-record setup), `apps/web/package.json` (test command).
- Documentation: README and this report. The pre-existing untracked Phase 0 report is left separate.

Auth behavior was checked against [Supabase sign-out](https://supabase.com/docs/reference/javascript/auth-signout) and [auth-state-change](https://supabase.com/docs/reference/javascript/auth-onauthstatechange) documentation. Stop after Phase 4; no later phase was started.
