# Final audit inventory — 2026-11-10

Starting branch `master`, HEAD `e71516fc8928a465f8b2c3131927057a308baf73`. Preserve the existing untracked `docs/developer-a-prompt-1.md`. No commit, merge or push is authorized by this request.

Baseline: backend 276 passed / 1 live test skipped; client 41 passed; production build passed. Browser baseline is running. Read architecture, API contract, migrations, auth and profile provisioning, complaint/officer scopes, frontend context/routes/forms/packages, scheme and agent integration and existing tests before implementation.

| Priority | Confirmed issue and reproduction | Cause / affected files | Intended fix |
|---|---|---|---|
| P1 | Open Citizen Sign In: no account creation or recovery controls | LoginModal only calls signInWithPassword; Supabase URL session detection disabled | Add citizen-only signup, verification handling, recovery callback and validated password update using existing SDK; preserve server-owned roles |
| P1 | Save a government reference with filing channel/date: API rejects extra fields | Complaint model/schema/route retain only reference | Add nullable fields through migration 004; owner-only validated atomic update; retain unverified filing status |
| P1 | Ask agent to analyze complaint: always unavailable; form title heuristic misses description and has no duplicates | No shared complaint analysis service | Add labelled deterministic category suggestions, exact supplied draft text, owner-scoped related suggestions and editable review; no automatic writes |
| P2 | Signed-in citizen must discover “My Requests” terminology to revisit all tickets | Existing account-backed list is functional but not clearly labelled as My Complaints | Add clear My Complaints entry points and detail/official tracking display; keep compatible routes |
| P2 | Guest requests view mixes login notice with an empty list | Data screens do not have a shared protected view | Add route gate that preserves the intended destination and existing drafts; backend remains authoritative |

No reproduced P0 authorization defect at audit time. Existing tests cover JWT validation, role escalation, cross-user access, assigned officer queues, atomic events, scheme citations and source injection. All additional confirmed P0/P1 issues discovered during work will be recorded in the final report.

Manual reviewed scheme evidence is already present. Complaint persistence/listing/details/timeline, review-before-save, safe external package links, owner-only references and separate internal/official statuses already work and will be extended rather than replaced. Hosted Supabase/email delivery, PostgreSQL migrations/RLS and AI provider calls require external configuration and must not be represented as live verified by mocked tests.


Follow-up confirmed issues: API text accepted NUL in title/description/locality (three failing regression cases; PostgreSQL text cannot store it); boundary validation now rejects it before any write. The category dropdown also exposed unsupported `Public Transport`, silently mapping it to `other`; it now offers only supported categories. Review used fabricated department labels; it now shows a labelled suggestion requiring local confirmation. My Complaints no longer displays an empty-result message simultaneously with loading/error state.

First browser run: 44 passed / 1 heading-visibility failure in the multi-viewport route test. Implementation was underway during this run, so it is not evidence of a pristine browser baseline. Final runs use a stable test process and are recorded separately. Intermediate failures in new tests (old demo-only login helper, missing test-server PUT CORS and wrong package button locator) were corrected without removing assertions. The migration regression now verifies additive 004 before schema validation instead of expecting validation immediately after 003.
