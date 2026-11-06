# JanSeva AI — Master Sprint Task Tracker & Daily Plan

> **Implementation Target:** JanSeva AI 5-Day Two-Developer Build Guide  
> **Source-of-truth UI:** Uploaded Citizen Services Platform & Officer Dashboard design  
> **Core Principle:** Independent citizen-assistance prototype. JanSeva internal status $\neq$ official government portal filing.

---

## 👥 Ownership & Lane Split

| Developer | Responsibility Lane | Primary Code / File Areas |
| :--- | :--- | :--- |
| **Developer A** | **Frontend (UI) + Scheme RAG + Agent Router** | `apps/web/**`<br>`services/api/app/ai/{embeddings,rag,eligibility,graph}.py`<br>`data/{schemes.csv,scheme_sources/}` |
| **Developer B** | **Backend (API) + DB + Civic Grievances + Officer** | `services/api/app/{main,config,db,models,schemas,auth}.py`<br>`services/api/app/routers/{health,schemes,complaints,officer}.py`<br>`services/api/migrations/**`<br>`data/seed_complaints.json` |

---

## 📊 High-Level Sprint Progress Overview

```
Day 1: Foundations & Shared Contracts        [ 75% ] ██████████████░░░░░
Day 2: Scheme Navigator & Complaint CRUD     [ 20% ] ████░░░░░░░░░░░░░░░
Day 3: Eligibility Rules & Complaint AI      [ 15% ] ███░░░░░░░░░░░░░░░░
Day 4: Unified Agent Router & Officer Queue  [ 15% ] ███░░░░░░░░░░░░░░░░
Day 5: Deployment, Testing & Verification   [ 10% ] ██░░░░░░░░░░░░░░░░░
```

---

## 📅 DAY 1 — Foundations + Shared Contracts

**Goal:** Both developers finish with a real navigable frontend connected to a healthy backend and established data model.

### 🎨 Developer A (Frontend & Shell)

- [x] **Task A1.1 (09:00 – 11:00): App Scaffold, Tokens & Shared Layout**
  - **Objective:** Initialize client app, establish global design tokens, and build reusable shell.
  - **Delivered:**
    - Initialized Vite + React app in `apps/web/` using React and JavaScript (`.jsx`).
    - Configured global design tokens in `index.css`: Navy `#17183B`, Violet `#5443C7`, Teal `#00A8A0`, Orange `#F58B30`, Inter/Manrope font stack.
    - Built [JanSevaLogo.jsx](file:///d:/JanSeva/apps/web/src/components/common/JanSevaLogo.jsx) with the exact dual-flowing tricolor wave ribbon (saffron & cyan/teal).
    - Built [Sidebar.jsx](file:///d:/JanSeva/apps/web/src/components/layout/Sidebar.jsx) with independent routing for Home, Schemes, Requests, Complaints, Track Status, Notifications, and Officer Console.
    - Built [Topbar.jsx](file:///d:/JanSeva/apps/web/src/components/layout/Topbar.jsx) with State selector, live API status badge, notification drawer, and Citizen $\leftrightarrow$ Officer Persona switcher.
    - Built [AppShell.jsx](file:///d:/JanSeva/apps/web/src/components/layout/AppShell.jsx) assembling layout, modals, and toasts.

- [x] **Task A1.2 (11:00 – 13:00): Home Hero & Scheme Discovery Skeletons**
  - **Objective:** Create hero banner, interactive search card, 4 quick action service cards, and responsive navigation.
  - **Delivered:**
    - Built [Home.jsx](file:///d:/JanSeva/apps/web/src/pages/Home.jsx) with Rashtrapati Bhavan digital illustration ([hero-bg.png](file:///d:/JanSeva/apps/web/src/assets/hero-bg.png)), floating "Ask JanSeva AI" glassmorphic search card, and 4 quick prompt chips.
    - Built 4 clickable action cards (*Find Schemes*, *Check Eligibility*, *Raise Complaint*, *Track Requests*) with custom hover states and routing.
    - Built *Platform at a Glance* (4 counters: `12.8 L+`, `540+`, `18.4 L+`, `96%`) and *Recent Activity* feed.
    - Built [SchemeSearch.jsx](file:///d:/JanSeva/apps/web/src/pages/SchemeSearch.jsx) with 3-column layout: AI Chat Assistant, Scheme Cards with sector/search filters, and Citizen Profile/Document checklist.
    - Added [SchemeDetailModal.jsx](file:///d:/JanSeva/apps/web/src/components/schemes/SchemeDetailModal.jsx) displaying verified `.gov.in` source quotations, review dates, and application links.
    - Implemented mobile bottom navigation bar in `index.css` via media queries.

- [x] **Task A1.3 (14:00 – 17:00): Grievance Forms, Track Status & Officer Dashboard**
  - **Objective:** Build interactive forms, status trackers, and officer views.
  - **Delivered:**
    - Built [ComplaintForm.jsx](file:///d:/JanSeva/apps/web/src/pages/ComplaintForm.jsx) with auto-category detection on typing, location pin preview, 3 priority cards, photo upload toggle, and AI duplicate alerts.
    - Built [ComplaintReviewModal.jsx](file:///d:/JanSeva/apps/web/src/components/complaints/ComplaintReviewModal.jsx) displaying draft before submission with official portal boundary disclaimer.
    - Built [ComplaintPackageModal.jsx](file:///d:/JanSeva/apps/web/src/components/complaints/ComplaintPackageModal.jsx) generating a copyable structured grievance package for CPGRAMS/State portals.
    - Built [TrackStatus.jsx](file:///d:/JanSeva/apps/web/src/pages/TrackStatus.jsx) with Request ID lookup and live 4-step vertical resolution stepper.
    - Built [MyRequests.jsx](file:///d:/JanSeva/apps/web/src/pages/MyRequests.jsx) with status filters (`ALL`, `SUBMITTED`, `IN_PROGRESS`, `RESOLVED`).
    - Built [NotificationsPage.jsx](file:///d:/JanSeva/apps/web/src/pages/NotificationsPage.jsx) with unread filtering and direct deep-links.
    - Built [Officer.jsx](file:///d:/JanSeva/apps/web/src/pages/Officer.jsx) with 5 KPI tiles, interactive SVG requests trend line chart, SVG category donut chart, one-click department routing, SLA progress bars, and pending review table.
    - Built [TicketDetailModal.jsx](file:///d:/JanSeva/apps/web/src/components/officer/TicketDetailModal.jsx) for officer audit timeline inspection and status transitions.

- [x] **Task A1.4 (17:00 – 18:00): Frontend Verification & API Client Connection**
  - **Objective:** Connect frontend client to backend health check and verify clean production build.
  - **Delivered:**
    - Created [api.js](file:///d:/JanSeva/apps/web/src/lib/api.js) implementing `getHealth()`.
    - Wired `getHealth()` into the Topbar to render live *"API Connected"* badge.
    - Verified clean build (`npm run build` $\rightarrow$ 0 errors, 629ms).

---

### ⚙️ Developer B (Backend, Data & Auth)

- [x] **Task B1.1 (09:00 – 11:00): FastAPI Skeleton & Health Endpoint**
  - **Objective:** Initialize FastAPI service, CORS middleware, Pydantic schemas, and error handlers.
  - **Delivered:**
    - Initialized FastAPI app in `services/api/app/main.py`.
    - Implemented `GET /api/health` returning `{"status": "ok"}` in `services/api/app/routers/health.py`.
    - Configured CORS middleware in `services/api/app/config.py` reading `CORS_ORIGINS`.
    - Created Pydantic response models (`HealthResponse`, `ErrorDetail`, `ErrorResponse`) in `services/api/app/schemas.py`.
    - Added custom 422 `RequestValidationError` handler.
    - Automated unit test written in `services/api/tests/test_health.py`.

- [ ] **Task B1.2 (11:00 – 13:00): Database Connection & Data Modeling**
  - **Objective:** Configure database connection and execute migration for the 5 core tables.
  - **Deliverables to Implement:**
    - Create `services/api/app/db.py` (database client connection pool).
    - Write database migration file `services/api/migrations/001_initial.sql` creating:
      1. `profiles` (`user_id` PK, `name`, `state`, `occupation`, `age_range`, `role`).
      2. `schemes` (`id`, `title`, `category`, `state`, `source_url`, `updated_at`, `rules_json`).
      3. `scheme_chunks` (`id`, `scheme_id` FK, `chunk_text`, `embedding vector(1536)`).
      4. `complaints` (`id`, `user_id`, `title`, `description`, `category`, `locality`, `status`, `dept`, `official_ref`).
      5. `complaint_events` (`id`, `complaint_id`, `actor_id`, `old_status`, `new_status`, `event_time`, `note`).
    - Create ORM models in `services/api/app/models.py`.

- [ ] **Task B1.3 (14:00 – 16:00): Authentication & Role-Based Authorization**
  - **Objective:** Implement JWT validation and seed user credentials.
  - **Deliverables to Implement:**
    - Create `services/api/app/auth.py` providing `get_current_user` FastAPI dependency.
    - Validate `Authorization: Bearer <token>` on protected routes.
    - Resolve user roles server-side from `profiles` table (Citizen vs. Officer).
    - Seed test credentials:
      - Citizen: `citizen@example.com` (Arjun Mishra)
      - Officer: `officer@example.com` (R. Singh)

- [ ] **Task B1.4 (16:00 – 18:00): OpenAPI Request Schemas & Synthetic Complaint Fixtures**
  - **Objective:** Provide structured request/response examples and initial test records.
  - **Deliverables to Implement:**
    - Define Pydantic request/response schemas for `/api/schemes` and `/api/complaints`.
    - Create `data/seed_complaints.json` containing 10 synthetic complaint records across categories (`streetlight`, `water`, `sanitation`, `roads`) and localities.

---

### 🚪 Day 1 Acceptance Gate Checklist

| Exit Criteria | Owner | Status | Verification Note |
| :--- | :---: | :---: | :--- |
| **1. Routes `/`, `/schemes`, `/complaints/new`, `/officer` render** | Dev A | ✅ **PASS** | All routes (including `/track`, `/notifications`) load and render. |
| **2. `GET /api/health` returns 200 OK** | Dev B | ✅ **PASS** | Endpoint returns `{"status":"ok"}`; unit test passing. |
| **3. Database tables exist** | Dev B | ❌ **PENDING** | Migration script `001_initial.sql` and connection `db.py` needed. |
| **4. Test login & JWT verification work** | Dev B | ❌ **PENDING** | Backend auth dependency `auth.py` and test accounts needed. |

---

## 📅 DAY 2 — Real Scheme Navigator + Ticket CRUD

**Goal:** Both modules perform real non-AI database operations rather than static mock states.

### 🎨 Developer A (Scheme Data & RAG Pipeline)
- [ ] **Task A2.1 (09:00 – 11:00): Official Scheme Dataset**
  - Curate 12–20 verified schemes in `data/schemes.csv` with official `.gov.in` URLs, categories, eligibility criteria, and review dates.
- [ ] **Task A2.2 (11:00 – 14:00): Ingestion & Embeddings Script**
  - Write text chunking script (`services/api/app/ai/ingest.py`) creating 250–500 token chunks.
  - Generate 1536-dim vector embeddings and upsert into `scheme_chunks`.
- [ ] **Task A2.3 (15:00 – 17:00): Vector Retrieval & Scheme Search API**
  - Implement vector similarity retrieval in `services/api/app/ai/rag.py`.
  - Connect `GET /api/schemes` and `POST /api/schemes/ask` returning context-grounded source citations.
- [ ] **Task A2.4 (17:00 – 18:00): Scheme QA Testing**
  - Test 5 realistic citizen queries; verify citations link to real source URLs.

### ⚙️ Developer B (Civic Grievance REST APIs)
- [ ] **Task B2.1 (09:00 – 12:00): Complaint CRUD Endpoints**
  - Implement `POST /api/complaints` (create internal ticket with `LOCAL_SUBMITTED`).
  - Implement `GET /api/complaints` and `GET /api/complaints/{id}` with strict user ownership checks.
- [ ] **Task B2.2 (12:00 – 14:00): Frontend Complaint API Hookup**
  - Connect React `ComplaintForm` and `MyRequests` to real FastAPI backend endpoints.
- [ ] **Task B2.3 (15:00 – 17:00): Audit Events & Seed Expansion**
  - Record audit entries in `complaint_events` on ticket updates.
  - Seed 20 synthetic complaints across wards and categories.
- [ ] **Task B2.4 (17:00 – 18:00): Security & Access QA**
  - Verify that a citizen cannot read or edit another citizen's ticket (403/404 response).

---

## 📅 DAY 3 — Eligibility Rules + Complaint AI

**Goal:** Differentiating AI features with deterministic fallbacks and explicit uncertainty.

### 🎨 Developer A (Deterministic Eligibility Engine)
- [ ] **Task A3.1 (09:00 – 11:00): Rule Engine with `NEEDS_INFO`**
  - Implement `services/api/app/ai/eligibility.py` evaluating age, state, and occupation rules.
  - Return `POTENTIAL`, `NOT_MATCHED`, or `NEEDS_INFO` without hallucinating benefits.
- [ ] **Task A3.2 (11:00 – 13:00): UI Filter & Document Checklist Wiring**
  - Connect dynamic scheme filter pills, citizen profile editor, and document checklist.
- [ ] **Task A3.3 (14:00 – 16:00): Result State Persistence & Skeletons**
  - Persist scheme results during page navigation; add animated loading skeletons.
- [ ] **Task A3.4 (16:00 – 18:00): Rule Evaluation Gate**
  - Run automated tests against 15 citizen test profiles (including missing data).

### ⚙️ Developer B (Complaint Classification & Similarity)
- [ ] **Task B3.1 (09:00 – 12:00): LLM Category Classification**
  - Implement `POST /api/complaints/analyze` to classify issue into `road`, `water`, `sanitation`, `streetlight`, `other`.
- [ ] **Task B3.2 (12:00 – 14:00): Semantic Duplicate Ticket Detection**
  - Embed complaint descriptions and compare cosine similarity to find top 3 nearby duplicates.
- [ ] **Task B3.3 (15:00 – 17:00): Duplicate Cards & Review Modal**
  - Display *"May be related"* cards in the UI; wire copyable complaint package button.
- [ ] **Task B3.4 (17:00 – 18:00): Duplicate Detection QA**
  - Test 10 known duplicate/non-duplicate ticket pairs; configure similarity threshold.

---

## 📅 DAY 4 — Agent Router + Officer Workflow

**Goal:** Unify scheme and grievance flows into one AI agent with an officer resolution loop.

### 🎨 Developer A (LangGraph Agent Router)
- [ ] **Task A4.1 (09:00 – 12:00): LangGraph Intent Routing**
  - Implement `services/api/app/ai/graph.py` routing requests to Scheme tools vs Complaint tools.
- [ ] **Task A4.2 (12:00 – 14:00): Homepage Composer Integration**
  - Connect "Ask JanSeva AI" input on homepage to `POST /api/agent/message`.
- [ ] **Task A4.3 (15:00 – 17:00): Tool Traces & Citations**
  - Render tool execution traces (`search_schemes`, `analyze_complaint`) with citations.
- [ ] **Task A4.4 (17:00 – 18:00): Multi-Scenario Agent QA**
  - Test 8 scenario cases (scheme lookup, complaint filing, mixed prompt).

### ⚙️ Developer B (Officer Dashboard & Resolution Loop)
- [ ] **Task B4.1 (09:00 – 12:00): Officer Queue & Status Update API**
  - Implement `PATCH /api/officer/complaints/{id}` with role guard and audit logging.
- [ ] **Task B4.2 (12:00 – 14:00): Live Dashboard Aggregates**
  - Connect KPI tiles, category charts, and trend lines to real database records.
- [ ] **Task B4.3 (15:00 – 17:00): Official Ref Tracking**
  - Implement `PATCH /api/complaints/{id}/official-ref` for recording government filing numbers.
- [ ] **Task B4.4 (17:00 – 18:00): End-to-End Workflow Test**
  - Verify complete lifecycle: Citizen submit $\rightarrow$ Officer review $\rightarrow$ Citizen timeline update.

---

## 📅 DAY 5 — Deployment, Security & Portfolio Proof

**Goal:** Deploy application, freeze scope, verify security boundaries, and record demo video.

### 🎨 Developer A (Frontend Polish & Smoke Tests)
- [ ] **Task A5.1 (09:00 – 11:00): Visual Polish**
  - Fine-tune spacing, typography, mobile responsiveness, and toast feedback.
- [ ] **Task A5.2 (11:00 – 13:00): Browser Smoke Testing**
  - Verify keyboard accessibility, empty states, and external source link validation.
- [ ] **Task A5.3 (14:00 – 16:00): Frontend Deployment**
  - Deploy frontend to Vercel/Netlify; set environment variables and CORS headers.
- [ ] **Task A5.4 (16:00 – 18:00): Documentation & Walkthrough**
  - Record 2-minute product walkthrough; capture final screenshots for README.

### ⚙️ Developer B (Security Hardening & Backend Deployment)
- [ ] **Task B5.1 (09:00 – 11:00): Security Audit**
  - Enforce server-only secret keys; test unauthorized role escalation (401/403).
- [ ] **Task B5.2 (11:00 – 13:00): API Benchmark & Eval Metrics**
  - Measure p50/p95 latency and record accuracy benchmark in README.
- [ ] **Task B5.3 (14:00 – 16:00): Backend Deployment**
  - Deploy FastAPI service to Render/Railway; verify live `/api/health`.
- [ ] **Task B5.4 (16:00 – 18:00): Final Architecture & Demo Seed Reset**
  - Finalize `docs/architecture.md`, `README.md`, and clean git history.
