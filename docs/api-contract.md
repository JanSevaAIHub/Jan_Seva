# JanSeva API contract

Updated 2026-11-19. Base path: `/api`. JSON responses and JSON request bodies except the binary evidence upload. Errors use `{detail: {code, message}}`. Protected requests carry a verified Supabase user JWT in `Authorization: Bearer ...`. Roles come from database profiles.

| Method / route | Request and behavior |
|---|---|
| `GET /health` | Process health only: `{status: "ok"}` |
| `GET /me` | Authenticated server-owned `{user_id, name, role, state, occupation}` |
| `GET /schemes` | Optional `query` (3-1000 chars), `state`, `category`, `limit` (1-50), `search_mode=semantic|keyword`. Default semantic; UI explicitly requests keyword search, which needs no model. Returns stored `SchemeCard[]`; state includes national records. |
| `POST /schemes/ask` | `{message, profile?: {state?, occupation?}, state?, category?, history?: string[]}`. At most five prior user questions, each 1-1000 chars. Returns `{answer, citations, tool_trace, mode}`. |
| `POST /schemes/screen` | `{scheme_id: UUID, profile: EligibilityProfile}`. Returns `{scheme_id, title, status, reasons, missing_fields, notice, source_url, reviewed_at}`. No LLM. |
| `POST /agent/conversation` | `{message, profile?: {state?, occupation?}, history?: [{role: "user"|"assistant", content}]}`. Max ten turns, each 1-5000 chars. Returns `{intent, answer, citations, tool_trace, mode, complaint}`. No writes. |
| `POST /agent/message` | LangGraph navigator: `{message, session_id?, profile?, scheme_id?, complaint?}` -> `{session_id, intent, response, status, citations, actions, tool_trace, eligibility}`. Intent uses `clarify`; action paths are allowlisted and complaint actions require review. |
| `POST /schemes/eligibility` | Stored evidence-backed rules: `{scheme_id, profile}` -> `{scheme_id, status, matched_rules, missing_fields, reasons, citations}`. Profile supports exact values/ranges, income periods and source-backed conditions. |
| `POST /complaints/analyze` | Citizen only: `{title, description, locality}`. Returns `{category, draft, department, next_action, mode, notice, similar_complaints, similarity_note}`. Similarity considers only the caller's latest 100 tickets. |
| `POST /complaints` | Citizen explicitly confirms `{title, description, category, locality}`. Optional UUID `Idempotency-Key` header. Returns 201 `ComplaintDetail`; same owner/key/payload replays the same ticket, changed payload returns 409. |
| `GET /complaints` | Owner/assigned-officer scope. Optional `status`, `limit` (1-100, default 100), `offset` (0-100000). Returns `ComplaintDetail[]`. UI bounds loaded history at 1,000 and labels that limit. |
| `GET /complaints/{id}` | Authorized `ComplaintDetail` including persistent events |
| `PATCH /officer/complaints/{id}` | Assigned officer: `{status, note?}`. Exactly one next status; atomic compare-and-set plus event. |
| `PATCH /officer/complaints/{id}/routing` | Assigned officer: `{category}`. Persists internal category/recommended department and same-status event; no external referral. Identical category is a no-op. |
| `PATCH /complaints/{id}/official-ref` | Citizen owner: `{official_ref}`. Records an unverified filing reference; internal status unchanged. |
| `GET /complaints/evidence-config` | Public `{max_bytes, mime_types}` |
| `POST /complaints/{id}/evidence` | Citizen owner: raw image bytes, image `Content-Type`, percent-encoded `X-Filename`. Returns 201 `{id, filename, mime_type, size_bytes, created_at}`. One photo per ticket; a replacement uses a fresh object, commits new metadata, then cleans up the old object. |
| `GET /complaints/{id}/evidence` | Owner/assigned officer: metadata array, empty when absent; no object paths or URLs |
| `GET /complaints/{id}/evidence/{evidence_id}/access` | Owner/assigned officer: `{url, expires_in: 300}`. `Cache-Control: private, no-store`; private-bucket check before signing. |

## Validation and security

- `ComplaintCategory`: `road | water | sanitation | streetlight | other`.
- New complaint: title 3-250 chars, description 10-5000, locality 2-250. Extra fields forbidden. Ownership, status, role and assignment are never citizen inputs.
- Status progression: `LOCAL_SUBMITTED -> UNDER_REVIEW -> IN_PROGRESS -> RESOLVED`. Invalid progression: 409. Old stored statuses remain readable.
- Government filing: `NOT_FILED` or `USER_REPORTED_FILED`; never infer official registration or resolution from an internal action.
- Eligibility: `POTENTIAL | NOT_MATCHED | NEEDS_INFO`. Optional profile fields: state, age, annual_income, bank_account, auto_debit_consent, income_tax_payer, landholding_farmer, government_employee_family, indian_citizen, girl_child, punjab_domicile, covered_social_category, notified_artisan_trade, recent_similar_credit, school_type, class_level, selected_state_exam, class_vii_marks, sc_st. Unknown facts stay null. Screening covers limited curated conditions, not a guarantee.
- Agent intents: `scheme | complaint | mixed | unknown`. Unknown intent returns deterministic clarification. Mixed intent preserves a successful tool result and reports an unavailable part. Complaint responses are labelled editable suggestions; there is no submission tool.
- Scheme answer modes: `grounded_extracts | extractive_fallback | insufficient_evidence`. Agent additionally uses `ai_suggestion | clarification`. A fallback is explicitly labelled and never invents an embedding. Citations must match complete stored paragraphs, known chunks and official URLs.
- Shared model budget: 10 requests/client/minute, 30 total/minute, two concurrent per process. Keyword listing and deterministic eligibility do not use the model budget. Excess work: 429 and `Retry-After`.
- Images: JPEG, PNG, WebP; default 5 MB (`EVIDENCE_MAX_BYTES`), max 20 megapixels, still images only. Server decodes/re-encodes, clears metadata and checks actual MIME. Invalid image: 422, excessive bytes: 413. Storage/provider configuration failures: sanitized 503. Failed photo upload retains the complaint and allows a photo-only retry.
- Missing/invalid JWT: 401. Wrong role: 403. Unauthorized private resource: non-disclosing 404. Metadata/signing responses are not cacheable. Signed links remain bearer capabilities until expiry.
- Browser CORS accepts only configured origins and supports `Authorization`, `Content-Type`, `Idempotency-Key`, `X-Filename`.

The SQL migration is reviewed code, not evidence of a hosted schema. Apply only to an explicitly verified development project with approval and backup/recovery arrangements. See [final release verification](FINAL-JANSEVA-BUG-FIX-REPORT.md).


## Main-branch integration

The richer homepage LangGraph navigator keeps the Developer A `/agent/message` request/response contract (session UUID, structured profile, scheme selection, explicit draft proposal, `response`, `actions`, `eligibility` and `tool_trace`). The focused citizen composer contract documented above is available at `/agent/conversation`. Stored evidence-backed rules use `/schemes/eligibility`; the eight-record limited quick-check contract above is preserved at `/schemes/screen`. See [Developer A API details](developer-a-phase-2-ui.md) and [agent handoff](dev-a-day1-handoff.md). No mutation tool is added.
