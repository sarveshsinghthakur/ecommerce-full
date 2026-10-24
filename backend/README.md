# Aurora Store — Python FastAPI Backend

High-performance, production-ready e-commerce backend built with Python FastAPI, SQLAlchemy 2.0, and Neon PostgreSQL.

## Features
- **FastAPI Framework:** Async-capable REST endpoints with automatic OpenAPI documentation (`/docs`).
- **PostgreSQL Database:** Powered by Neon Serverless PostgreSQL (`psycopg` + SQLAlchemy 2.0 ORM).
- **Authentication:** Dual support for Firebase Google Authentication and HMAC-signed session cookies.
- **Paytm Payment Gateway:** Server-side transaction initiation, checksum verification, and authoritative status reconciliation.
- **Resilient Catalog:** Fallback imagery resolution, category filtering, search, sorting, and pagination.

## Local Development Setup

1. **Activate Virtual Environment:**
   ```powershell
   .venv\Scripts\Activate.ps1
   ```

2. **Install Dependencies:**
   ```powershell
   pip install -r requirements.txt pytest
   ```

3. **Configure Environment:**
   Copy `.env.example` to `.env.local` and set `DATABASE_URL` with your Neon PostgreSQL connection string.

4. **Run Server:**
   ```powershell
   uvicorn backend.app.main:app --reload --port 8000
   ```
   API will be available at `http://localhost:8000`.  
   Interactive Swagger docs at `http://localhost:8000/docs`.

5. **Run Tests:**
   ```powershell
   $env:PYTHONPATH="."
   pytest backend/tests/ -v
   ```
