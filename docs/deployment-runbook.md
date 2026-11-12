# JanSeva integration and deployment runbook

2026-11-11. Preparation only: no hosted resources were created and no public URLs are assumed. Use the existing authorized Supabase project and approved hosting accounts. Do not paste private credentials into chat. Keep them in ignored local files or the host's secret settings.

## 1. Configure the existing project privately

1. Open Supabase Dashboard, select the existing JanSeva project, and verify its organization/project identity and whether it is development or production. Do not create a replacement project. If ownership or environment is unclear, stop before writes.
2. In the project's **Connect** dialog, obtain the PostgreSQL connection string. Prefer a direct connection when the host supports its networking, or the **session pooler** for IPv4 access. This SQLAlchemy/psycopg application does not configure transaction-pooler prepared-statement behavior, so do not use that mode. Save the real password privately in `DATABASE_URL`; URL-encode special characters. Remote connections use TLS; the API adds `sslmode=require` when none is supplied. [Connection guidance](https://supabase.com/docs/guides/database/connecting-to-postgres).
3. Under **Project Settings → API / API Keys**, copy the project URL and its publishable key into `apps/web/.env` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. A legacy `anon` key is also supported. The backend's `SUPABASE_URL` must refer to that same project. Never place `service_role`, `sb_secret_`, database credentials or AI keys in any `VITE_*` variable. [Key types](https://supabase.com/docs/guides/getting-started/api-keys).
4. Privately create `services/api/.env` using the root `.env.example` only if the target file does not already exist. If it exists, edit only the needed names; never overwrite it with a template. Populate `DATABASE_URL`, `SUPABASE_URL`, `CORS_ORIGINS`, `EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS`, `OPENAI_API_KEY` and `LLM_MODEL`. Model/dimension values must match the configured provider and existing stored embeddings. No model defaults or credentials are supplied by this runbook.
5. Set `VITE_API_BASE_URL` to the actual API origin. Set `CORS_ORIGINS` to exact approved frontend origins separated by commas, without paths, credentials or wildcard `*`. Use actual HTTPS origins for hosting; explicit localhost origins are for local development only. Never guess a deployment hostname.
6. `SUPABASE_SERVICE_ROLE_KEY` is optional for the existing privileged demo-setup operator script, not required for ordinary API JWT verification or citizen signup. Keep it server/operator-only if that workflow is explicitly needed. Leave demo account/password/assignment variables unset for normal users; do not replace existing users or roles.

Missing names in this checkout: backend `DATABASE_URL`, `SUPABASE_URL`, `CORS_ORIGINS`, `EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS`, `OPENAI_API_KEY`, `LLM_MODEL`; frontend `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. No ignored environment files were found. No supplied credential value was printed.

Read-only configuration checks from repository root:

```powershell
$env:PYTHONPATH = 'services/api'
.\.venv\Scripts\python.exe -m app.scripts.check_configuration
npm.cmd --prefix apps/web run check:deployment
```

Use `--allow-local` for explicitly configured HTTP loopback development origins: append it to the Python command or use `npm.cmd --prefix apps/web run check:deployment -- --allow-local`. These checks validate syntax/secret placement only. They do not establish database access, correct project ownership, valid keys, backup safety, model availability or authorization to deploy.

## 2. Confirm migration safety before any write

1. Confirm the configured target is the intended **authorized development** database by comparing the private connection/project identity with Supabase Dashboard. A production target, an unknown target or an unproven backup is a STOP condition. No environment name in a local file is sufficient proof by itself.
2. Inspect **Database → Backups** (or the project's backup/recovery area). Verify a usable snapshot/restore point and its time. For a populated database without that facility, obtain an encrypted logical backup using approved PostgreSQL tooling and private credential storage, and verify a recovery procedure before proceeding. Do not put passwords in shell command arguments or commit backup files. A successful connection is not a backup. [Supabase backup guidance](https://supabase.com/docs/guides/platform/backups).
3. Inspect the existing schema through the dashboard SQL editor using read-only queries below. The application has no migration-history ledger: migration filenames alone do not prove they ran. Catalog columns, constraints and vector extension must be inspected. The runner applies 001, 003 and 004 idempotently in one transaction; vector migration 002 remains separate. Never delete or edit historical migration files to force a pass.
4. Confirm DDL ownership and schema/extension privileges with the database operator. The role needs privileges for the existing runner's table alterations/functions and, when needed, installation of pgvector. Do not grant browser `anon`/`authenticated` roles direct access or change server-managed profile roles to solve migration errors.
5. For a populated development database, quiesce application writes and retain before/after complaint and event counts plus fingerprints. Keep a verified recovery point. If fields already exist with incompatible types or constraints, stop for operator review; do not auto-cast, drop columns or discard data.

Read-only SQL for an operator's private dashboard session:

```sql
SELECT current_database(), current_user,
       has_schema_privilege(current_user, 'public', 'USAGE') AS schema_usage,
       has_schema_privilege(current_user, 'public', 'CREATE') AS schema_create;
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='complaints'
ORDER BY ordinal_position;
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint WHERE conrelid=to_regclass('public.complaints');
SELECT extname, extversion FROM pg_extension WHERE extname='vector';
SELECT count(*) AS complaint_count,
       md5(coalesce(string_agg(
         (to_jsonb(c)-'official_channel'-'official_submitted_on')::text,
         E'\n' ORDER BY c.id), '')) AS original_column_fingerprint
FROM public.complaints c;
SELECT count(*) AS event_count,
       md5(coalesce(string_agg(to_jsonb(e)::text, E'\n' ORDER BY e.id), '')) AS event_fingerprint
FROM public.complaint_events e;
```

Fingerprints omit the new columns so they can be compared across an additive upgrade. Run within an appropriate quiet development window; concurrent legitimate writes change them. These queries do not replace a recoverable backup. Table ownership/catalog inspection must separately confirm the operator can execute the runner.

Expected 004 state: nullable `official_channel` varchar(30), nullable `official_submitted_on` date, and constraints `complaints_official_channel` and `complaints_filing_requires_reference`. `official_ref`, complaint status, ownership and event history must remain intact. If all are already compatible, report 004 already present; do not blindly modify rows. The strengthened schema validator rejects a conflicting non-date filing column.

## 3. Execute and verify only after those gates pass

For a confirmed, backed-up development target, use the **existing** runner, once initially:

```powershell
$env:PYTHONPATH = 'services/api'
.\.venv\Scripts\python.exe -m app.scripts.migrate
.\.venv\Scripts\python.exe -m app.scripts.check_db
```

If PostgreSQL reports an error, stop and investigate; the runner's transaction rolls back. Do not run reset/drop/truncate or force a type conversion. Recheck catalog definitions and original-column/event fingerprints against the retained before state. Record the executed target privately, backup reference, result and schema evidence. Do not claim success based on isolated SQLite tests. Production execution requires explicit approval and the organization's recovery/change procedure.

For pgvector, inspect existing extension/column dimensions first. Only if missing and authorized, run `python -m app.scripts.migrate_schemes` after the core runner succeeds. It is a separate write operation. Do not reinstall an existing extension or alter populated embeddings without checking compatibility.

## 4. Configure and verify actual Auth

1. Under **Authentication → Sign In / Providers → Email**, confirm email/password signup is enabled and choose the intended confirmation policy. Keep server-owned profile roles: first verified `/api/me` provisions a citizen; signup metadata cannot create officers.
2. Under **Authentication → URL Configuration**, set **Site URL** to the actual approved frontend origin. Add exact `/auth/callback` and `/auth/reset` URLs for that origin. Add explicit local development equivalents only when needed. Avoid broad production wildcards. The SPA host must rewrite these routes to its index document. [Redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls).
3. Under Auth signing-key settings, verify the project issues **ES256 or RS256** tokens. The existing API verifies JWKS, issuer, audience, expiry, authenticated role and subject. It intentionally does not accept legacy HS256. Do not weaken those checks; rotate/migrate signing keys through the approved provider process if necessary. [Signing keys](https://supabase.com/docs/guides/auth/signing-keys).
4. Configure **Authentication → Email / SMTP** for real delivery and inspect rate limits. Default test email restrictions do not establish public signup readiness. Use dedicated inboxes you own for email verification/recovery; `.test` fixture addresses cannot prove delivery. Never change email templates to bypass verification. If enabling CAPTCHA, its client token integration must also be implemented and verified; this build does not send a CAPTCHA token. [SMTP guidance](https://supabase.com/docs/guides/auth/auth-smtp).
5. On an approved development URL, create two dedicated citizen test accounts. Test confirmation, registered login, refresh, logout and password recovery, including an expired/reused link. Confirm the first `/api/me` creates exactly one citizen profile, retains existing accounts and cannot accept client role changes. Test actual FastAPI JWT verification; an SDK session alone is insufficient evidence.
6. Use a separately approved operator-managed test officer. The existing operator-only `app.scripts.toggle_role --user-id <verified-test-profile-uuid> --role officer` can assign that role only after the explicitly selected profile exists and the target is confirmed development. This is a privileged write, not part of self-registration. Preserve every unrelated profile. New complaints are unassigned unless the existing explicit demo assignment pair is configured; never widen the officer queue to make a test work.

## 5. Live complaint and AI checks

1. With citizen A, create an explicitly synthetic complaint, review and confirm its save, open My Complaints/details, refresh, logout and login. Verify the same row and its audit history in PostgreSQL. With citizen B, require denied/404 access to A's ID.
2. Use the approved assignment workflow for the synthetic test ticket and test officer. Advance the existing allowed internal transitions and verify the citizen sees each real event. No internal transition implies a government action.
3. Open the saved package, copy it and open the official portal in a separate tab. Do **not** submit any grievance. Return and verify the internal complaint remains available and opening the portal changed no filing status. Save only a clearly synthetic reference/channel/date on the synthetic development record, then reload it. It must remain `USER_REPORTED_FILED`, never acknowledged/verified. Test other-citizen and officer denial on owner-only reference changes.
4. Inspect existing curated scheme IDs/chunks, active flags, source metadata, model/dimensions and pgvector type before ingestion. Preserve the reviewed 12-scheme source set. Existing stored vectors are not authorized for blind replacement merely because a different model is available.
5. Validate files with `python -m app.scripts.ingest_schemes --validate-only`. If ingestion is genuinely needed and authorized, use the existing script. Confirm corpus ownership/model compatibility, run the initial ingestion, then rerun to verify zero new embeddings/no duplicate active rows for unchanged records. Provider calls may incur cost; no automatic ingestion is embedded in hosting startup.
6. Run `python -m app.scripts.evaluate_schemes` and inspect all five real retrieved sources/answers. Only after configured service checks, opt into `JANSEVA_LIVE_RAG=1` and run `pytest services/api/tests/test_schemes_live.py -q`; clear that flag afterward. No percentage accuracy or latency is assumed. Also exercise deterministic eligibility and the read-only agent with provider unavailable: complaint preparation/manual submission must remain usable, and no agent may write without confirmation.

## 6. Hosting configuration, without deployment

No hosting provider was previously configured. Prepared files target **Netlify frontend** and **Render backend**; these are choices for review, not existing deployments.

1. **Render:** review `render.yaml`. Root directory `services/api`; install `pip install -r requirements.txt`; start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`; health `/api/health`. `.python-version` selects the Python 3.12 family. Set secret environment values privately. Auto-deploy is off. There is no database resource, migration hook, ingestion hook or test-server start command. Do not click Create/Deploy until approval is granted. A health PASS checks process health, not database/provider readiness. [FastAPI hosting](https://render.com/docs/deploy-fastapi), [Blueprint settings](https://render.com/docs/blueprint-spec).
2. **Netlify:** review `netlify.toml`. Base `apps/web`, publish `dist`, Node 22. Build runs `npm ci`, public-environment validation, then the existing Vite production build. Set only the three public frontend variables. The environment gate intentionally fails while required values are absent or private credentials are exposed. The non-forced `/* → /index.html` rewrite supports direct refresh on complaint/auth routes while existing assets retain normal serving. Pause automatic publication and do not connect/import/deploy the repository without approval. [Configuration/SPA rewrite](https://docs.netlify.com/build/configure-builds/file-based-configuration/).
3. Once real approved hosting origins exist, reconcile `VITE_API_BASE_URL`, backend `CORS_ORIGINS` and Supabase Site/redirect URLs; rebuild the frontend because Vite embeds public values at build time. Do not substitute fabricated URLs or put server secrets in the client to solve a missing setting.
4. Before public release, verify the actual hosting runtime/dependency install, HTTPS, `/api/health`, database access, JWKS/email callbacks, SPA deep-link refresh and required AI workflows. Review shared quotas/abuse controls, backups and observability for the chosen environment. The prepared files do not certify a deployed service.

## 7. Current blockers and evidence

No configured target/backup was available, so migration execution and data-preservation verification are **BLOCKED**. Existing live schema/migration state is **NOT VERIFIED**, not assumed missing or applied. Real Auth/email, profiles, complaints, roles, embeddings and hosted AI are **NOT VERIFIED**. Hosting is **NOT VERIFIED**; only local configuration/build/start-command checks are available. See [the current integration checklist and actual test results](final-release-readiness.md).
