# Implemented architecture

```text
React / JavaScript / Vite
    | Supabase SDK login and session refresh
    +--> Supabase Auth
    | JSON REST with actual bearer JWT
    v
FastAPI / Pydantic
    | trusted JWKS signature/claim verification
    | server-controlled database profile role and owner/assignment checks
    +--> PostgreSQL: profiles, schemes, scheme_chunks, complaints, complaint_events
    |               pgvector exact cosine retrieval
    +--> OpenAI embeddings / Responses through server-side httpx
```

There is no LangGraph, LangChain, separate vector database or agent tool runner. The existing frontend keeps its layouts/components; a shared API transport handles tokens, JSON, timeouts and sanitized errors. Stored complaints and schemes come from APIs. The homepage general assistant, translation, notifications, uploads/GPS and advanced complaint AI remain unavailable or labeled previews. No eligibility rule engine is implemented.

## Authentication and complaint consistency

Supabase manages browser session persistence and token refresh. FastAPI verifies asymmetric JWT signatures, issuer, audience, expiry and required claims before reading the database profile. A frontend persona selector only opens sign-in. Citizen reads are owner-scoped; officer reads and status changes require assignment. Request fields cannot override identity or role.

Complaint creation and its initial event commit together. Officer updates use a status/assignment compare-and-set and an atomic event write. The lifecycle is LOCAL_SUBMITTED, UNDER_REVIEW, IN_PROGRESS, RESOLVED in that order. Citizen-provided filing references are unverified and independent of internal status. Nothing submits to a government portal.

The browser discards responses from prior accounts/tokens. Successful writes survive same-user token rotation, while identity changes still suppress prior-user results. A newer ticket detail invalidates an older list snapshot. Account changes clear scheme conversations and invalidate their in-flight replies. Existing modal keyboard focus stays inside the top dialog and returns to its opener on dismissal.

## Database and migrations

Normal startup performs no DDL, demo provisioning or seeding. `app.scripts.migrate` applies 001 and the additive 003 category-width repair before checking the schema in the same transaction. Migration 003 widens the original VARCHAR(10) complaint category to fit the 11-character streetlight value; it never narrows a wider installation. `app.scripts.migrate_schemes` separately applies additive migration 002 for pgvector. Apply the core/repair command before the vector command. Checks compare column presence/nullability and minimum string widths, keys, constraints and essential indexes; they do not certify all possible schema drift.

Migrations enable RLS and revoke browser table access; a trusted server DB account serves FastAPI. Actual PostgreSQL execution/policies remain unverified locally without configuration. Tests use isolated SQLite with foreign keys; SQLite does not enforce VARCHAR lengths, so SQL contract/reflection tests separately cover the width regression.

## Retrieval and evidence safety

Eight curated records link to dated official sources. Ingestion validates local source notes, metadata and model dimensions, and stores source-linked vectors. Stable identities and transaction/advisory locks support reruns. Retrieval filters compatible active vectors and state/category before exact cosine search. The Responses model selects whole stored paragraphs; local chunk, text and official-URL checks reject fabricated selections. Missing evidence produces uncertainty; an unavailable/malformed generation response produces a labeled extractive fallback. Embedding failure returns an error rather than fake vectors. This constrains answers but does not guarantee relevance, source currency or personal eligibility.

## Test and deployment boundaries

pytest tests signatures/authorization, isolated database/API behavior and deterministic provider/retrieval contracts. Playwright runs Vite and real FastAPI/SQLite with a local signed-token Auth double; scheme answer/navigation fixtures test UI wiring. No test override is imported by the production entrypoint. The opt-in live test requires actual PostgreSQL/pgvector and provider access. Local contract tests are not live-provider evidence.

Server/database/admin/model keys remain outside the browser. Use only public Auth configuration in Vite. Public model endpoints currently lack rate limits and billing quotas, and deployment/operational controls are unverified. This is a controlled portfolio demo candidate, not a certified production service. See implementation-status.md and bug-audit.md for current evidence.
