# Phase 3: scheme RAG implementation and execution evidence

Historical report. The 2026-11-09 [Phase 1 RAG foundation update](developer-a-phase-1-rag.md) supersedes the dataset count, chunk identities, retrieval fallback behavior and verification counts below. Existing setup/migration commands still apply; no new migration was added.

Implementation uses straightforward Python, existing httpx/SQLAlchemy, one OpenAI embedding provider and exact pgvector cosine search in the existing PostgreSQL database. No LangChain, LangGraph, second vector database, reranking, hybrid retrieval or complaint/officer implementation changes were introduced. Live completion is blocked by missing database and model configuration; the definition of done is **not yet met** for actual stored PostgreSQL embeddings and live retrieval.

## Corpus

Eight real schemes were reviewed against official sources: PM-KISAN, NMMSS, PMSBY, PMJJBY, APY, Sukanya Samriddhi, PM Vishwakarma and Punjab Ashirwad. The [source manifest](../data/README.md) links each source and records known limitations. The CSV and corresponding UTF-8 text files contain IDs, title, state, category, description, eligibility, verified document information, URL and review date.

Evidence is manually reviewed paraphrase, explicitly labeled. Incomplete document lists remain incomplete; no guessed documents, guaranteed eligibility, fabricated scheme, future payment date or invented application URL fills a gap. The Punjab source contains an older amount, so the corpus deliberately omits that numeric amount and unreconciled thresholds/deadlines. A historical APY parliamentary source is labeled historical. NMMSS's published September 2026 deadline is stated as passed at review, not advertised as open.

## Storage and ingestion

Run the retained Phase 1 migration first, then additive `services/api/migrations/002_scheme_vectors.sql` via `app.scripts.migrate_schemes`. It enables pgvector (respecting an existing extension namespace), keeps all five tables and existing JSONB embeddings, and adds `embedding_vector`, source metadata and an active-passage flag to `scheme_chunks`. The vector type has no guessed fixed dimension: a database check requires each vector to match its recorded model/dimensions. Exact scan needs no approximate index for this eight-record corpus. Existing superseded curated passages become inactive; ingestion does not drop tables or delete historical passages.

Ingestion validates CSV rows, official HTTPS URLs, duplicate corpus IDs, safe local file paths and evidence/metadata consistency; splits into at most 1,800-character chunks with overlap; calls the actual OpenAI embeddings endpoint; checks model, count, index order, finite nonzero values and actual output dimensions; then commits each scheme and its passages atomically. The eight current notes each fit one evidence chunk. Failed records are logged with identifiers and sanitized reasons and produce a nonzero exit. Unchanged chunks reuse vectors on rerun; changed source text or model/dimensions cause re-embedding. Stable scheme/chunk IDs prevent duplicate inserts. Configuration errors never trigger synthetic vectors.

Phase 1's JSON embedding column remains compatible. A changed vector is cleared only within the transaction before updating dimension metadata, then replaced by the new vector; a later failure rolls back the entire record. Corpus ownership is checked before overwriting an existing scheme ID. Advisory locks serialize concurrent ingestion of the same scheme. The operator needs privileges to install pgvector and alter `scheme_chunks`.

## Retrieval and answer safety

`retrieve()` validates query length, embeds the query with the same configured model/dimensions, and executes parameterized `embedding_vector <=> query_vector` cosine search. It filters inactive/incompatible embeddings and optional state/category. Selecting a state includes that state plus national schemes. Results include passage text, cosine score, chunk/scheme IDs, source URL, review date and source metadata. `RAG_MIN_SCORE` is a configurable relevance cutoff, **not** a confidence or eligibility percentage. Model-specific relevance still needs the live evaluation.

`GET /api/schemes` returns actual stored database records without a model call. With `query`, it uses vector retrieval; state/category/limit are supported. Query retrieval takes up to ten passages and deduplicates schemes in similarity order. `POST /api/schemes/ask` retrieves passages and sends question/profile/evidence as untrusted data to the OpenAI Responses API under separate trusted instructions. No provider tool execution is enabled; response storage is disabled.

Generation is deliberately constrained: the LLM selects complete, relevant paragraphs from the retrieved evidence using a strict JSON schema. Local validation rejects unknown chunk IDs, invented/changed URLs, fabricated text and partial paragraphs that could omit a condition or negation. Only validated source paragraphs become the displayed answer and citations; no unchecked model narrative can introduce amounts, eligibility requirements, deadlines or links. Citations explicitly describe reviewed summaries rather than verbatim source quotations. No personalized eligibility decision is made.

No qualifying evidence or an insufficient/invalid model selection returns `insufficient_evidence` with no citations. An unavailable LLM produces an explicitly labeled `extractive_fallback` containing unmodified related stored evidence, with a warning that it may not answer the question. Missing/failed embeddings return a retryable 503; there is no mock/keyword chatbot or local-vector fallback. DB errors retain Phase 1's sanitized 503 handling. Tool traces state retrieval, model and citation-validation outcomes without credentials or raw provider errors.

## Frontend

The existing three-column SchemeSearch page, card layout, responsive CSS, filters and detail modal are preserved. The shared context's scheme fixture initialization and keyword chatbot are replaced with public API calls. Search is debounced; stale search responses are ignored. Category/state filters go to the backend; national schemes remain visible with state filtering. Loading, retryable failure and no-result messages are explicit. A failed chat retains the input for retry. Citation links come from the API; card/detail links use stored source records. Fake match percentages, personalized eligibility labels and document-readiness claims are removed. Saving a card is labeled as browsing-session state, not database-backed profile storage.

## Configuration and execution

Set actual server values in ignored `services/api/.env`; process environment takes precedence:

```dotenv
DATABASE_URL=<same PostgreSQL/Supabase database used in Phase 1>
OPENAI_API_KEY=<server-only provider key>
EMBEDDING_MODEL=<available OpenAI embedding model>
EMBEDDING_DIMENSIONS=<actual configured positive output dimension>
LLM_MODEL=<available Responses model supporting strict JSON-schema output>
RAG_MIN_SCORE=0.35
```

For `text-embedding-3-*`, the embeddings request sends the configured `dimensions`. For older embedding models it omits the shortening parameter and validates the actual returned dimension. No default model/dimension or billable API call is hidden in startup. Key/model absence cannot yield fabricated answers. The existing frontend API base URL configuration is sufficient for public scheme requests; no model key belongs in Vite variables.

```powershell
# Repository root, using the existing venv and requirements:
$env:PYTHONPATH = 'services/api'
.\.venv\Scripts\python.exe -m app.scripts.migrate
.\.venv\Scripts\python.exe -m app.scripts.migrate_schemes
.\.venv\Scripts\python.exe -m app.scripts.ingest_schemes --validate-only
.\.venv\Scripts\python.exe -m app.scripts.ingest_schemes
.\.venv\Scripts\python.exe -m app.scripts.ingest_schemes
.\.venv\Scripts\python.exe -m app.scripts.evaluate_schemes
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir services/api --reload

# Opt-in live ingestion/rerun/vector/five-question test (actual DB + API usage):
$env:JANSEVA_LIVE_RAG = '1'
.\.venv\Scripts\python.exe -m pytest -q services/api/tests/test_schemes_live.py
Remove-Item Env:JANSEVA_LIVE_RAG

# apps/web:
npm.cmd run build
npm.cmd run test:e2e
```

Public API examples after migration/ingestion: `GET /api/schemes?state=Punjab&limit=10`, `GET /api/schemes?query=farmer&state=Punjab`, and `POST /api/schemes/ask` with `{"message":"What schemes support farmers in Punjab?","profile":{"state":"Punjab","occupation":"Farmer"}}`.

## Actual results and blockers

- Backend suite: **99 passed, 1 live test skipped, 1 existing deprecation warning in 15.11s**. Includes 25 new local scheme cases; the retained 74 tests passed. The live pgvector/provider test was skipped rather than reported as passing.
- Browser suite: **4 passed in 31.4s**: retained citizen/officer journey and guard tests, plus scheme card/source/chat/filter/no-result wiring and scheme error/draft-retry tests. Scheme HTTP doubles are explicitly labeled in the test names.
- Frontend production build: **passed**; Python application compile check passed. No new dependencies were introduced.
- Normal production-entrypoint Uvicorn startup and `/api/health`: **passed (200)**. OpenAPI includes the scheme and retained complaint/officer routes. With no database configuration, actual scheme list/ask HTTP calls returned sanitized **503 `DATABASE_NOT_CONFIGURED`**, not fake records or chatbot answers. The smoke server was stopped. `pip check` reported no broken requirements.
- Corpus validation: **8 records, 0 failures, 8 practical evidence chunks**. Local files exist and their metadata matches the CSV. This does not claim that records have been stored in PostgreSQL.
- The real vector migration command failed closed: `DATABASE_URL is not configured.`
- Actual ingestion was attempted twice; both attempts failed closed for the same missing URL. No real embeddings were generated or saved and live idempotence is unverified.
- All five actual evaluation commands were attempted through the production RAG functions. [Captured JSONL evidence](phase-3-evaluation.jsonl) records each as **blocked**, with no invented answer or passing quality percentage.

| Evaluation question | Live result | Local deterministic safety checks |
|---|---|---|
| Farmer support in Punjab | Blocked: missing database configuration | Reviewed farmer passage/citation contract exercised with labeled doubles |
| Verified student schemes | Blocked: same | Reviewed NMMSS passage/citation contract exercised with labeled doubles |
| Sukanya Samriddhi documents | Blocked: same | Verified document paragraph/citation contract exercised with labeled doubles |
| Another state's applicant for Punjab Ashirwad | Blocked: same | Stored Punjab domicile qualification preserved in the answer contract |
| Unknown Galactic Farming Grant | Blocked: same | Empty/insufficient evidence returns uncertainty; no invented scheme |

Unit tests use explicit provider/retrieval doubles and isolated SQLite only to test contracts, safety and database-backed listing; these are not proof of live cosine relevance. Browser scheme tests use labeled HTTP response/failure doubles to verify UI wiring and source links. The live test is separately opt-in and must not be counted as passed while skipped. The retained complaint browser tests still exercise their real isolated backend. The real PostgreSQL migration, vector SQL execution, embedding-provider account access and live five-question relevance remain unverified until configuration is supplied. Phase 3's live definition of done is blocked; no later phase is started.

## Files changed

- Corpus: `data/schemes.csv`, `data/README.md`, eight `data/scheme_sources/*.txt` files.
- Backend: `app/ai/{__init__,corpus,provider,retrieval,rag,scheme_schemas}.py`, `app/routers/schemes.py`, three scheme operator scripts, additive migration 002, and one minimal scheme-router registration in `app/main.py` (all paths under `services/api/`). Complaint/officer routers, models, schemas and scripts are unchanged.
- Frontend: scheme-only sections in `context/AppContext.jsx`, `lib/api.js`, new `lib/schemes.js`, `pages/SchemeSearch.jsx`, `components/schemes/SchemeDetailModal.jsx`. No CSS/routes/layout/complaint/officer component edits.
- Verification/documentation: scheme backend tests, opt-in live test, `apps/web/tests/schemes.spec.js`, `.env.example`, README/API contract updates, this report and captured evaluation output. The pre-existing untracked Phase 0 report remains separate.

API references consulted: [OpenAI embeddings](https://developers.openai.com/api/reference/resources/embeddings/methods/create), [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses), [pgvector exact cosine search and dimensions](https://github.com/pgvector/pgvector).
