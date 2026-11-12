# JanSeva AI — Production Cloud Deployment Guide

This document describes the production deployment architecture, step-by-step cloud configuration, and verification procedures for JanSeva AI.

---

Prepared configuration only; no hosted deployment or live integration is certified by this guide. See [merge integration](merge-integration-2026-11-12.md) for reconciled contracts and verification.

## 1. Production Architecture Overview

```
                      +-----------------------------------+
                      |   React + Vite Frontend (SPA)     |
                      |   Hosted on Vercel / Netlify      |
                      +-----------------+-----------------+
                                        |
                             HTTPS REST | JWT Authorization
                                        v
                      +-----------------------------------+
                      |   FastAPI Backend Service         |
                      |   Hosted on Render / Railway      |
                      +-----------------+-----------------+
                                        |
                 +----------------------+----------------------+
                 |                                             |
                 v                                             v
  +-------------------------------+             +-------------------------------+
  |   Supabase Managed Database   |             |   External AI Services        |
  |   PostgreSQL + pgvector       |             |   OpenAI Responses API        |
  |   Row-Level Security & Auth   |             |   Text Embedding 3 Small      |
  +-------------------------------+             +-------------------------------+
```

---

## 2. Backend Deployment (Render / Railway)

### Option A: Render Deployment (Recommended)
1. Use the existing `master` integration after tests pass. Do not deploy until explicitly approved; follow the backup/Auth gates in [deployment-runbook.md](deployment-runbook.md).
2. In Render Dashboard, click **New +** -> **Blueprint** or **Web Service**.
3. Select this repository. The `render.yaml` configuration will automatically discover settings:
   - **Root Directory:** `services/api`
   - **Environment:** Python 3.12
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path:** `/api/health`
4. Set the following environment variables in the Render Dashboard:
   - `DATABASE_URL`: Your Supabase pooler connection string (with `sslmode=require`).
   - `SUPABASE_URL`: `https://<your-project-ref>.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY`: Optional privileged operator setup credential; server-only and not needed for ordinary JWT verification.
   - `OPENAI_API_KEY`: API key for OpenAI LLM and embeddings.
   - `LLM_MODEL`: Explicitly selected available model supporting the existing Responses schema
   - `EMBEDDING_MODEL`: Model compatible with stored vectors
   - `EMBEDDING_DIMENSIONS`: Actual configured output dimension
   - `RAG_MIN_SCORE`: `0.35`
   - `CORS_ORIGINS`: Comma-separated allowed frontend origins (use actual approved HTTPS frontend origins; no public deployment URL is assumed).

### Option B: Railway Deployment
1. Connect the GitHub repository in Railway.
2. Set **Root Directory** to `services/api`.
3. Railway automatically detects `Procfile` (`web: uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}`).
4. Add the environment variables listed above.

---

## 3. Frontend Deployment (Vercel / Netlify)

### Option A: Vercel Deployment
1. Import repository in Vercel.
2. Set **Root Directory** to `apps/web`.
3. Set **Framework Preset** to `Vite`.
4. Configure environment variables:
   - `VITE_API_BASE_URL`: `https://<your-backend-subdomain>.onrender.com`
   - `VITE_SUPABASE_URL`: `https://<your-project-ref>.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: Anon public key from Supabase.
5. Vercel automatically uses `apps/web/vercel.json` for SPA routing and security headers.

### Option B: Netlify Deployment
1. Connect repository in Netlify.
2. Set **Base directory** to `apps/web`.
3. Set **Build command** to `npm ci && npm run check:deployment && npm run build`.
4. Set **Publish directory** to `dist` (relative to the `apps/web` base directory).
5. Netlify uses `apps/web/netlify.toml` for redirect rules (`/* -> /index.html`).

---

## 4. Production Smoke Verification Matrix

After deployment, verify the live services using this 5-point checklist:

1. **Health Check:**
   ```bash
   curl -i https://<your-backend>.onrender.com/api/health
   # Expected: HTTP 200 OK, {"status": "ok"}
   ```

2. **CORS Verification:**
   ```bash
   curl -i -X OPTIONS https://<your-backend>.onrender.com/api/health \
     -H "Origin: https://<your-frontend>.vercel.app" \
     -H "Access-Control-Request-Method: GET"
   # Expected: HTTP 200 with Access-Control-Allow-Origin header matching your frontend origin.
   ```

3. **Schemes Discovery:**
   ```bash
   curl -i https://<your-backend>.onrender.com/api/schemes?limit=3
   # Expected: HTTP 200 with JSON list of government welfare schemes from PostgreSQL.
   ```

4. **Complaint AI Analysis:**
   ```bash
   curl -i -X POST https://<your-backend>.onrender.com/api/complaints/analyze \
     -H "Content-Type: application/json" \
     -d '{"title": "Broken road with deep potholes", "description": "Road tar washed away", "locality": "Sector 4"}'
   # Expected: HTTP 200 with predicted category "road" and suggested department "Roads & Transport Dept".
   ```

5. **RBAC Isolation:**
   ```bash
   curl -i https://<your-backend>.onrender.com/api/officer/complaints
   # Expected: HTTP 401 Unauthorized (unauthenticated requests rejected).
   ```
