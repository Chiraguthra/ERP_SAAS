# Docker setup

This project runs with Docker Compose: **PostgreSQL**, **backend (FastAPI)**, and **frontend (Vite + nginx)**.

## Quick start

1. Copy env and set a strong `SESSION_SECRET` for production:
   ```bash
   cp .env.example .env
   ```

2. Build and run:
   ```bash
   docker compose up --build
   ```

3. Open **http://localhost** for the app. API: **http://localhost:8080** (or via frontend `/api`).

4. Default login (seeded on first backend start): **admin** / **admin123** — change in production.

## Tables in Postgres

The **backend** creates all required tables in PostgreSQL on startup (`Base.metadata.create_all`). When `docker compose up` runs:

1. Postgres starts and becomes healthy.
2. Backend starts (after Postgres is healthy), connects to the DB, and runs table creation.
3. Tables `users`, `products`, `customers`, `orders`, `order_items` are created if they don’t exist.

The backend also retries connecting for up to ~30 seconds so that tables are created once the DB is ready.

## Services

| Service   | Image build              | Port  | Description                    |
|-----------|--------------------------|-------|--------------------------------|
| postgres  | `postgres:16-alpine`     | 5432  | PostgreSQL database            |
| backend   | `backend/Dockerfile`     | 8080  | FastAPI + uvicorn (creates DB tables on start) |
| frontend  | `Dockerfile.frontend`    | 80    | Static build + nginx (proxies `/api` to backend) |

## Recommendations

- **Production:** Set `POSTGRES_PASSWORD` and `SESSION_SECRET` in `.env`; do not use defaults.
- **Seeding:** Backend seeds an `admin` user on startup. Optionally call `POST /api/seed` to add sample products/customers (if your backend exposes it).
- **Health:** Backend has `GET /api/health`. You can add a `healthcheck` in `docker-compose.yml` for the backend if you use an orchestrator.
- **Logs:** Use `docker compose logs -f backend` (or `frontend`, `postgres`) to debug.
- **Local dev without Docker:** Keep using SQLite by not setting `DATABASE_URL`; run backend and frontend with `npm run dev:backend` and `npm run dev` as before.
