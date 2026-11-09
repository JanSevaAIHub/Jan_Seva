# Developer A — Day 1 handoff

Reviewed 2026-11-09, Asia/Calcutta. **Overall status: PARTIAL. Day 1 is not finished.** The single-agent workflow and frontend integration are locally verified. Developer B's complaint analysis service is absent, and hosted Supabase/PostgreSQL/pgvector/model verification remains blocked.

## Repository audit and scope

Root: `C:\Projects\JanSeva-Combined-Latest`. Branch: `developer-a/final-ai`. Starting commits: Phase 1 `167f9829ef8e8154e884c7af982d3c4afbe38315`, Phase 2 `3dbfd6242777837ed9c669b7eb0b70836d995777`. The only pre-existing uncommitted file was the historical `docs/developer-a-prompt-1.md`; it remains untracked and untouched. No pull, reset, merge, force-push or hosted write was performed.

The audit found working scheme RAG, deterministic eligibility, Scheme Navigator and ownership/assignment-scoped complaint APIs. No LangGraph workflow, agent route or complaint analysis backend existed. The homepage only navigated to search. The targeted Phase 1/2 verification passed **124 tests** before implementation. No repository AGENTS.md or supplied design PDF was available; the requested single-agent flow and existing UI were followed, without an exact PDF comparison.

## Exact features implemented

One real LangGraph StateGraph runs a finite, per-request workflow:

```mermaid
flowchart LR
    START --> classify_intent --> tool_selection --> evidence_check --> format_response --> END
```

- Intents retain the proposed lowercase API vocabulary: `scheme`, `complaint`, `mixed`, `clarify`, corresponding to SCHEME, COMPLAINT, MIXED and AMBIGUOUS. The configured model can return only a structured intent. It cannot choose identities, permissions, tool arguments, writes, actions or answer claims. Provider failures use labelled conservative explicit-term routing; unsupported/ambiguous requests ask for clarification.
- `search_schemes` reuses the existing RAG function and actual stored evidence. The agent separately verifies active chunks, scheme identity, exact complete excerpts, official URLs, review metadata and permitted response text. Arbitrary model narratives and source-injection markers are excluded. A shared renderer reconstructs source answers; no unchecked prose is added by the model.
- `check_eligibility` reuses the deterministic Phase 2 evaluator and supplied structured profile. Free text is never used to guess age, income or eligibility. Missing fields/unresolved conditions remain uncertain. Rule-source citations have no invented chunk ID.
- `get_my_complaints` uses verified JWT identity, a stored profile and Developer B's existing scoped list function. Citizens see owned records and officers see only assigned records, as in the original API. Browser roles/user IDs are rejected. An opaque session ID cannot select another user's data. Private records are not sent to the classifier/model.
- `analyze_complaint` is an explicit unavailable capability adapter. **It does not classify categories, predict departments or find duplicates.** There is no implementation to reuse in this checkout; no replacement classifier or duplicate complaint backend was introduced.
- `draft_complaint` creates only an editable copy of supplied text and optional supplied fields. It does not invent facts or pretend to be the missing analysis service. The response states that nothing has been saved, registered, sent or filed.
- Complaint proposals contain a confirmation-required action. All agent tools are read-only: they cannot create/update/delete tickets, change status, submit government forms or send email/WhatsApp. Creation still requires the existing frontend review, authenticated explicit confirmation and Developer B's unchanged POST endpoint.
- The homepage's existing assistant card now calls `/api/agent/message`, with editable prompt chips, a keyboard/mobile composer, pending feedback, answer/evidence links, suggested navigation actions, errors/retry and temporary in-memory history. It prevents simultaneous requests and ignores stale completions after account changes. History, pending results and proposal transfers clear on identity change.
- Draft navigation transfers only validated text into the existing complaint form. It never opens confirmation or submits automatically. The form's description limit was aligned from 500 to the existing backend's 5000-character limit to preserve longer supplied drafts; no complaint backend validation/business rule changed.
- One LangGraph workflow is used; there are no subagents, second vector database, write tools, checkpointers or server chat persistence. Optional third-party tracing is disabled around this graph. Session IDs are correlation values, not permissions or persisted memory.

Implementation references: [official OpenAI documentation for structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses), [LangGraph Graph API](https://docs.langchain.com/oss/python/langgraph/graph-api). LangGraph is pinned to `1.2.20`; its required transitive packages are installed by the existing requirements command. No additional frontend dependency was introduced.

## API contracts used

`POST /api/agent/message` accepts `{message, session_id?, profile?, scheme_id?, complaint?}`. Messages are trimmed and bounded to 3–1000 characters; session/scheme IDs are UUIDs. Profiles use the existing deterministic schema. Complaint fields are only supplied title, description, locality and optional existing category code. Extra identity/role/status/action fields return 422.

Response fields are `{session_id, intent, response, status, citations, actions, tool_trace, eligibility}`. `status` is `ok | partial | needs_info | unavailable`; it does not replace eligibility's exact three statuses. Actions preserve the planned trace fields `{tool,status,detail}` and add `{label,path,requires_confirmation,draft?}`. Allowed paths are `/schemes`, `/complaints/new`, `/requests`. The frontend rejects unsafe paths, unsupported categories, unconfirmed complaint actions and unsafe citations.

The endpoint is public for guest assistance; supplied bearer tokens must pass existing verification. Private reads require verified identity and the existing database-owned profile/scope. Unknown sessions grant no access. Invalid JWTs return 401, invalid input 422, missing/outage database configuration sanitized 503s. Failed scheme tools without a supported result return 503 `AGENT_TOOLS_UNAVAILABLE`; partial mixed responses explicitly retain failures. Classifier/tool timeouts and provider errors do not expose raw exceptions or keys.

The agent shares the existing per-client/global/concurrent model budget with scheme AI. Sequential provider work is bounded by existing provider timeouts; the browser allows up to 160 seconds and retains the typed message on failure. It never automatically retries mutations.

Existing endpoints reused: `/api/schemes`, `/api/schemes/ask`, `/api/schemes/eligibility`, authenticated complaint listing and the existing explicit complaint create/review flow. `/api/complaints/analyze` remains a proposed, unimplemented contract. See [API contract](api-contract.md#single-agent-boundary-phase-3) and [captured actual local agent responses](phase-3-agent-examples.json).

## Required configuration names

No environment values or credentials are recorded here.

| Names | Purpose |
|---|---|
| `DATABASE_URL` | Existing PostgreSQL/Supabase storage |
| `SUPABASE_URL` | Trusted JWT issuer/JWKS project |
| `OPENAI_API_KEY` | Existing server-only model/embedding provider |
| `EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS` | Consistent ingestion/query model and dimensions |
| `LLM_MODEL` | Structured intent classification and evidence selection |
| `RAG_MIN_SCORE` | Existing vector relevance cutoff |
| `CORS_ORIGINS` | Existing explicit browser-origin configuration |
| `VITE_API_BASE_URL` | Browser API origin |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Existing browser auth configuration |
| `DEMO_CITIZEN_USER_ID`, `DEMO_OFFICER_USER_ID` | Optional existing demo assignment pair |

Operator/demo setup may additionally require the existing documented `SUPABASE_SERVICE_ROLE_KEY` and demo account configuration names. No LangGraph hosted-service key is required for this local graph. Never place server secrets in Vite variables. See README for existing private setup.

## Run commands

From repository root:

```powershell
.\.venv\Scripts\python.exe -m pip install -r services/api/requirements.txt
.\.venv\Scripts\python.exe -m pip check
.\.venv\Scripts\python.exe -m pytest -q
npm.cmd --prefix apps/web run test:client
npm.cmd --prefix apps/web run test:e2e
npm.cmd --prefix apps/web run build
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir services/api --reload
```

In a separate terminal, run the existing web `dev` script. Corpus validation can be run from `services/api` with `..\..\.venv\Scripts\python.exe -m app.scripts.ingest_schemes --validate-only`. Use the existing migrations/ingestion procedures only after explicitly authorizing a development database; this change runs no startup DDL or ingestion.

## Tests and actual results

| Check | Passed | Failed | Skipped |
|---|---:|---:|---:|
| Targeted Phase 1/2 baseline | 124 | 0 | 0 |
| Final full backend | 274 | 0 | 1 |
| Agent backend file, included above | 29 | 0 | 0 |
| Final client tests | 41 | 0 | 0 |
| Agent client file, included above | 6 | 0 | 0 |
| Full Chromium browser suite | 45 | 0 | 0 |
| New agent browser file, included above | 9 | 0 | 0 |

Production Vite build, dependency compatibility (`pip check`), corpus validation and diff whitespace checks pass. Typecheck/lint are not configured in this JavaScript repository; they are not reported as passing checks. The LangGraph transitive HTTP client installation removed the earlier TestClient deprecation warning in the final backend runs. No Python vulnerability/security certification is claimed.

The agent tests cover all requested routing cases: schemes, structured profile, missing eligibility data, complaint, mixed, ambiguous, provider/tool errors/timeouts, unconfirmed write attempts and malicious retrieved instructions. Additional checks cover changed answer/URL/excerpts, unknown scheme, inactive chunks, classifier schema/tool-authority rejection, owner isolation, guessed session IDs, browser identity rejection, invalid JWTs/inputs and sanitized DB outages. The classifier's provider payload is tested for strict schema, untrusted input separation, disabled response storage and absence of executable tools.

Test-first evidence: the agent tests initially failed because the module was absent; new client tests failed before their validator existed. The first agent run found two legitimate fixture excerpts were partial paragraphs; the fixtures were corrected to use real complete source paragraphs, keeping the evidence gate strict. A new creation-wording test reproduced a private-read-versus-proposal routing issue and was fixed without allowing writes. The first browser agent run passed eight cases and exposed one incorrect locator in the new complaint journey; its selectors were corrected to match the unchanged form. Final runs above pass; no tests were skipped to hide a local failure.

### End-to-end verification

- **Journey A — verified locally:** homepage scheme question invokes real scheme services, displays stored citations and missing eligibility information, navigates to Scheme Discovery, edits the local profile, checks actual stored rules and exposes the correct official source. This uses actual FastAPI routes and SQLite rows with the established explicit PostgreSQL catalog double/provider-disabled lexical fallback, not live vector/model access.
- **Journey B — safe fallback verified, full analysis blocked:** a broken-streetlight request reports the missing analysis capability, shows only supplied editable text and transfers it to the existing form. No complaint POST occurs while asking, transferring or opening review. Exactly one POST occurs only after the authenticated confirmation click. **An existing analysis service invocation/prediction cannot be verified because that service is absent.**
- **Journey C — partial workflow verified locally:** both scheme search and complaint capability paths run. Real stored scheme citations are returned; analysis failure remains visible and a review-only text proposal is offered. This is not a successful complaint-analysis test.
- Quick chips are editable and do not submit automatically; loading/error/retry, duplicate-request prevention, history/account isolation, stale replies and 320/768/1280px composer layouts pass. Homepage screenshots were visually inspected. Retained Scheme Navigator, complaint, officer, auth, keyboard and responsive regressions pass.
- UI routes `/`, `/schemes`, `/complaints/new`, `/requests`, `/track`, `/officer` remain functional. The repository's complaint-list UI is `/requests`; `/api/complaints` is the authenticated API, and `/complaints` is not a separate frontend list route. No duplicate route was invented.

## Known issues and blocked live integration

1. **Developer B dependency:** complaint analysis/category/department/duplicate suggestions remain unimplemented. Agent output and tool trace state that limitation. Supplied-text copying is not a replacement AI analysis service.
2. **Hosted checks:** database/provider configuration is unavailable here. The opt-in live RAG test remains skipped. Hosted Supabase Auth, actual PostgreSQL/pgvector operators/RLS, billable intent/evidence provider behavior and deployment are not certified by SQLite/provider doubles. No live ingestion, migration or government/external-message action was performed.
3. **Conversation scope:** history is in current provider memory and clears on account changes/reload. The server is stateless; correlation/session IDs do not provide conversation persistence or cross-turn authorization. Ambiguous follow-ups need clarification rather than guessed context.
4. **Design/source limits:** the PDF was unavailable for page-exact comparison. Existing design and phase styling were preserved. Scheme coverage/currency limits from Phases 1/2 remain. The source-injection marker guard is conservative and complements fixed permissions/exact evidence validation; it is not complete security certification.
5. **Existing release gates:** model budgets are still per-process, backend dependencies other than the pinned graph retain the repository's range conventions, and deployment/live cost controls remain operator work. No unrelated release gate is silently marked complete.

## Developer B dependencies and Day 2 tasks

1. Implement/identify the real read-only complaint analysis service behind the planned `/api/complaints/analyze` contract. Coordinate validated category, department, draft and duplicate-result fields; apply existing auth/ownership rules to any private duplicate/ticket data.
2. Replace the explicit unavailable adapter in `services/api/app/ai/agent_tools.py::analyze_complaint` with reuse of that service. Update the complaint node/formatter to consume a validated successful response, retain honest failure handling, and add a real analysis journey. Do not duplicate a classifier or call complaint creation from the graph.
3. Preserve Developer B's JWT/profile roles, `visible_complaints` scope, atomic complaint/event writes and officer transition rules. The agent currently reuses `list_complaints`; no complaint/officer backend implementation was changed.
4. Privately configure an explicitly authorized development database/model provider; verify existing migrations, safely ingest/rerun reviewed sources and run the opt-in live RAG plus actual intent classification/evidence/ownership checks with cost controls.
5. Re-run backend/client/browser/build checks after B's integration. Complete the actual complaint analysis path and hosted acceptance evidence before changing the Day 1 verdict to PASS. No Day 2 implementation was started automatically.

## Files changed and Git

Phase 3 commit message: `feat(dev-a): integrate agent and complete scheme journey`. Branch: `developer-a/final-ai`; the final chat reports the actual SHA. No push is performed.

- `services/api/requirements.txt`
- `services/api/app/main.py`
- `services/api/app/ai/{agent,agent_schemas,agent_tools}.py`
- `services/api/app/ai/rag.py` (shared evidence-only renderer, same scheme answer behavior)
- `services/api/app/routers/agent.py`
- `services/api/tests/test_agent.py`
- `apps/web/src/context/AppContext.jsx`
- `apps/web/src/pages/{Home,ComplaintForm}.jsx`
- `apps/web/src/components/common/HomeAssistant.jsx`
- `apps/web/src/lib/agent.js`
- `apps/web/tests-unit/agent.test.js`
- `apps/web/tests/agent.spec.js`
- `apps/web/tests/stability.spec.js` (homepage expectation now verifies the real agent path)
- `README.md`, `docs/api-contract.md`, `docs/implementation-status.md`
- `docs/dev-a-day1-handoff.md`, `docs/phase-3-agent-examples.json`

The historical untracked `docs/developer-a-prompt-1.md` is preserved outside the commit. No production complaint/officer/auth model, business logic or migration file changed. Day 1 acceptance remains **PARTIAL**, despite passing local tests, for the explicit analysis and live-service gates above.
