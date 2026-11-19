# JanSeva AI — Master Sprint Task Tracker & Daily Plan

> **Implementation Target:** JanSeva AI 5-Day Two-Developer Build Guide  
> **Source-of-truth UI:** Uploaded Citizen Services Platform & Officer Dashboard design  
> **Core Principle:** Independent citizen-assistance prototype. JanSeva internal status $\neq$ official government portal filing.  
> **Current Status:** **PRODUCTION STABLE & FULLY VERIFIED (HEAD: `cb0d623`)**

---

## 👥 Ownership & Lane Split

| Developer | Responsibility Lane | Primary Code / File Areas |
| :--- | :--- | :--- |
| **Developer A** | **Frontend (UI) + Scheme RAG + Agent Router** | `apps/web/**`<br>`services/api/app/ai/{embeddings,rag,eligibility,graph,assistant,screening}.py`<br>`data/{schemes.csv,scheme_sources/}` |
| **Developer B** | **Backend (API) + DB + Civic Grievances + Officer + Storage** | `services/api/app/{main,config,db,models,schemas,auth,storage}.py`<br>`services/api/app/routers/{health,schemes,complaints,officer,evidence,conversation,agent}.py`<br>`services/api/migrations/**`<br>`data/seed_complaints.json` |

---

## 📊 High-Level Sprint Progress Overview

```
Day 1: Foundations & Shared Contracts        [ 100% ] ████████████████████
Day 2: Scheme Navigator & Complaint CRUD     [ 100% ] ████████████████████
Day 3: Eligibility Rules & Complaint AI      [ 100% ] ████████████████████
Day 4: Unified Agent Router & Officer Queue  [ 100% ] ████████████████████
Day 5: Deployment, Testing & Verification   [ 100% ] ████████████████████
Release Extension: Evidence Uploads & Tests  [ 100% ] ████████████████████
```

**Overall Project Verification:**
- **Backend Tests:** **505 passed**, 1 skipped (`pytest-8.4.2` in 38.30s)
- **Frontend Unit Tests:** **64 passed**, 0 failed (`node --test` in 655ms)
- **Playwright E2E Tests:** **12 passed**, 0 failed (Chromium in 43.7s)
- **Database Schema:** 6 core application tables active on Supabase PostgreSQL (Migrations `001`–`006`)
- **Git State:** Synchronized with `org/master` and `origin/master` at `cb0d623` (working tree clean)

---

## 📅 DAY 1 — Foundations + Shared Contracts

**Goal:** Both developers finish with a real navigable frontend connected to a healthy backend and established data model.

### 🎨 Developer A (Frontend & Shell)
- [x] **Task A1.1: App Scaffold, Tokens & Shared Layout**
  - Delivered Vite + React app in `apps/web/` using React and JSX.
  - Configured global design tokens in `index.css`: Navy `#17183B`, Violet `#5443C7`, Teal `#00A8A0`, Orange `#F58B30`.
  - Built [JanSevaLogo.jsx](file:///d:/JanSeva/apps/web/src/components/common/JanSevaLogo.jsx), [Sidebar.jsx](file:///d:/JanSeva/apps/web/src/components/layout/Sidebar.jsx), [Topbar.jsx](file:///d:/JanSeva/apps/web/src/components/layout/Topbar.jsx), and [AppShell.jsx](file:///d:/JanSeva/apps/web/src/components/layout/AppShell.jsx).
- [x] **Task A1.2: Home Hero & Scheme Discovery Skeletons**
  - Built [Home.jsx](file:///d:/JanSeva/apps/web/src/pages/Home.jsx) with responsive hero banner, quick prompt chips, and action cards.
  - Built [SchemeSearch.jsx](file:///d:/JanSeva/apps/web/src/pages/SchemeSearch.jsx) with 3-column layout (Chat, Scheme Cards, Eligibility Checklist).
  - Built [SchemeDetailModal.jsx](file:///d:/JanSeva/apps/web/src/components/schemes/SchemeDetailModal.jsx) with verified `.gov.in` source quotations.
- [x] **Task A1.3: Grievance Forms, Track Status & Officer Dashboard**
  - Built [ComplaintForm.jsx](file:///d:/JanSeva/apps/web/src/pages/ComplaintForm.jsx), [ComplaintReviewModal.jsx](file:///d:/JanSeva/apps/web/src/components/complaints/ComplaintReviewModal.jsx), and [ComplaintPackageModal.jsx](file:///d:/JanSeva/apps/web/src/components/complaints/ComplaintPackageModal.jsx).
  - Built [TrackStatus.jsx](file:///d:/JanSeva/apps/web/src/pages/TrackStatus.jsx) and [MyRequests.jsx](file:///d:/JanSeva/apps/web/src/pages/MyRequests.jsx) with 4-step resolution stepper.
  - Built [Officer.jsx](file:///d:/JanSeva/apps/web/src/pages/Officer.jsx) with KPI tiles, SVG trend lines, and [TicketDetailModal.jsx](file:///d:/JanSeva/apps/web/src/components/officer/TicketDetailModal.jsx).
- [x] **Task A1.4: Frontend Verification & API Client Connection**
  - Created [api.js](file:///d:/JanSeva/apps/web/src/lib/api.js) implementing authenticated `apiRequest` and health check.
  - Verified clean production build (`npm run build` $\rightarrow$ 0 errors).

### ⚙️ Developer B (Backend, Data & Auth)
- [x] **Task B1.1: FastAPI Skeleton & Health Endpoint**
  - Initialized FastAPI app in [main.py](file:///d:/JanSeva/services/api/app/main.py) with CORS middleware in [config.py](file:///d:/JanSeva/services/api/app/config.py).
  - Implemented `GET /api/health` in [health.py](file:///d:/JanSeva/services/api/app/routers/health.py).
  - Unit tests verified in [test_health.py](file:///d:/JanSeva/services/api/tests/test_health.py).
- [x] **Task B1.2: Database Connection & Data Modeling**
  - Built [db.py](file:///d:/JanSeva/services/api/app/db.py) with SQLAlchemy 2.0 connection pooling (`pool_size=5`, `max_overflow=5`, `pool_pre_ping=True`).
  - Created initial schema in [001_initial.sql](file:///d:/JanSeva/services/api/migrations/001_initial.sql) and ORM models in [models.py](file:///d:/JanSeva/services/api/app/models.py) (`Profile`, `Complaint`, `ComplaintEvent`, `Scheme`, `SchemeChunk`).
- [x] **Task B1.3: Authentication & Role-Based Authorization**
  - Built [auth.py](file:///d:/JanSeva/services/api/app/auth.py) implementing `get_current_user`, RS256 JWKS caching, and `require_role(Role.OFFICER)`.
  - Created citizen and officer demo fixtures with strict server-side role resolution.
- [x] **Task B1.4: OpenAPI Request Schemas & Synthetic Complaint Fixtures**
  - Defined Pydantic models in [schemas.py](file:///d:/JanSeva/services/api/app/schemas.py) (`ComplaintCreate`, `ComplaintDetail`, `OfficerComplaintUpdate`).
  - Seeded 20 synthetic complaint records across categories and localities.

---

## 📅 DAY 2 — Real Scheme Navigator + Ticket CRUD

**Goal:** Both modules perform real database operations rather than static mock states.

### 🎨 Developer A (Scheme Data & RAG Pipeline)
- [x] **Task A2.1: Official Scheme Dataset**
  - Curated 12 verified welfare schemes in [data/schemes.csv](file:///d:/JanSeva/data/schemes.csv) and official source summaries in `data/scheme_sources/`.
- [x] **Task A2.2: Ingestion & Embeddings Script**
  - Created [ingest_schemes.py](file:///d:/JanSeva/services/api/app/scripts/ingest_schemes.py) with chunking, content hashes, and upserts.
  - Implemented pgvector migration [002_scheme_vectors.sql](file:///d:/JanSeva/services/api/migrations/002_scheme_vectors.sql).
- [x] **Task A2.3: Vector Retrieval & Scheme Search API**
  - Built [retrieval.py](file:///d:/JanSeva/services/api/app/ai/retrieval.py) and [rag.py](file:///d:/JanSeva/services/api/app/ai/rag.py) with cosine similarity retrieval and lexical fallback.
  - Implemented `GET /api/schemes` and `POST /api/schemes/ask` in [schemes.py](file:///d:/JanSeva/services/api/app/routers/schemes.py).
- [x] **Task A2.4: Scheme QA Testing**
  - Verified official `.gov.in` citation links and safety guards in [test_schemes.py](file:///d:/JanSeva/services/api/tests/test_schemes.py) and [test_rag_foundation.py](file:///d:/JanSeva/services/api/tests/test_rag_foundation.py).

### ⚙️ Developer B (Civic Grievance REST APIs)
- [x] **Task B2.1: Complaint CRUD Endpoints**
  - Implemented `POST /api/complaints`, `GET /api/complaints`, and `GET /api/complaints/{id}` in [complaints.py](file:///d:/JanSeva/services/api/app/routers/complaints.py) with strict citizen ownership scoping.
- [x] **Task B2.2: Frontend Complaint API Hookup**
  - Connected React `ComplaintForm` and `MyRequests` to real backend endpoints via [api.js](file:///d:/JanSeva/apps/web/src/lib/api.js).
- [x] **Task B2.3: Audit Events & Seed Expansion**
  - Implemented atomic audit trail logging (`ComplaintEvent`) on every status progression.
- [x] **Task B2.4: Security & Access QA**
  - Verified citizen data isolation: a user receives 404/403 when requesting another citizen's private grievance.

---

## 📅 DAY 3 — Eligibility Rules + Complaint AI

**Goal:** Differentiating AI features with deterministic fallbacks and explicit uncertainty.

### 🎨 Developer A (Deterministic Eligibility Engine)
- [x] **Task A3.1: Rule Engine with `NEEDS_INFO`**
  - Built [eligibility.py](file:///d:/JanSeva/services/api/app/ai/eligibility.py) and [screening.py](file:///d:/JanSeva/services/api/app/ai/screening.py) evaluating age, income, state, and occupation rules.
  - Returns `ELIGIBLE`, `INELIGIBLE`, or `NEEDS_INFO` with official citations.
- [x] **Task A3.2: UI Filter & Document Checklist Wiring**
  - Built [EligibilityChecker.jsx](file:///d:/JanSeva/apps/web/src/components/schemes/EligibilityChecker.jsx) and dynamic scheme category pills in [SchemeSearch.jsx](file:///d:/JanSeva/apps/web/src/pages/SchemeSearch.jsx).
- [x] **Task A3.3: Result State Persistence & Skeletons**
  - Preserved draft/search state in session context; added loading skeletons and retry states.
- [x] **Task A3.4: Rule Evaluation Gate**
  - Automated tests verified in [test_eligibility.py](file:///d:/JanSeva/services/api/tests/test_eligibility.py) and [test_eligibility_citations.py](file:///d:/JanSeva/services/api/tests/test_eligibility_citations.py).

### ⚙️ Developer B (Complaint Classification & Similarity)
- [x] **Task B3.1: Algorithmic Category Classification**
  - Implemented [complaint_classifier.py](file:///d:/JanSeva/services/api/app/ai/complaint_classifier.py) using bilingual regex tokenization, suffix stemming, and term-weighting.
  - Implemented `POST /api/complaints/analyze` returning category, urgency, and suggested authority.
- [x] **Task B3.2: Semantic Duplicate Ticket Detection**
  - Implemented [duplicate_detector.py](file:///d:/JanSeva/services/api/app/ai/duplicate_detector.py) computing Jaccard token overlap bounded by locality/ward.
- [x] **Task B3.3: Duplicate Cards & Review Modal**
  - Displayed inline duplicate candidate warnings and editable suggestions in [ComplaintForm.jsx](file:///d:/JanSeva/apps/web/src/pages/ComplaintForm.jsx).
- [x] **Task B3.4: Duplicate Detection QA**
  - Automated test coverage verified in [test_complaint_analysis.py](file:///d:/JanSeva/services/api/tests/test_complaint_analysis.py).

---

## 📅 DAY 4 — Agent Router + Officer Workflow

**Goal:** Unify scheme and grievance flows into one AI assistant with an officer resolution loop.

### 🎨 Developer A (Agent Router & Multi-Turn Chat)
- [x] **Task A4.1: Intent Routing & Workflow State Graph**
  - Implemented LangGraph workflow state graph in [agent.py](file:///d:/JanSeva/services/api/app/ai/agent.py) and [assistant.py](file:///d:/JanSeva/services/api/app/ai/assistant.py).
  - Routes intent (`scheme`, `complaint`, `mixed`, `clarify`) with conservative deterministic fallbacks.
- [x] **Task A4.2: Homepage Composer Integration**
  - Integrated [HomeAssistant.jsx](file:///d:/JanSeva/apps/web/src/components/common/HomeAssistant.jsx) and [AgentChat.jsx](file:///d:/JanSeva/apps/web/src/components/common/AgentChat.jsx) with `POST /api/agent/message` and `POST /api/conversation`.
- [x] **Task A4.3: Tool Traces & Citations**
  - Displayed tool execution traces, verified official citations, and proposal action buttons.
- [x] **Task A4.4: Multi-Scenario Agent QA**
  - Verified across [test_agent.py](file:///d:/JanSeva/services/api/tests/test_agent.py) and [test_final_assistant.py](file:///d:/JanSeva/services/api/tests/test_final_assistant.py).

### ⚙️ Developer B (Officer Dashboard & Resolution Loop)
- [x] **Task B4.1: Officer Queue & Status Update API**
  - Built `PATCH /api/officer/complaints/{id}` in [officer.py](file:///d:/JanSeva/services/api/app/routers/officer.py) enforcing strict transitions (`LOCAL_SUBMITTED` $\rightarrow$ `UNDER_REVIEW` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED`).
- [x] **Task B4.2: Live Dashboard Aggregates**
  - Connected KPI tiles, category charts, trend lines, and department routing in [Officer.jsx](file:///d:/JanSeva/apps/web/src/pages/Officer.jsx).
- [x] **Task B4.3: Official Ref Tracking**
  - Implemented `PATCH /api/complaints/{id}/official-ref` in [complaints.py](file:///d:/JanSeva/services/api/app/routers/complaints.py) to track CPGRAMS references independently from internal status.
- [x] **Task B4.4: End-to-End Workflow Test**
  - Validated full lifecycle in [test_final_integrations.py](file:///d:/JanSeva/services/api/tests/test_final_integrations.py).

---

## 📅 DAY 5 — Deployment, Security & Portfolio Proof

**Goal:** Production packaging, security hardening, and end-to-end verification.

### 🎨 Developer A (Frontend Polish & Smoke Tests)
- [x] **Task A5.1: Visual Polish & Responsive Layouts**
  - Verified mobile responsive layouts (320px, 375px, 390px, 1280px) and clean toast feedback.
- [x] **Task A5.2: Browser Smoke Testing**
  - Executed Playwright E2E suite ([final-critical.spec.js](file:///d:/JanSeva/apps/web/tests/final-critical.spec.js)) with **12/12 passing scenarios**.
- [x] **Task A5.3: Frontend Deployment Configuration**
  - Configured [netlify.toml](file:///d:/JanSeva/netlify.toml), [vercel.json](file:///d:/JanSeva/vercel.json), and [check-deployment.mjs](file:///d:/JanSeva/apps/web/scripts/check-deployment.mjs).
- [x] **Task A5.4: Documentation & Reports**
  - Documented release evidence in [FINAL-JANSEVA-BUG-FIX-REPORT.md](file:///d:/JanSeva/docs/FINAL-JANSEVA-BUG-FIX-REPORT.md) and [final-bug-audit.md](file:///d:/JanSeva/docs/final-bug-audit.md).

### ⚙️ Developer B (Security Hardening & Backend Packaging)
- [x] **Task B5.1: Security Audit & Token Boundary**
  - Enforced server-only secrets in `.env`, cached RS256 JWKS verification, and server-side RBAC.
- [x] **Task B5.2: API Benchmark & Eval Metrics**
  - Verified rate limiting and sliding window token reservation in [budget.py](file:///d:/JanSeva/services/api/app/ai/budget.py).
- [x] **Task B5.3: Backend Deployment Configuration**
  - Configured [Dockerfile](file:///d:/JanSeva/services/api/Dockerfile) and [render.yaml](file:///d:/JanSeva/render.yaml).
- [x] **Task B5.4: Final Architecture & Clean Git History**
  - Synchronized repository at `cb0d623` with working tree clean.

---

## 🚀 RELEASE EXTENSION — Evidence Storage & Full-Stack Hardening

- [x] **Private Complaint Evidence Storage:**
  - Built [storage.py](file:///d:/JanSeva/services/api/app/storage.py) and [evidence.py](file:///d:/JanSeva/services/api/app/routers/evidence.py) with file size, MIME type, and dimension validation.
  - Automatically strips EXIF/GPS metadata from JPEG, PNG, and WebP attachments before storage.
  - Applied migration [006_evidence_original_filename.sql](file:///d:/JanSeva/services/api/migrations/006_evidence_original_filename.sql).
  - Built [EvidencePanel.jsx](file:///d:/JanSeva/apps/web/src/components/complaints/EvidencePanel.jsx) and [EvidencePicker.jsx](file:///d:/JanSeva/apps/web/src/components/complaints/EvidencePicker.jsx).
- [x] **Comprehensive Test Suites Expansion:**
  - Backend: **505 passed** in `services/api/tests/` (including `test_final_evidence.py`, `test_final_assistant.py`, `test_final_integrations.py`).
  - Frontend: **64 passed** in `apps/web/tests-unit/`.
  - Browser E2E: **12 passed** in `apps/web/tests/final-critical.spec.js`.

---

## 🌟 ZERO-COST AI UPGRADE — Google Gemini Free Tier Integration

- [x] **OpenAI / Gemini Hybrid Provider ([provider.py](file:///d:/JanSeva/services/api/app/ai/provider.py)):**
  - Built automatic provider detection supporting both OpenAI (`sk-...`) and Google Gemini (`AQ...` / `AIzaSy...`).
  - Seamlessly translates OpenAI's structured schema format to Gemini's `generateContent` API with recursive OpenAPI schema cleanup.
  - Implemented batch embedding translation to `gemini-embedding-001` with dynamic 1536-dimension truncation matching Supabase pgvector.
- [x] **Live Database Vector Ingestion ([ingest_schemes.py](file:///d:/JanSeva/services/api/app/scripts/ingest_schemes.py)):**
  - Ingested all 12 curated government welfare schemes into live Supabase PostgreSQL `scheme_chunks` with 1536-dimensional embeddings.
- [x] **Canonical Live Benchmark Evaluation ([evaluate_schemes.py](file:///d:/JanSeva/services/api/app/scripts/evaluate_schemes.py)):**
  - **Farmer Query:** Correctly retrieved PM-KISAN with verified press release citation.
  - **Student Query:** Correctly retrieved NMMSS scholarship with verified PIB citation.
  - **Documents Query:** Correctly retrieved Sukanya Samriddhi account opening requirements.
  - **State Domicile Query:** Grounded response on Punjab Ashirwad domicile restrictions.
  - **Hallucination Refusal:** Correctly refused unsupported "Galactic Farming Grant" query (`insufficient_evidence`).
  - **Total Cost:** $0.00 (100% Free Forever Tier).
