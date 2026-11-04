# Architecture

## MVP deployment shape

```text
React + TypeScript + Vite
        | HTTPS + Supabase bearer JWT
        v
FastAPI (validation, auth, REST, narrowly scoped LangGraph tools)
        | server-side credentials
        v
Supabase Auth + PostgreSQL/pgvector + optional private Storage
```

The frontend owns presentation, forms, and user confirmation. FastAPI validates requests, verifies Supabase JWTs, resolves roles from trusted profile data, enforces ticket ownership, and calls data/AI services. The AI layer retrieves evidence and proposes explanations or classifications; it cannot make unconfirmed writes or file with a government portal.

## Feature ownership

- Developer A: `apps/web/**`, `services/api/app/ai/**`, verified scheme source set and retrieval workflow.
- Developer B: `services/api/app/{auth,config,db,models,schemas}.py`, `services/api/app/routers/**` except agent integration, migrations, complaint/officer APIs, and synthetic data.
- Shared interfaces: `docs/api-contract.md` and `apps/web/src/lib/types.ts`. Change the contract first, then coordinate implementation.

## Security and data boundaries

The browser may use only Supabase URL/publishable key. Service-role and model keys remain server-only. Citizens can access only their own profile/tickets; officer access is verified by the backend. Internal complaint states and official filing evidence use separate fields. Store minimal personal data and use synthetic complaints for demos.

## Trust and evaluation

Each scheme result links to a reviewed official source. Rules handle eligibility; an LLM may explain retrieved passages but must abstain when evidence is missing. Duplicate matches are suggestions. Report only measured evaluation results and sample sizes.

