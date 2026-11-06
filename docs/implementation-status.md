# Implementation status - full-project bug audit

Reviewed 2026-11-07. VERIFIED describes the stated local check, not live-provider readiness. PARTIAL means implemented with an unresolved gate. BLOCKED means external execution could not run. The original assessment is preserved in [Phase 0 audit](phase-0-audit.md).

| Capability | Status | Evidence / remaining gate |
|---|---|---|
| Frontend production compilation | VERIFIED | Default and public-placeholder Auth-configured builds pass |
| API/session/error handling | VERIFIED | 9 client tests plus browser failure/race scenarios |
| JWT, roles and complaint isolation | VERIFIED | Signed JWT and backend authorization tests; no local role bypass |
| Complaint creation/read/status/audit | VERIFIED | Real isolated backend; persistence, atomicity, browser reload |
| Independent citizen/officer sessions | VERIFIED | Separate Chromium storage contexts share authorized ticket history |
| CORS | VERIFIED | 4 actual middleware preflight cases pass |
| Real Supabase demo login | BLOCKED | No project/public key or provisioned credentials |
| PostgreSQL migrations/connection/policies | BLOCKED | DATABASE_URL absent; actual checks fail closed |
| Curated source files | VERIFIED | 8 records, 8 notes, 8 chunks, 0 validation failures |
| RAG retrieval and citation safeguards | PARTIAL | Local safety contracts pass; live vector/provider quality unverified |
| Scheme UI/citation navigation | PARTIAL | Real isolated DB listing; answer/navigation fixtures |
| Live end-to-end demonstration | BLOCKED | Requires Supabase, PostgreSQL/pgvector, OpenAI and assignment IDs |
| Scoped secret/dependency checks | VERIFIED | 0 heuristic history findings; npm audit 0; pip check passes |
| Public deployment readiness | PARTIAL | No live gates, rate limits/quotas or deployment verification |
| Documentation/interview preparation | VERIFIED | README, measured review and 12 interview topics |

Final measurements: **109 pytest passed, 1 skipped, 1 warning; 9 client passed; 18 browser passed.** No failed local P0 tests remain. The live test must be explicitly enabled with real credentials. See the [current bug audit](bug-audit.md) for commands, reproduced failures, fixes, changed files and manual configuration. The [Phase 5 review](release-review.md) remains historical evidence.

Not implemented: government integrations, complaint AI/semantic deduplication, general homepage assistant, personalized eligibility engine, verified uploads/GPS, notifications/translation backend, persistent bookmarks, complaint edit/delete, rate limits or automated deployment. Deferred visual components remain labeled previews/unavailable. Internal resolution is not official resolution.

The later full-project audit repairs the complaint category width and readiness check, successful-write acknowledgment during token refresh, cross-account scheme chat, stale complaint snapshots, officer-note classification, modal keyboard focus and malformed provider handling. Seven runtime/schema bugs have regression coverage. Architecture/API documentation is corrected. No UI redesign, dependency, authorization bypass or production simulation was introduced.

Run `app.scripts.migrate` on an existing PostgreSQL installation to apply additive repair 003 before the vector migration/checks. Actual database execution of this repair is BLOCKED locally; SQL/reflection/runner tests are passing and are not represented as a live migration. Recommend an isolated local test/demo with disclosed limits; the actual-account demonstration remains BLOCKED, and public production readiness is not claimed.
