# API contract — Day 1 shared boundary

Base path: `/api`. JSON requests and responses. Protected calls send `Authorization: Bearer <Supabase access token>`. Backend verifies token signature/claims and resolves role server-side; never trust a role sent by the client.

Phase 1 implementation boundary: only `GET /api/health` and `GET /api/me` are registered. Other routes below remain the agreed target, not available endpoints. `/me` returns `{user_id, name, role, state, occupation}` from the server-controlled profile. Citizen/officer and complaint-scope dependencies are implemented and tested for subsequent business routers; no complaint CRUD is exposed in Phase 1. Internal resource/user IDs are UUIDs; the frontend's `REQ-2025-*` identifiers are demo fixtures, not API IDs.

`ComplaintCreate` accepts only `{title, description, category, locality}`; the future create route must take ownership from `require_citizen`, never an input user ID/status. Response DTOs are `ComplaintSummary`, `ComplaintDetail` (including `events`) and `ComplaintEvent`. `ComplaintStatusUpdate` accepts an internal status and a nonempty note; validating allowed transitions remains the business route's responsibility. Stored official references remain independent from internal status. See [Phase 1 setup](phase-1-setup.md) for actual migration/auth scope and live-verification limits.

## Routes

| Method | Route | Request | Response |
|---|---|---|---|
| GET | `/health` | none | `{ "status": "ok" }` |
| GET | `/me` | authenticated | `Profile` |
| GET | `/schemes?query=&state=&category=&limit=` | optional filters | `SchemeCard[]` |
| POST | `/schemes/ask` | `{ "message": string, "profile"?: ProfileInput }` | `{ "answer": string, "citations": Citation[], "tool_trace": ToolTrace[] }` |
| POST | `/schemes/eligibility` | `{ "scheme_id": string, "profile": ProfileInput }` | `{ "status": EligibilityStatus, "reasons": string[], "missing": string[], "citations": Citation[] }` |
| POST | `/complaints/analyze` | `{ "title": string, "description": string, "locality": string }` | `{ "category": ComplaintCategory, "department": string, "duplicates": DuplicateSuggestion[], "draft": string }` |
| POST | `/complaints` | confirmed complaint draft | `ComplaintSummary` with `LOCAL_SUBMITTED` internal status |
| GET | `/complaints` | authenticated; officer may filter | `ComplaintSummary[]` |
| GET | `/complaints/{id}` | authenticated + owner/officer check | `ComplaintDetail` including internal events |
| PATCH | `/officer/complaints/{id}` | officer only: `{ "status": InternalStatus, "note": string }` | updated `ComplaintDetail`; append audit event |
| PATCH | `/complaints/{id}/official-ref` | owner: user-provided `{ "reference": string, "channel": string, "submitted_at"?: string }` | updated official-filing metadata only |
| POST | `/agent/message` | `{ "message": string, "session_id"?: string }` | `{ "intent": "scheme"|"complaint"|"mixed"|"clarify", "response": string, "citations": Citation[], "actions": ToolTrace[] }` |

## Shared types

- `EligibilityStatus`: `POTENTIAL | NOT_MATCHED | NEEDS_INFO`.
- `ComplaintCategory`: `road | water | sanitation | streetlight | other`.
- `InternalStatus`: `DRAFT | LOCAL_SUBMITTED | UNDER_REVIEW | IN_PROGRESS | RESOLVED | CANCELLED | REJECTED | REOPENED` (REOPENED is demo-only).
- `OfficialFilingStatus`: `NOT_FILED | USER_REPORTED_FILED | ACKNOWLEDGED`. Never derive this from an internal status or portal link click.
- `ProfileInput`: optional `state`, `occupation`, `age_range`, and income band only as needed; no Aadhaar or identity documents.
- `Citation`: `{ "title": string, "url": string, "excerpt"?: string, "reviewed_at"?: string }`. A scheme claim must have a verified official URL.
- `ToolTrace`: `{ "tool": string, "status": "ok"|"skipped"|"error" }`; no raw prompts, credentials, or PII.

## Errors and validation

Errors are `{ "detail": { "code": string, "message": string } }`. Pydantic validation: 422; missing/invalid token: 401; forbidden resource: 403 or non-disclosing 404. AI failures return a retryable error without deleting a local complaint draft. All external filing requires a separate user action; the agent cannot create a complaint directly.

