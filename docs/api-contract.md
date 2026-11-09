# API contract — Day 1 shared boundary

Base path: `/api`. JSON requests and responses. Protected calls send `Authorization: Bearer <Supabase access token>`. Backend verifies token signature/claims and resolves role server-side; never trust a role sent by the client.

Phase 2 registered routes: `GET /health`, `GET /me`, `POST /complaints`, `GET /complaints`, `GET /complaints/{id}`, `PATCH /officer/complaints/{id}` and `PATCH /complaints/{id}/official-ref`. Scheme routes are public `GET /schemes`, `POST /schemes/ask` and `POST /schemes/eligibility`; complaint AI and agent routes remain unimplemented. `/me` returns `{user_id, name, role, state, occupation}` from the server-controlled profile. Resource/user IDs are UUIDs. No random frontend ticket ID is generated.

`ComplaintCreate` accepts only `{title, description, category, locality}`. A citizen's verified identity supplies ownership; the create response is 201 with `ComplaintDetail`. List returns `ComplaintDetail[]` including events for the existing list timelines, scoped to citizen ownership or officer assignment; `?status=` optionally filters. Officer PATCH accepts `{status, note?}` and advances exactly one step: `LOCAL_SUBMITTED -> UNDER_REVIEW -> IN_PROGRESS -> RESOLVED`. Invalid transitions return 409. Update and audit event commit atomically. Notes may be omitted, in which case the server records a default note.

The owner-only reference route accepts `{official_ref}` and returns `ComplaintDetail` with the unverified user-reported reference. `official_status` is `NOT_FILED` until the citizen supplies a reference, then `USER_REPORTED_FILED`. Internal status never implies government filing/resolution. See [Phase 2 setup](phase-2-setup.md) for assignment configuration, tests and live verification limits.

## Routes

| Method | Route | Request | Response |
|---|---|---|---|
| GET | `/health` | none | `{ "status": "ok" }` |
| GET | `/me` | authenticated | `Profile` |
| GET | `/schemes?query=&state=&category=&limit=` | optional filters | database `SchemeCard[]`; vector query when provided |
| POST | `/schemes/ask` | `{ "message": string, "profile"?: {state?, occupation?}, "state"?: string, "category"?: string }` | `{ "answer": string, "citations": SchemeCitation[], "tool_trace": ToolTrace[], "mode": string }` |
| POST | `/schemes/eligibility` | `{ "scheme_id": UUID, "profile": EligibilityProfile }` | `{ "scheme_id": UUID, "status": EligibilityStatus, "matched_rules": string[], "missing_fields": string[], "reasons": string[], "citations": EligibilityCitation[] }` |
| POST | `/complaints/analyze` | `{ "title": string, "description": string, "locality": string }` | `{ "category": ComplaintCategory, "department": string, "duplicates": DuplicateSuggestion[], "draft": string }` |
| POST | `/complaints` | confirmed `ComplaintCreate` | 201 `ComplaintDetail` with `LOCAL_SUBMITTED` internal status |
| GET | `/complaints?status=` | authenticated + ownership/assignment scope | `ComplaintDetail[]` |
| GET | `/complaints/{id}` | authenticated + owner/officer check | `ComplaintDetail` including internal events |
| PATCH | `/officer/complaints/{id}` | assigned officer only: `{ "status": InternalStatus, "note"?: string }` | updated `ComplaintDetail`; append audit event |
| PATCH | `/complaints/{id}/official-ref` | citizen owner: `{ "official_ref": string }` | `ComplaintDetail`; internal status unchanged |
| POST | `/agent/message` | `{ "message": string, "session_id"?: string }` | `{ "intent": "scheme"|"complaint"|"mixed"|"clarify", "response": string, "citations": Citation[], "actions": ToolTrace[] }` |

## Phase 3 implemented scheme boundary

- `GET /schemes?query=&state=&category=&limit=` returns actual stored `SchemeCard[]`. Without `query`, listing needs only the database. With a query, exact pgvector cosine retrieval uses the configured OpenAI embedding model. A selected state includes national schemes; category is an exact case-insensitive filter. Limit is 1-50 for listing and query retrieval considers at most five passages before scheme deduplication.
- `POST /schemes/ask` accepts `{message, profile?: {state?, occupation?}, state?, category?}`. It returns `{answer, citations, tool_trace, mode}`. `mode` is `grounded_extracts`, `extractive_fallback` or `insufficient_evidence`.
- Citations contain `{scheme_id, chunk_id, title, url, excerpt, reviewed_at, evidence_kind}` from retrieved source records. Evidence is a reviewed paraphrase, not a verbatim source quote. Unsupported model text/URLs and partial-paragraph selections are removed before display.
- Missing embedding model/dimension configuration or invalid vector schema returns sanitized retryable 503. A provider outage or missing API key can use labelled lexical retrieval over actual stored chunks. Empty/insufficient evidence returns uncertainty with no citations. LLM failure is explicitly labeled if related extracts are returned. No fabricated scheme/vector fallback or eligibility guarantee exists.
- See [Phase 3 setup](phase-3-setup.md) for additive migration 002, ingestion, source review, tests and live blockers. `SchemeCard` includes the stored fields plus curated eligibility, document records and evidence/limitations for the retained UI; no invented match score is returned.

## Shared types

- `EligibilityStatus`: `POTENTIAL | NOT_MATCHED | NEEDS_INFO`.
- `ComplaintCategory`: `road | water | sanitation | streetlight | other`.
- Phase 2 writable `InternalStatus`: `LOCAL_SUBMITTED | UNDER_REVIEW | IN_PROGRESS | RESOLVED`. Storage retains older Phase 1 enum values for existing data; the new workflow cannot transition into them.
- `OfficialFilingStatus`: `NOT_FILED | USER_REPORTED_FILED`. Never derive this from an internal status or portal link click.
- `ProfileInput`: optional `state`, `occupation`, `age_range`, and income band only as needed; no Aadhaar or identity documents.
- `Citation`: `{ "title": string, "url": string, "excerpt"?: string, "reviewed_at"?: string }`. A scheme claim must have a verified official URL.
- `ToolTrace`: `{ "tool": string, "status": "ok"|"skipped"|"error" }`; no raw prompts, credentials, or PII.

## Errors and validation

Errors are `{ "detail": { "code": string, "message": string } }`. Pydantic validation: 422; missing/invalid token: 401; forbidden resource: 403 or non-disclosing 404. AI failures return a retryable error without deleting a local complaint draft. All external filing requires a separate user action; the agent cannot create a complaint directly.


## Deterministic eligibility endpoint (2026-11-09)

`POST /api/schemes/eligibility` is public and read-only, like stored scheme listing. It requires a real stored scheme UUID, not a slug or synthetic `S001` ID. It performs a database lookup through `get_db`, never reads the CSV as an API fallback, calls no model/provider and stores no submitted profile. Existing GET and ask payloads are unchanged.

```json
{
  "scheme_id": "2fa9a24a-4d17-5639-9e11-8d5624196722",
  "profile": {
    "age": 22,
    "participating_account": true,
    "auto_debit_consent": true
  }
}
```

For this stored PMSBY record with current structured rules, the response is:

```json
{
  "scheme_id": "2fa9a24a-4d17-5639-9e11-8d5624196722",
  "status": "POTENTIAL",
  "matched_rules": ["Age must be at least 18", "Age must be at most 70", "Participating bank or post-office account: Yes", "Auto-debit consent: Yes"],
  "missing_fields": [],
  "reasons": ["Assessment covers reviewed conditions only; official eligibility is not guaranteed. Confirm current terms with the administering authority."],
  "citations": [{
    "scheme_id": "2fa9a24a-4d17-5639-9e11-8d5624196722",
    "title": "Pradhan Mantri Suraksha Bima Yojana (PMSBY)",
    "url": "https://financialservices.gov.in/pmsby",
    "reviewed_at": "2026-11-07T00:00:00+05:30",
    "excerpt": "Individual account holders aged 18 to 70 at participating banks or post offices may join through one account. Enrolment requires consent to premium auto-debit. Scheme terms determine covered losses; account ownership and age alone do not confirm that insurance is active.",
    "evidence_kind": "reviewed_paraphrase"
  }]
}
```

`EligibilityProfile` accepts optional `age` (strict integer 0-150), `state`, `occupation` (2-100 characters), nonnegative finite numeric `annual_income` and `monthly_income` (INR, distinct periods, no implicit conversion), `disability_percent` (0-100), and strict booleans `bpl_household`, `widow`, `unorganised_worker`, `epf_esic_nps`, `income_taxpayer`, `other_government_pension`, `participating_account`, `auto_debit_consent`. Null means unknown; omitted values are never assumed true or false. Unexpected fields, numeric strings, boolean strings and invalid numbers return 422. Do not send Aadhaar numbers, documents or account identifiers.

Version 1 stored rules use `gte`, `lte`, case-insensitive `eq`, `present` and `coverage`. Every condition contains a supporting passage from the stored reviewed source note. A `present` rule only collects information; it cannot establish a notified occupation. `coverage` gates assessment to the reviewed source's region; absent/unknown state or a different state returns `NEEDS_INFO` before regional exclusions are evaluated. This does not fabricate a national residency restriction.

Statuses are exactly `POTENTIAL`, `NOT_MATCHED`, `NEEDS_INFO`. Within applicable source coverage, a confirmed failed condition takes precedence over missing information. All conditions must be satisfied and no unmodeled conditions remain for `POTENTIAL`; this is not guaranteed official eligibility, active insurance or approval. Missing/ambiguous fields are listed in `missing_fields`. Unmodeled conditions and invalid/legacy rules are explained in `reasons`; do not treat an empty missing-fields list as approval. Missing or unsafe provenance yields `NEEDS_INFO` without unsafe citations. Eligibility citations reference the scheme source, so they have no fabricated chunk ID.

An absent stored UUID returns 404 `SCHEME_NOT_FOUND`; invalid payload/UUID returns 422 `VALIDATION_ERROR`. Missing database configuration returns 503 `DATABASE_NOT_CONFIGURED`; database errors use the existing sanitized 503 `DATABASE_UNAVAILABLE`. Older stored records with prose-only JSON return `NEEDS_INFO` until an operator safely reingests the versioned corpus. No migration or automatic ingestion runs on requests.

### Ranges and Scheme Navigator integration

Optional `age_range`, `monthly_income_range` and `annual_income_range` accept `{min, max}` with inclusive bounds and `min <= max`. Age bounds are strict integers 0-150; income bounds are finite nonnegative numbers in INR for the named period. Supply an exact value or its range, never both (422). Null/omitted values remain unknown. No monthly/annual conversion or midpoint guessing is performed.

The whole range must satisfy a condition to match it. A wholly contradictory range yields `NOT_MATCHED`; a range crossing a boundary yields `NEEDS_INFO` and requests more precise information in the canonical field, such as `age`. Applicable confirmed contradictions take precedence over missing/ambiguous fields. Regional coverage gates and unresolved source conditions remain unchanged. `matched_rules` are readable strings; consumers must not parse them as rule code. Each eligibility citation contains an exact supporting stored passage, so distinct passages may produce separate citations for the same scheme.

The existing Scheme Discovery UI uses the shared authenticated JSON client when signed in and the same transport's public wrapper for guest browsing. Profile edits exist only in provider memory for the current tab, survive in-app navigation, and clear on reload/account change. There is no writable `/me` profile contract and no claim of Supabase profile persistence. Editing a profile invalidates prior/pending assessments. A `POTENTIAL` result remains a provisional match to reviewed conditions, never approval.

Cards/details expose actual metadata, supported document records, official/application links and review dates. The source-evidence drawer shows validated API excerpts and their associated scheme. Unsafe, changed or mismatched eligibility citations cause an error rather than a displayed assessment. Search invalidation begins when filters/query change, including the debounce period. Chat errors retain the typed question for retry.

See [Phase 2 report](developer-a-phase-2-ui.md) and [captured eligibility responses](phase-2-eligibility-examples.json) for local integration evidence and live limitations.

## Scheme RAG foundation update (2026-11-09)

Both scheme endpoints retain their existing JSON contracts. Citations already contain scheme IDs/titles and supporting evidence in `excerpt`; no duplicate references/evidence payload is added.

- `GET /schemes` supports optional query, state, category and a bounded 1-50 list limit. Query retrieval considers up to five chunks before scheme deduplication. `X-Scheme-Retrieval` reports `stored_records`, `pgvector_cosine_retrieval` or `lexical_fallback`. The header is informational; list bodies remain `SchemeCard[]`.
- `POST /schemes/ask` retrieves up to five chunks. If embedding access fails after model/dimension and database schema checks, deterministic lexical ranking uses actual current stored chunks with the same state/category filters. It never creates scheme records or embeddings. The first tool trace is `lexical_fallback`, and any extractive/grounded answer includes a visible lexical-retrieval label. Existing `mode` values remain unchanged for frontend compatibility.
- Missing embedding model/dimension configuration and invalid database vector schema still return 503; a configured provider's outage or absent API key can use stored-text fallback. Database exceptions retain sanitized existing 503 errors; they are not masked as empty results. Plain listing never calls a model.
- Lexical ranking uses Unicode word terms, light English plural normalization, document-frequency weighting and title boosts over at most 200 current candidate chunks. Strong stored title/acronym matches restrict named-scheme results. Lexical scores are not cosine scores, confidence or eligibility percentages. This is bounded fallback for the small reviewed corpus, not a quality claim about semantic retrieval.
- Only actual active chunks whose source URL matches the stored scheme source can be cited. Malformed stored passage metadata is skipped. Complete-paragraph and exact URL/chunk-ID validation remain in force. Common instruction-injection markers quarantine a passage before generation or extractive fallback; this conservative guard is not a complete injection detector. Source text remains untrusted data under separate trusted provider instructions.
- Ingestion validates the entire corpus before writing, checks vector batch length/dimensions, and safely upserts within the existing per-scheme transactions/advisory locks. `clean-paragraph-v2` content-derived chunk IDs keep changed/superseded evidence inactive instead of replacing old cited text. An authorized first reingestion creates the new chunk identities and may incur embedding cost; exact reruns reuse them. No migrations or live ingestion run automatically.

See [the implementation report](developer-a-phase-1-rag.md) and [captured local API responses](phase-1-rag-examples.json). Live PostgreSQL/pgvector/provider checks remain blocked by missing configuration.
