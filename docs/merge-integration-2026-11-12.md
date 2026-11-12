# Master integration — 2026-11-12

Integrates local `c203940930684ed7d84713e0403eccdf92201214` with incoming `3b545ee6e8173966188024248391bd9828aafed2`. Both are retained as merge parents; no history rewriting or whole-file ours/theirs checkout was used. The original untracked `docs/developer-a-prompt-1.md` is excluded.

| Conflicting file | Local capability retained | Incoming capability retained and integration |
|---|---|---|
| `apps/web/src/pages/ComplaintForm.jsx` | Authenticated client, explicit analysis/error handling, unchanged draft, editable category, review-before-save, metadata package integration | Debounced related-complaint alerts and richer classifier results; automatic responses abort/ignore obsolete requests and never overwrite a manual category. Heuristic similarity is labelled as a score, not a probability. |
| `docs/api-contract.md` | Auth, official-reference/channel/date, validation and agent contracts | Filtered complaint/officer routes and richer analysis fields; one documented authenticated endpoint returns a compatible superset for both clients. |
| `render.yaml` | Correct Python runtime/import/root/port/health, manual model settings, auto-deploy off, no automatic migrations | Singapore region, existing plan choice, RAG score and server-only operator secret slot; the Python 3.12 family remains selected by `.python-version`. No actual secret values or speculative public URL are included. |
| `services/api/app/routers/complaints.py` | CRUD, verified owner identity, citizen-only analysis, atomic filing metadata and audit events | Incoming status/category/locality filters and classifier; duplicate analysis registration removed. Exactly one POST analyze route requires the verified citizen. Officer-only filtered queues remain in the incoming officer router. |
| `services/api/app/schemas.py` | NUL rejection, filing fields/date validation, existing DTOs | Incoming analysis/duplicate DTOs extended with the newer description/suggested-authority/related-suggestion fields. Both response shapes are preserved. Optional title/locality support remains; the form's 10-character description minimum is a valid subset of the API's 5-character analysis minimum. |

## Integration safeguards

The incoming duplicate matcher originally queried all users' complaints through a public analysis endpoint. Preserving that data exposure would conflict with the existing ownership boundary. It now requires a verified owner ID for candidate queries, including its resolved-record fallback. Anonymous direct callers receive no candidates; the HTTP endpoint requires citizen authentication. Guest agent keyword classification still works without private duplicate lookup. Both developers' analysis callers share the weighted classifier and composite matching implementation; the older module is a compatibility adapter, not a second competing engine.

All 15 incoming labelled classification fixtures and 10 duplicate fixture pairs are retained and exercised in isolated tests. New tests require both analysis response shapes, unchanged validated text, exactly one route, authenticated access and cross-user exclusion. Incoming endpoint tests retain every classification/department/urgency/duplicate/validation assertion and now send signed citizen credentials. The first new route-count test needed adaptation to the installed FastAPI's included-router wrapper; the corrected test checks the actual complaint router and retains the one-route assertion. No test was deleted or timeout increased.

Incoming Netlify and Vercel configurations are retained and aligned with the public-environment gate before production builds. The remote Dockerfile/Procfile are retained; `.dockerignore` excludes real env files, caches and tests from image context. The two Netlify entry configurations keep SPA rewrites and safe build commands. None of these preparation files deploy a service during this merge.

The incoming evaluation tool and historical JSON/Markdown artifacts remain. Its duplicate evaluation now passes an explicit owner ID. Running the connected evaluation requires an explicitly selected development target, dedicated existing test citizen and matching access token via private environment variables `JANSEVA_COMPLAINT_EVALUATION=development`, `EVALUATION_USER_ID`, `EVALUATION_ACCESS_TOKEN`; never paste a token into chat or put it in Vite variables. It must not choose an arbitrary citizen or silently create profiles. The original hardcoded security matrix is labelled NOT VERIFIED rather than reported as executed requests. Historical artifacts are not new live-integration evidence. No connected evaluation, database migration, government filing or hosted deployment was performed during the merge.

## Verification

- Full backend suite: **345 passed, 0 failed, 1 live-service test skipped**.
- Client suite: **57 passed, 0 failed**.
- Frontend production build: **passed**.
- Full browser suite: **53 passed, 0 failed**.
- Classification/duplicate fixtures: **15 + 10 passed**, included in backend total; all duplicate fixture cases also require other-user exclusion.
- Credentials/live database/provider remain unconfigured; those integration results are not inferred from isolated tests.

The final chat reports the merge SHA, push result and fetched GitHub master SHA after verification. If additional upstream commits appear, they must be reconciled and checked before a normal push.
