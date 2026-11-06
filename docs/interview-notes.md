# JanSeva AI - interview notes

1. **Why React and FastAPI?** React provides reusable UI components and shared session state. FastAPI offers typed request validation, REST routes and generated documentation alongside Python retrieval code. Keeping the existing stack avoided a redesign.

2. **What is a REST API?** An HTTP interface organized around resources. POST `/api/complaints` creates a ticket, GET reads it and PATCH changes an allowed part. HTTP status codes describe success and errors.

3. **What is JWT authentication?** Login produces a signed token with user claims. The API verifies its signature, trusted issuer, audience and expiry using Supabase signing keys. JWT payloads are not encrypted by default; never put secrets in them.

4. **How does RBAC work?** Role-based access control limits actions by role. JanSeva reads roles from database profiles after authentication. Ownership and assignment restrict individual records: an officer cannot open every complaint merely by having the role.

5. **Why PostgreSQL?** Users, complaints and events have relationships and consistency requirements. Foreign keys, constraints and transactions enforce these. pgvector keeps scheme vectors in the same database.

6. **What are embeddings?** Numeric vectors representing aspects of text meaning. Related text often has nearby vectors. Stored evidence and queries must use compatible models/dimensions; similarity does not prove eligibility.

7. **How does pgvector similarity search work?** JanSeva compares passage vectors with the query using cosine distance (`<=>`). Lower distance means greater similarity. It filters incompatible/inactive passages and uses exact search for the small corpus, without an approximate index.

8. **What is RAG?** Retrieval-augmented generation retrieves evidence before using a language model to answer. Here the model selects complete reviewed paragraphs, validated locally before display with citations.

9. **How are hallucinations reduced?** Final text must match retrieved paragraphs. Validation rejects invented text, unknown chunks and changed URLs. Missing evidence produces uncertainty; fallback is labeled. This does not prove source currency or retrieval completeness. Live relevance evaluation remains blocked by configuration.

10. **How does the complaint lifecycle work?** A citizen creates LOCAL_SUBMITTED. An assigned officer advances to UNDER_REVIEW, IN_PROGRESS, then RESOLVED. Every step records an event. Internal status and user-reported government filing are separate.

11. **Why are audit events important?** They record who changed a ticket, when and why. Status and event commit together so an update cannot silently lose its history. This is an internal trail, not proof of government action or an externally tamper-proof ledger.

12. **What would you improve with more time?** First complete live Auth/PostgreSQL/RAG gates. Then add rate limits/cost controls, dependency locking/CI, monitoring, mutation idempotency, broader dated sources, accessibility checks and measured retrieval evaluation. These are proposals, not implemented features.
