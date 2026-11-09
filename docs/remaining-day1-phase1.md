# Remaining Day 1: Phase 1 verification

Reviewed 2026-11-09. **Local acceptance checks pass; hosted PostgreSQL/pgvector/provider acceptance is pending configuration.** This follow-up implements only Phase 1 work. Previously committed eligibility, UI and agent features are preserved.

## Audit before changes

- Repository: `C:\Projects\JanSeva-Combined-Latest`; branch: `developer-a/final-ai`; starting HEAD: `0fa15188cbef5d14357bd5ac7baa4b5e00ff0073`.
- Initial status: only the pre-existing untracked `docs/developer-a-prompt-1.md`. It is excluded from this commit.
- Inspected existing scheme routes, AI modules, ingestion, corpus, models, migration 002, dependencies, tests, API schemas and shared frontend transport. The referenced implementation-plan PDF and repository AGENTS.md are absent; no PDF comparison is claimed.
- Completed implementation reused: curated records, official-source validation, reviewed evidence extraction, cleaning/chunking, configured embeddings, dimension checks, transactional upserts, cosine retrieval, filters, stored-text fallback and grounded search/ask responses. Initial targeted baseline: **69 passed**.
- Broken edge case: an unchanged-text ingestion rerun reused vectors and refreshed JSON metadata but failed to refresh the chunk's source URL. After correcting a primary source URL, retrieval's source-consistency guard excluded those chunks. Stale chunk URLs also survived reruns.
- Partial: actual hosted ingestion, database constraints/locking/RLS, provider calls and semantic relevance evaluation remain unverified. No database/provider credentials are configured for those checks.

## Change and preserved behavior

Ingestion now updates `scheme_chunks.source_url` together with metadata and `is_current` on every successful rerun, inside the existing per-record transaction. Unchanged content retains chunk IDs and embedding vectors and incurs no embedding call. No migration, API response schema, authentication, complaint/officer logic or frontend code changed.

Two new parameterized regression cases first failed on the stale URL assertion, then passed after the fix. They cover both a corrected primary source with unchanged evidence text and repair of a stale stored chunk URL. Assertions verify unchanged IDs/vectors, zero provider calls, consistent source metadata, current row counts and successful retrieval. Synthetic source URLs are confined to the isolated test fixture, never the curated dataset.

The existing [12-record corpus and source manifest](../data/README.md) remain intact. Schemes include PM-KISAN, NMMSS, PMSBY, PMJJBY, APY, SSY, PM Vishwakarma, Punjab Ashirwad, PM-SYM and three NSAP pensions with explicitly limited Ladakh coverage. Stable IDs, departments, official URLs, supported documents/rules and recorded review dates are preserved. No benefit, document requirement or source-review date was invented or refreshed in this follow-up. Existing sources were not re-fetched during this follow-up; their recorded review dates describe prior curation.

Extraction is manual reviewed source curation into `data/scheme_sources/`, not an automatic web scraper. Cleaning and paragraph chunking target approximately 250-450 English tokens using a character estimate; short notes and final tails remain shorter. Metadata preserves scheme ID, heading, URL, review date and content hash. Configured model/dimension validation, existing PostgreSQL catalog checks and vector storage remain in use; there is no second vector database.

Retrieval selects up to five active, source-consistent chunks with state/category filters. A configured provider outage or absent API key uses explicitly labelled keyword ranking over stored evidence. Missing model/dimension configuration, database failures and schema mismatches fail safely. Answers validate known chunk IDs, official URLs and exact stored paragraphs; injected source instructions are quarantined. Unsupported questions produce `insufficient_evidence` without citations. Relevant scheme IDs/titles are carried in citations, preserving the frontend's existing response contract.

## Verification results

| Check executed in this follow-up | Result |
|---|---|
| New regression cases before fix | 2 failed, reproducing the defect |
| New regression cases after fix | 2 passed |
| Targeted scheme/corpus/RAG suite | 71 passed, 0 failed |
| Entire backend suite | 276 passed, 0 failed, 1 skipped |
| Client tests | 41 passed, 0 failed |
| Production Vite build | Passed |
| Dependency consistency | No broken requirements |
| Corpus validate-only | 12 records, 0 failures, 12 chunks |
| FastAPI startup and `/api/health` | Passed in existing TestClient regression tests |
| Auth and citizen/officer complaint workflows | Existing full-suite regression tests passed |
| Diff whitespace check | Passed |
| Live database check | Exit 1: `DATABASE_URL is not configured` |
| Five live evaluation requests | All blocked by missing `DATABASE_URL` |

Counts overlap; do not sum them. The skipped test is the explicitly opt-in live PostgreSQL/pgvector/provider test. Browser E2E was not rerun for this backend-only fix. No separate lint/typecheck scripts are configured in the JavaScript frontend. Existing migrations are untouched. Reviewed changed files contain no credentials or environment files.

Ingestion tests execute real isolated SQLite persistence through the existing adapter for PostgreSQL advisory locks and vector/JSON casts. Stored-text retrieval and API tests use the actual curated corpus with explicit catalog/provider doubles. These tests do not establish live vector similarity, PostgreSQL locking, constraints, RLS or provider accuracy.

Five representative questions passed the existing real stored-text evaluation:

| Question | Expected source | Observed local result |
|---|---|---|
| What schemes could support farmers in Punjab? | PM-KISAN | Ranked first |
| Are there verified government schemes for students? | NMMSS | Ranked first |
| What documents are required for Sukanya Samriddhi Yojana? | SSY | Ranked first |
| Can a person from Haryana without Punjab domicile apply for Punjab Ashirwad? | Punjab Ashirwad | Ranked first |
| Tell me about the Galactic Farming Grant, a scheme not in the database. | None | No evidence |

These results measure deterministic lexical retrieval over the stored corpus, not live semantic answer quality or personalized eligibility.

## Actual API responses

[Fresh full response captures](remaining-phase1-api-examples.json) were generated by the existing API test, using FastAPI TestClient, the actual corpus in isolated SQLite and explicit provider-outage/catalog doubles:

- `GET /api/schemes?query=Sukanya%20Samriddhi%20documents&limit=5`: 200, `X-Scheme-Retrieval: lexical_fallback`, stored SSY card.
- `POST /api/schemes/ask` with the SSY document question: 200, `mode: extractive_fallback`, real stored excerpt and SSY's official PIB URL; both fallback stages are labelled.
- `POST /api/schemes/ask` with the unsupported Galactic Farming Grant question: 200, `mode: insufficient_evidence`, `citations: []`, no invented scheme.

The capture records complete actual response bodies, rather than shortened or manually composed JSON examples. This is local API integration evidence, not hosted-service evidence.

## Exact commands

From the repository root, local checks executed:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m pytest services/api/tests/test_rag_foundation.py services/api/tests/test_schemes.py services/api/tests/test_corpus_validation.py -q
.\.venv\Scripts\python.exe -m pytest services/api/tests/test_rag_foundation.py -k api_exposes -s -q
.\.venv\Scripts\python.exe -m pip check
npm.cmd --prefix apps/web run test:client
npm.cmd --prefix apps/web run build
$env:PYTHONPATH = 'services/api'
.\.venv\Scripts\python.exe -m app.scripts.ingest_schemes --validate-only
.\.venv\Scripts\python.exe -m app.scripts.check_db
.\.venv\Scripts\python.exe -m app.scripts.evaluate_schemes
git diff --check
```

For an authorized development environment, configure the existing ignored server `.env` with `DATABASE_URL`, `EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS`, `OPENAI_API_KEY` and `LLM_MODEL`. First verify the existing migration history, including `001_initial.sql` and `002_scheme_vectors.sql`, using the repository's established migration instructions. Then run the following **pending live commands**, which write scheme records and can incur provider charges:

```powershell
$env:PYTHONPATH = 'services/api'
.\.venv\Scripts\python.exe -m app.scripts.ingest_schemes --validate-only
.\.venv\Scripts\python.exe -m app.scripts.ingest_schemes
.\.venv\Scripts\python.exe -m app.scripts.ingest_schemes
.\.venv\Scripts\python.exe -m app.scripts.evaluate_schemes
$env:JANSEVA_LIVE_RAG = '1'
.\.venv\Scripts\python.exe -m pytest services/api/tests/test_schemes_live.py -q
Remove-Item Env:JANSEVA_LIVE_RAG
```

Confirm the second ingestion creates no new embeddings/duplicate current rows, review all five live answers against their retrieved sources, and check deployed API access. No live migration, ingestion, provider request, push or unrelated merge was performed in this follow-up.

## Commit scope and acceptance

Files changed: `services/api/app/scripts/ingest_schemes.py`, `services/api/tests/test_rag_foundation.py`, this report and `docs/remaining-phase1-api-examples.json`. Commit message: `feat(dev-a): complete scheme RAG retrieval and citations`. The final response supplies the actual commit SHA and Git status.

Phase 1 passes local deterministic acceptance checks: persistent source-backed search, traceable citations, repeatable ingestion, safe missing-evidence handling and existing-functionality regressions. **Overall live-service acceptance remains pending**, because no configured PostgreSQL/pgvector/provider environment is available. No Phase 2 work was started by this follow-up.
