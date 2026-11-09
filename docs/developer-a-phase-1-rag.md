# Developer A — Day 1 Phase 1: Scheme RAG foundation

Reviewed 2026-11-09 (Asia/Calcutta). **Local implementation is verified; hosted PostgreSQL/pgvector/provider completion remains blocked.** No later phase was started.

## Audit and existing work reused

Root: `C:\Projects\JanSeva-Combined-Latest`. Branch: `developer-a/final-ai`. Starting HEAD: `c4fa4dc67e4a98413083a762c1243cd476e67501`; origin: `https://github.com/JanSevaAIHub/Jan_Seva.git`. Recent history contains combined-work stabilization, integration helpers and Developer B's category/role work. No pull, reset, merge, migration or production write was performed.

The starting working tree already contained the prior request's 12-record dataset, corpus validation and eligibility implementation, with no staged files. Those changes were inspected and backed up under ignored `.tmp/rag-phase1/`. The audit checked scheme routes, AI/provider/retrieval modules, ingestion, migrations/models, JSON/vector constraints, source files, API contract, frontend scheme adapter, dependencies and tests. No repository AGENTS.md or blueprint PDF was available; the supplied Phase 1 requirements and existing repository contracts define this implementation's scope.

Already implemented: real provider REST calls, configured model/dimensions, pgvector cosine SQL, filters, list/ask endpoints, strict paragraph selection, citation validation, per-process request budgets, transaction/upsert/advisory-lock ingestion and an opt-in live evaluation. These were extended rather than replaced. The initial working-tree baseline passed **186 backend tests, 1 skipped**. Gaps were source cleaning/chunk metadata, database column-dimension checks, stored-text fallback, ingestion rerun coverage and source-injection tests.

## Dataset

The corpus has **12 official-source scheme records, 12 distinct source files and 12 practical chunks**: PM-KISAN, NMMSS, PMSBY, PMJJBY, APY, SSY, PM Vishwakarma, Punjab Ashirwad, PM-SYM, IGNOAPS, IGNWPS and IGNDPS. It includes national schemes and a Punjab scheme; the three NSAP additions describe only the reviewed Ladakh implementation. IDs remain stable. The original eight records' original CSV fields and source notes are preserved, verified by a canonical-field digest test.

The prior task's four additions are included in this Phase 1 dataset commit:

- PM-SYM: [Ministry of Labour backgrounder](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2108082&lang=2&reg=3), reviewed 2026-11-09. Its ministry-linked application portal is retained.
- IGNOAPS, IGNWPS and IGNDPS: [Ladakh government pension page](https://helphub.ladakh.gov.in/landing/pension), reviewed 2026-11-09. Document records are limited to that region's supported list; nationwide requirements and benefit amounts are not inferred.

These sources were rechecked during this task. [PM-KISAN's official source](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2191651&lang=2&reg=48) was also rechecked before adding its explicit income-tax exclusion to structured rules. Every record now has at least one supported condition; incomplete rules retain explicit unresolved conditions. A structured subset is not an exhaustive eligibility policy. Original review dates are preserved. The other original source reviews remain the previously curated evidence, not fresh claims of live page currency. See the [source manifest](../data/README.md).

## Implementation

- Cleaning removes BOM/control characters, normalizes Unicode/spacing and keeps headings/paragraph boundaries. Chunking targets roughly 250–450 estimated English tokens within the retained 1,800-character limit. It uses a four-character token estimate, not an exact model tokenizer; short sources and final tails are retained without padding.
- Chunk metadata now includes scheme ID, source URL, heading/title, review date, evidence file/kind, content hash, chunk version and estimated token count. `clean-paragraph-v2` content-derived UUIDs preserve superseded source passages as inactive. Unchanged content reuses vectors on rerun; changed model/dimensions re-embed the same text safely.
- Existing PostgreSQL upserts, per-scheme transactions, corpus ownership checks and advisory locks are retained. Vector batch count, nonzero/finite values and dimensions are checked before writes. Any invalid corpus row stops the CLI before database writes. Failed embedding work rolls back the whole record; no duplicate scheme/current chunk records are created on exact reruns.
- Ingestion and query still use the same configured embedding provider/model/dimension. PostgreSQL catalog checks verify that the vector column exists, has pgvector type and either supports arbitrary dimensions or matches the configured fixed dimension. Existing migration 002 already permits arbitrary dimensions and enforces per-row dimensions. No migration or second vector store was added. The dimension/type behavior was checked against [pgvector documentation and source](https://github.com/pgvector/pgvector).
- Vector retrieval remains parameterized exact cosine search, with active-source/model/dimension/score/state/category filtering and up to five evidence chunks. Chunk URLs must match their stored scheme URL. Malformed stored passages are skipped safely.
- A configured embedding provider's failure or missing API key can use deterministic lexical ranking over actual current stored chunks. It uses bounded candidates (200), Unicode word terms, light English plural normalization, document-frequency weighting and title boosts. Strong stored title/acronym matches keep named requests within that scheme. No synthetic records/vectors are generated. Missing model/dimension configuration, schema mismatches and database errors still fail closed.
- Generation retains separate trusted instructions, strict schema selection, exact stored-paragraph checks, official URL checks and known chunk-ID checks. Common source-injection markers quarantine entire passages before either model selection or extractive fallback. This conservative guard complements the existing data-only prompt; it is not a complete detector. Insufficient evidence remains an uncertainty response with no citations.

Shared curated-rule validation moved to `app/ai/scheme_rules.py`, allowing the dataset/RAG commit to stand independently of the previously uncommitted eligibility evaluator. Existing eligibility behavior was regression-tested in the full working tree, but its endpoint/evaluator/tests are excluded from this Phase 1 commit.

## API contracts and actual responses

Existing response bodies remain compatible with the frontend adapter:

- `GET /api/schemes?query=&state=&category=&limit=` returns actual stored `SchemeCard[]`; list limits are 1–50, with up to five retrieved chunks before scheme deduplication. `X-Scheme-Retrieval` distinguishes `stored_records`, `pgvector_cosine_retrieval` and `lexical_fallback`.
- `POST /api/schemes/ask` keeps `{answer, citations, tool_trace, mode}`. Citations already carry scheme references and supporting excerpts. Existing modes remain `grounded_extracts`, `extractive_fallback` and `insufficient_evidence`. Lexical fallback is visible in the answer and first tool trace; generation fallback remains separately labelled.

[Captured API responses](phase-1-rag-examples.json) contain complete actual TestClient responses using the real corpus stored in isolated SQLite, with explicit provider-outage/catalog doubles. These are not fabricated example bodies or hosted-service evidence:

| Request | Actual local result |
|---|---|
| GET query `Sukanya Samriddhi documents`, limit 5 | 200; `X-Scheme-Retrieval: lexical_fallback`; SSY stored card |
| POST SSY document question | 200; `extractive_fallback`; visible lexical label; only the SSY official source cited with stored text |
| POST unknown Galactic Farming Grant | 200; `insufficient_evidence`; no citations |

The shared [API contract](api-contract.md#scheme-rag-foundation-update-2026-11-09) documents fallback/error behavior. No frontend UI, complaint/auth/officer logic or model/database schema was replaced.

## Test evidence

| Run | Passed | Failed | Skipped |
|---|---:|---:|---:|
| Initial full working-tree baseline | 186 | 0 | 1 |
| Final full working tree, including preserved eligibility tests | 218 | 0 | 1 |
| Phase 1 commit snapshot, excluding unrelated eligibility work | 178 | 0 | 1 |
| Focused RAG foundation/corpus/scheme suite | 69 | 0 | 0 |
| New RAG foundation file, included above | 32 | 0 | 0 |
| Frontend client tests | 11 | 0 | 0 |

Production build passed. Corpus validation: **12 records, 0 failures, 12 chunks**. Diff whitespace checks passed. Backend runs retain one inherited Starlette/httpx deprecation warning. Counts overlap and should not be summed.

The new tests first reproduced **17 failures/6 passes** for missing cleaning, schema checks, fallback and source safety. The first combined implementation run had **98 passes/2 failures** from shared request-budget state; isolated test budgets resolved those without weakening production limits. Further test-first cases reproduced missing PM-KISAN structured rules, cross-scheme document fallback, and three malformed-metadata crashes, then passed after fixes. Tests exercise valid/repeated ingestion, changed-source retention, rollback, corpus ownership, invalid vectors/metadata, filters, expected sources, provider/key failures, sanitized DB failures and prompt-injection quarantine. Retained tests cover invalid queries, fabricated answer/citation rejection, auth, complaints and officer behavior.

Ingestion tests execute real isolated SQLite upserts and transactions through an adapter that only emulates PostgreSQL advisory-lock and vector/JSON cast operations. They verify persisted row counts, unchanged reruns, vector-call avoidance, rollback and metadata. They do **not** certify PostgreSQL locking, RLS, vector operators or live idempotence. The separate opt-in live test retains those gates.

Five representative questions were evaluated against actual stored corpus text using deterministic lexical retrieval:

| Question | Expected source | Local result |
|---|---|---|
| Farmer support in Punjab | PM-KISAN | Expected source ranked first |
| Student schemes | NMMSS | Expected source ranked first |
| SSY documents | SSY | Expected source ranked first |
| Haryana applicant/Punjab domicile | Punjab Ashirwad | Expected source ranked first |
| Galactic Farming Grant | None | No evidence |

This is local lexical evaluation on five fixed questions, not a live semantic retrieval accuracy claim. The existing five-question grounded-answer/citation tests with labelled doubles also pass.

Commands executed from repository root:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m pytest services/api/tests/test_rag_foundation.py services/api/tests/test_schemes.py services/api/tests/test_corpus_validation.py -q
.\.venv\Scripts\python.exe -m pytest services/api/tests/test_rag_foundation.py -k api_exposes -s -q
$env:PYTHONPATH = 'services/api'
.\.venv\Scripts\python.exe -m app.scripts.ingest_schemes --validate-only
.\.venv\Scripts\python.exe -m app.scripts.check_db
.\.venv\Scripts\python.exe -m app.scripts.evaluate_schemes
npm.cmd --prefix apps/web run test:client
npm.cmd --prefix apps/web run build
git diff --check
git diff --cached --check
```

The exact staged commit was exported to an ignored snapshot using `git checkout-index`; its backend suite and validate-only command were run using the workspace virtualenv. This checks that the commit works without the uncommitted eligibility module/route. Browser E2E was not rerun for this backend/data scope; prior browser counts remain historical.

## Live checks and limitations

`check_db` exited 1 with `DATABASE_URL is not configured`. All five real `evaluate_schemes` cases returned `blocked` for that same reason. No backend `.env`, model/API configuration, PostgreSQL tools or Docker are present in this checkout. The paid live test remains skipped. No live ingestion, DDL, Supabase record mutation or model call was run.

Before claiming hosted Phase 1 completion, configure an explicitly authorized development database/provider, verify existing migrations, validate then ingest the corpus, rerun ingestion to confirm no new embeddings/duplicate active rows, and execute the opt-in live suite plus five-question relevance review. First ingestion of chunk version v2 creates new identities/vectors while retiring previous ones; this can incur provider cost. Region-specific source coverage, historical source currency, approximate token sizing and bounded English-oriented lexical ranking remain documented limits. No UI work or later-phase implementation is part of this task.

## Commit scope and changed files

Commit message: `feat(dev-a): complete scheme retrieval and cited RAG`, on `developer-a/final-ai`. The final chat reports the actual commit SHA. No push is performed.

- `README.md`
- `data/README.md`, `data/schemes.csv`
- `data/scheme_sources/{ignoaps,ignwps,igndps,pm-sym}.txt`
- `docs/api-contract.md`, `docs/implementation-status.md`, `docs/phase-3-setup.md`
- `docs/developer-a-phase-1-rag.md`, `docs/phase-1-rag-examples.json`
- `services/api/app/ai/{corpus,rag,retrieval,scheme_rules}.py`
- `services/api/app/routers/schemes.py` (only list/retrieval changes in the commit)
- `services/api/app/scripts/ingest_schemes.py`
- `services/api/tests/{test_schemes,test_schemes_live,test_corpus_validation,test_rag_foundation}.py`

Prior eligibility-related README/contract/status/router hunks remain unstaged. `docs/developer-a-prompt-1.md`, `app/ai/eligibility.py` and `tests/test_eligibility.py` remain untracked, with the prior task's functionality preserved and tested. The commit includes only the dataset/RAG foundation and its shared rule-data validation, not the eligibility endpoint. Do not interpret the intentionally non-clean working tree as lost or failed work.
