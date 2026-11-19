# Private evidence and controlled-release setup

Updated 14 November 2026. This guide describes implemented functionality and the remaining operator steps. It is **not evidence of a live deployment**. No database migration, bucket creation, role mutation, test-account creation or live storage write was executed during this audit.

## Required approval and configuration

Use a named isolated Supabase development/test project. Confirm its project reference, database target, approved test inboxes, designated officer, recoverable backup/restore evidence and written authorization for migration, bucket setup and test-data writes. Do not use production records for acceptance tests. Keep credentials in ignored `services/api/.env` / `apps/web/.env` or approved host secrets. Do not place private values in chat, shell arguments or `VITE_*` variables.

The backend still requires `DATABASE_URL`, `SUPABASE_URL`, `CORS_ORIGINS`, `OPENAI_API_KEY`, `LLM_MODEL`, `EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS`. Frontend public values are `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` for the same project. Real origins must agree with CORS and the Supabase Site URL / exact `/auth/callback` and `/auth/reset` allowlist. Confirm SMTP delivery and email-confirmation policy with two owned citizen inboxes.

For evidence, additionally configure:

- `SUPABASE_SERVICE_ROLE_KEY`: server/operator only; required for this server-mediated Storage integration. It remains unnecessary for ordinary JWT verification when evidence is disabled.
- `SUPABASE_EVIDENCE_BUCKET`: the dedicated bucket must be named **`janseva-complaint-evidence`**, matching the restrictive SQL policy.
- `EVIDENCE_UPLOAD_ENABLED`: default `false`; enable only after approved schema/storage setup and local security tests pass. The runtime also checks the bucket is private and the restrictive policy exists before accessing object bytes.

No buckets are created by the application. After approval, create the dedicated bucket in Supabase Storage with **public access off**, a 5 MiB object limit and only JPEG/PNG/WebP allowed. Do not add browser upload/read/delete policies for it or reuse an unrelated bucket. Supabase documents the privileged server-key and RLS distinction in [Storage access control](https://supabase.com/docs/guides/storage/security/access-control).

## Review migration 005 before applying anything

`services/api/migrations/005_private_evidence_and_submission_keys.sql` is additive:

1. Adds nullable `complaints.submission_key` and unique `(user_id, submission_key)`. Existing clients without a key retain distinct ticket creation.
2. Creates `complaint_evidence` metadata with complaint/owner foreign keys, unique upload attempts and three reserved slots, validated states/types/size, RLS enabled and browser table grants revoked.
3. Adds the restrictive `janseva_evidence_server_only` policy to `storage.objects`, applying to PUBLIC for all commands and excluding the dedicated evidence bucket. It does not replace existing policies or grant access to other buckets. Privileged service-role Storage requests still rely on their bypass-RLS privilege.
4. Creates **no bucket**, changes no role assignments and rewrites/deletes no historical complaint, event or vector data.

The core runner now executes **001 → 003 → 004 → 005** in one transaction, then validates six tables and their constraints. Vector migration **002** stays separate. A pre-existing policy of the same name is preserved, not silently replaced; a conflicting definition must be reviewed by the operator. Runtime catalog validation fails closed for a missing, permissive, differently scoped or changed policy.

The policy is restrictive so it still denies browser access when another permissive policy would otherwise allow it. PostgreSQL documents the policy-combination behavior in [CREATE POLICY](https://www.postgresql.org/docs/current/sql-createpolicy.html) and the catalog fields used by the runtime in [pg_policy](https://www.postgresql.org/docs/current/catalog-pg-policy.html).

Read-only inspection examples for the approved target's private SQL editor:

```sql
SELECT current_database(), current_user, version();
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name IN ('complaints', 'complaint_evidence');
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid IN (to_regclass('public.complaints'), to_regclass('public.complaint_evidence'));
SELECT id, public, file_size_limit, allowed_mime_types
FROM storage.buckets WHERE id='janseva-complaint-evidence';
SELECT c.relrowsecurity, p.polname, p.polpermissive, p.polcmd, p.polroles,
       pg_get_expr(p.polqual, p.polrelid), pg_get_expr(p.polwithcheck, p.polrelid)
FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid
WHERE p.polrelid=to_regclass('storage.objects') AND p.polname='janseva_evidence_server_only';
```

Catalog results and migration filenames are not backup evidence. Reuse the before/after complaint/event counts and recovery gates in [deployment-runbook.md](deployment-runbook.md). Only after named-target/backup/review/execution approval may an operator run the core migration command from that runbook. Existing Storage schema and sufficient policy-ownership privileges are required. Re-run the read-only checks afterward; do not claim applied/pending state without their results.

Safe read-only preflights (from repository root):

```powershell
$env:PYTHONPATH = 'services/api'
.\.venv\Scripts\python.exe -m app.scripts.check_configuration
.\.venv\Scripts\python.exe -m app.scripts.check_db
.\.venv\Scripts\python.exe -m app.scripts.check_evidence_storage
npm.cmd --prefix apps/web run check:deployment
```

The evidence preflight checks the actual restrictive policy and private bucket. It performs no uploads, deletes or bucket creation. Passing it does not verify end-to-end persistence or authorize a write test.

## Evidence request, retry and recovery behavior

The UI accepts up to three selected images and previews them locally. Review confirmation saves the complaint first, then uploads images using stable per-image attempt keys. The complaint draft and failed image bytes remain in the current tab on upload failure. Retry targets the **already saved ticket**, not another complaint. A browser reload discards unsaved file bytes; ready/pending metadata persists, and the citizen can remove incomplete operations through the tracking screen. Successful upload clears the submitted draft. A failed API create response can be retried with the same complaint submission key without creating a second ticket.

Each upload checks JWT/citizen ownership, bounds the body to 5 MiB, decodes the claimed format, rejects unsupported/malformed/animated/over-20-million-pixel files and re-encodes clean pixels. Original paths, filenames and EXIF/GPS/trailing payloads are not stored. Object names use server-controlled owner/complaint/evidence UUIDs and a validated extension. Three database slots include pending operations to prevent unbounded partial-upload accumulation.

Object storage and SQL do not share a transaction. A `PENDING` record and deterministic path commit **before** the remote object write. Only successful storage completion becomes `READY`. Timeout-after-write or a SQL failure leaves a tracked pending path. Retry with the same key/content overwrites only that path and completes the existing record. Conflicting content is rejected. Removal first persists `DELETE_PENDING`, deletes the object, then deletes metadata. A storage deletion failure leaves the record tracked, hidden from image reads and retryable. Do not remove pending rows directly in SQL: use the owner-authenticated delete endpoint so objects are removed too. Retention/administrative cleanup for abandoned accounts is an operator policy decision; automatic time-based deletion is not implemented.

Saved bytes are fetched through authenticated `GET /api/complaints/{id}/evidence/{evidenceId}/content`. JWT expiry, owner/assignment and the restrictive storage policy are checked on every read; response caching is disabled. The browser receives a revocable in-memory blob URL after the authorized fetch. There are **no public or signed Storage URLs** to expire: expired bearer credentials return 401 and require reauthentication. An officer can read only currently assigned tickets and cannot upload/delete citizen evidence. Previously downloaded pixels cannot be recalled from a user's memory or device.

## Explicit demo routing

The original `DEMO_CITIZEN_USER_ID` / `DEMO_OFFICER_USER_ID` pair is preserved. For an approved demo that includes newly registered citizens, enable `DEMO_ASSIGNMENT_ENABLED` and set `DEMO_DEFAULT_OFFICER_USER_ID` to an existing server-managed officer profile. This routes only **new tickets** from citizens outside the explicit pair; it does not grant officer roles, accept citizen-supplied assignees, widen queues or reassign old complaints. Invalid officer configuration returns a safe 503. Without opt-in configuration, non-pair tickets remain unassigned.

Use the existing approved operator role setup only after confirming the target and specific officer account. Do not promote a user merely to satisfy a test. Historical unassigned tickets require a separately authorized administrative operation; no unrestricted assignment API was added.

## Live acceptance evidence required

Record actual results on the named development target for:

1. Citizen A signup → confirmation email → valid login → `/me` profile identity/name/state/occupation stored in PostgreSQL. Repeat for citizen B. Duplicate signup, wrong password and expired recovery links must fail safely.
2. Citizen A reviewed complaint with submission key → PostgreSQL complaint and initial event → restart API → logout/login → same ticket. An interrupted response and retry must retain one ticket/event.
3. Valid JPEG, PNG, WebP → private bucket object + ready SQL metadata → refresh/relogin/read. Reject spoofed/oversized/malformed files. Retry storage outage, failed delete and pending-operation recovery without losing the ticket.
4. Citizen B, anonymous and unassigned officer cannot fetch/mutate A's evidence through **either** API or direct Supabase Storage. Verify expired API tokens fail; no signed image URL is issued.
5. Approved default officer sees A's assigned ticket and images, updates one allowed status with a note, and A sees the persistent event after refresh. Another officer remains denied.
6. Live vector/model ingestion, retrieval and provider evaluations, with their separate write/cost approval, plus actual production-origin build and hosting smoke checks.

These gates are pending until credentials, target/backup evidence and authorization exist. Isolated test passes do not substitute for them.
