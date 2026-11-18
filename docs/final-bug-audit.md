# Final bug audit — 2026-11-19

Branch: `feature/combined-work`, starting commit `c4fa4dc`. Four pre-existing image deletions are preserved. No commits, pushes, deployments or hosted schema changes are authorized by this audit.

## Baseline

- `python -m pytest -q`: 134 passed, 1 live test skipped.
- `npm --prefix apps/web run test:client`: 11 passed.
- `npm --prefix apps/web run build`: failed, unresolved deleted `hero-bg.png` import.
- No local `.env` files or required process secrets existed. Connected Supabase projects do not include the specified `rmexxrdtqszlnsndcrpj`; unrelated projects are not used.

## Confirmed defects and implemented repairs

| ID | Severity | Component / reproduction | Root cause | Implemented repair and regression evidence | Added tests | Verification result |
|---|---|---|---|---|---|---|
| J-01 | P1 | Build frontend with current working tree | Home imports missing image | Optional image loading with existing visual fallback; production build and browser navigation | production build; stability.spec.js | PASS in isolated/local scope; external dependencies remain unverified |
| J-02 | P1 | Send message on homepage | Search/navigation only; no agent endpoint | Read-only intent router, shared chat UI/history, failure recovery; routing/provider/browser tests | test_final_assistant.py; final-critical.spec.js | PASS in isolated/local scope; external dependencies remain unverified |
| J-03 | P1 | Request complaint analysis | No analysis endpoint; disabled control | Structured provider-backed advice, editable suggestions and owner-scoped related tickets; classification/provider tests | test_final_assistant.py; test_final_integrations.py | PASS in isolated/local scope; external dependencies remain unverified |
| J-04 | P1 | Attach complaint photo | Sample remote image only; no file input, persistence, storage or authorization | Validated private upload, metadata, signed access, partial-failure retry; upload/security/browser tests | test_final_evidence.py; final-critical.spec.js | PASS in isolated/local scope; external dependencies remain unverified |
| J-05 | P1 | Retry complaint after lost response | Client click guard only; no durable idempotency | User-scoped submission key and payload fingerprint; replay/conflict tests | test_final_evidence.py; audit.spec.js | PASS in isolated/local scope; external dependencies remain unverified |
| J-06 | P1 | Assess personal eligibility | No deterministic engine or profile editor | Conservative reviewed-rule screening with missing-field reasons; independent eligibility tests | test_final_assistant.py; test_final_integrations.py; final-critical.spec.js | PASS in isolated/local scope; external dependencies remain unverified |
| J-07 | P1 | Run application with supplied public project | No local configuration; all backend secrets absent | Configure supplied public project, read-only service checks, explicit blocked live gates | verify_services; check_db; test_final_integrations.py | Public Auth/JWKS pass; live integration BLOCKED |
| J-08 | P2 | Create citizen account | Sign-in only, no signup | Citizen signup with confirmation guidance, no metadata-based role assignment | final-critical.spec.js; test_auth.py | PASS in isolated/local scope; external dependencies remain unverified |
| J-09 | P2 | Use scheme chat across routes / failures | Local input lost on navigation; no follow-up history sent; chips send without editable draft | Session state for drafts/history, editable chips, keyboard behavior and visible retries | final-critical.spec.js; audit.spec.js; schemes.spec.js | PASS in isolated/local scope; external dependencies remain unverified |
| J-10 | P2 | Browse large complaint queue | Unbounded list with histories | Bounded server pagination and frontend incremental loading | test_final_integrations.py; queue/browser regressions | PASS in isolated/local scope; external dependencies remain unverified |

Live Auth, PostgreSQL, model calls and Storage persistence are not established by isolated tests. A real rotated database URL and service credentials plus authorized test identities are required. Hosted migrations require separate approval and confirmed recovery arrangements.


## Final verification

Final results: **243 backend passed, 1 live test skipped; 14 client passed; 33 browser passed; production build passed.** The model/provider and Storage responses in isolated tests are explicitly doubles. No real hosted complaint/photo persistence is claimed. See [the final report](FINAL-JANSEVA-BUG-FIX-REPORT.md).

J-01 through J-06 and J-08 through J-10 are implemented and pass their local regression checks. J-07 remains an external P1 configuration blocker: supplied public project values are configured consistently and its Auth settings/JWKS return HTTP 200, but hosted database, models, authenticated accounts and Storage remain unverified.

## Additional defects discovered and fixed

| ID | Severity | Component / reproduction | Root cause | Implemented fix | Added test / verification |
|---|---|---|---|---|---|
| J-11 | P2 | Ask agent about plural "potholes" | Initial intent expression matched singular only | Ordinary plural forms in scheme/complaint routing | Six failure-path cases caught this; now pass in `test_final_assistant.py` |
| J-12 | P2 | Follow PMJJBY source link | The www government hostname fails to connect here | Use verified canonical non-www official source in CSV, note and provenance | Final `check_sources` probe: all 8 HTTP 200, official destinations |
| J-13 | P2 | Upload while other requests run | Initial async route performed blocking decode/DB/HTTP on event loop | Bounded streaming stays async; decoding/persistence moved to worker thread | Full backend and browser photo suites pass; no production load certification claimed |
| J-14 | P2 | Use officer department routing | Empty recommendation list and placeholder action | Category-derived recommendations, assigned-officer category change and persisted event | Routing role matrix, event/no-op test, complete citizen activity browser journey pass |
| J-15 | P2 | Open Notifications after ticket update | Permanent empty array unrelated to saved events | Feed from accessible persisted events; session read marks and exact ticket link | Client transformation test and browser routing/activity workflow pass |
| J-16 | P2 | Re-encode PNG/WebP containing EXIF | Pillow may carry metadata through image.info | Clear decoded metadata before saving every approved image format | JPEG, PNG and WebP metadata/appended-payload removal tests pass |
| J-17 | P2 | Review an Other-category complaint | Form defaults its suggested department to Water Supply | Shared category/department mapping and neutral modal fallback | Structured advice mappings, build and complaint browser regressions pass |

## Remaining limits

Hosted migrations were not applied. The additive migration needs an explicitly verified development project, confirmed backup/recovery and approval. Voice, translation, GPS and formal SLA targets remain openly unavailable. Help/settings show informational feedback. No government filing or verified government status is claimed. Signed links remain usable until expiry; crashes or ambiguous Storage responses may leave orphan objects requiring reconciliation. Draft photos/read marks are in-memory session state.

The four original image deletions remain untouched. A `.vscode` directory that appeared during the session was not edited or removed. No commit, push, deployment, hosted seed, user-role change or credential transfer to unrelated projects occurred.
