# API contract — Day 1 shared boundary

Base path: `/api`. JSON requests and responses. Protected calls send `Authorization: Bearer <Supabase access token>`. Backend verifies token signature/claims and resolves role server-side; never trust a role sent by the client.

Phase 2 registered routes: `GET /health`, `GET /me`, `POST /complaints`, `GET /complaints`, `GET /complaints/{id}`, `PATCH /officer/complaints/{id}` and `PATCH /complaints/{id}/official-ref`. Scheme/AI/agent routes in the target table below remain unimplemented. `/me` returns `{user_id, name, role, state, occupation}` from the server-controlled profile. Resource/user IDs are UUIDs. No random frontend ticket ID is generated.

`ComplaintCreate` accepts only `{title, description, category, locality}`. A citizen's verified identity supplies ownership; the create response is 201 with `ComplaintDetail`. List returns `ComplaintDetail[]` including events for the existing list timelines, scoped to citizen ownership or officer assignment; `?status=` optionally filters. Officer PATCH accepts `{status, note?}` and advances exactly one step: `LOCAL_SUBMITTED -> UNDER_REVIEW -> IN_PROGRESS -> RESOLVED`. Invalid transitions return 409. Update and audit event commit atomically. Notes may be omitted, in which case the server records a default note.

The owner-only reference route accepts `{official_ref}` and returns `ComplaintDetail` with the unverified user-reported reference. `official_status` is `NOT_FILED` until the citizen supplies a reference, then `USER_REPORTED_FILED`. Internal status never implies government filing/resolution. See [Phase 2 setup](phase-2-setup.md) for assignment configuration, tests and live verification limits.

## Routes

| Method | Route | Request | Response |
|---|---|---|---|
| GET | `/health` | none | `{ "status": "ok" }` |
| GET | `/me` | authenticated | `Profile` |
| GET | `/schemes?query=&state=&category=&limit=` | optional filters | `SchemeCard[]` |
| POST | `/schemes/ask` | `{ "message": string, "profile"?: ProfileInput }` | `{ "answer": string, "citations": Citation[], "tool_trace": ToolTrace[] }` |
| POST | `/schemes/eligibility` | `{ "scheme_id": string, "profile": ProfileInput }` | `{ "status": EligibilityStatus, "reasons": string[], "missing": string[], "citations": Citation[] }` |
| POST | `/complaints/analyze` | `{ "title": string, "description": string, "locality": string }` | `{ "category": ComplaintCategory, "department": string, "duplicates": DuplicateSuggestion[], "draft": string }` |
| POST | `/complaints` | confirmed `ComplaintCreate` | 201 `ComplaintDetail` with `LOCAL_SUBMITTED` internal status |
| GET | `/complaints?status=` | authenticated + ownership/assignment scope | `ComplaintDetail[]` |
| GET | `/complaints/{id}` | authenticated + owner/officer check | `ComplaintDetail` including internal events |
| PATCH | `/officer/complaints/{id}` | assigned officer only: `{ "status": InternalStatus, "note"?: string }` | updated `ComplaintDetail`; append audit event |
| PATCH | `/complaints/{id}/official-ref` | citizen owner: `{ "official_ref": string }` | `ComplaintDetail`; internal status unchanged |
| POST | `/agent/message` | `{ "message": string, "session_id"?: string }` | `{ "intent": "scheme"|"complaint"|"mixed"|"clarify", "response": string, "citations": Citation[], "actions": ToolTrace[] }` |

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

