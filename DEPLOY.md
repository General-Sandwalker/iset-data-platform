# Deploy & Rebuild Guide

## Prerequisites

- Docker & Docker Compose v2+
- A Groq API key (get one at https://console.groq.com) — only needed for AI features

---

## First-Time Setup

### 1. Create your `.env` file

The project uses a **single `.env` file at the repository root**. There is no `.env` inside `backend/` or `web-frontend/`.

```bash
cp .env.example .env
```

### 2. Edit `.env` with your real values

```bash
nano .env
```

Key variables you must change:

| Variable | What it does | Default |
|----------|-------------|---------|
| `JWT_SECRET` | Signs JWT tokens — use a long random string in production | `your-super-secret-jwt-key-change-in-production` |
| `SUPER_ADMIN_PASSWORD` | Password for the auto-seeded super admin account | `change-me-in-production` |
| `GROQ_API_KEY` | Required for AI features (survey generation, chart suggestions, report generation) | `your-groq-api-key-here` |

Variables with safe defaults you can leave as-is:

| Variable | Default | Notes |
|----------|---------|-------|
| `DATABASE_URL` | `postgresql://postgres:postgres@postgres:5432/iset_db` | Uses the Docker postgres service |
| `SUPER_ADMIN_USERNAME` | `admin` | Auto-seeded on first boot |
| `UPLOAD_MAX_SIZE` | `52428800` (50 MB) | Max file upload size in bytes |
| `FRONTEND_URL` | `http://localhost:3000` | Used by backend for CORS |
| `VITE_API_URL` | `http://localhost:4000` | Backend API URL baked into frontend at build time |

### 3. Build and start

```bash
docker compose up -d --build
```

This builds all three services (postgres, backend, web-frontend) and starts them.

### 4. Verify

```bash
# Backend health check
curl http://localhost:4000/health

# Frontend — open in browser
open http://localhost:3000

# Login with super admin
# Username: admin  (or whatever SUPER_ADMIN_USERNAME is set to)
# Password: <your SUPER_ADMIN_PASSWORD>
```

---

## Rebuilding After Code Changes

When you change source code and want to deploy the updated version:

```bash
# Rebuild and restart everything
docker compose up -d --build

# Or rebuild only the service you changed:
docker compose up -d --build backend      # backend code changed
docker compose up -d --build web-frontend # frontend code changed
```

**Important:** The frontend is a static build (Vite → nginx). Any change to React code requires a full frontend rebuild — there is no hot reload in Docker.

---

## Rebuilding After `.env` Changes

When you change any variable in `.env`:

### Backend-only variables (JWT_SECRET, GROQ_API_KEY, passwords, etc.)

Backend reads env vars at **runtime** from docker-compose environment passthrough:

```bash
docker compose up -d backend
```

No rebuild needed — just restart the backend container so it picks up the new values.

### Frontend build-time variables (VITE_API_URL)

`VITE_API_URL` is baked into the frontend at **build time** by Vite. If you change it:

```bash
docker compose up -d --build web-frontend
```

A rebuild is required because Vite replaces `import.meta.env.VITE_API_URL` during the build step.

### When in doubt

```bash
docker compose up -d --build
```

This rebuilds all services and picks up all `.env` changes. It's always safe.

---

## Common Operations

### Stop everything

```bash
docker compose down
```

### Stop and wipe database

```bash
docker compose down -v
```

This deletes the `pg_data` volume. Next `docker compose up -d` will re-create the database, run migrations, and seed the super admin.

### View logs

```bash
docker compose logs -f backend        # follow backend logs
docker compose logs -f web-frontend   # follow nginx logs
docker compose logs -f postgres       # follow postgres logs
docker compose logs -f                # follow all services
```

### Restart a single service

```bash
docker compose restart backend
```

### Check running containers

```bash
docker compose ps
```

### Shell into a container

```bash
docker compose exec backend sh        # backend container shell
docker compose exec postgres psql -U postgres iset_db  # database shell
```

---

## Environment Variable Reference

All variables live in the **root `.env`** file. Docker Compose reads it automatically.

| Variable | Required | Build/Runtime | Description |
|----------|----------|---------------|-------------|
| `DATABASE_URL` | Yes | Runtime | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Runtime | Secret for signing JWT tokens |
| `JWT_EXPIRES_IN` | No | Runtime | Token expiry (default: `24h`) |
| `SUPER_ADMIN_USERNAME` | Yes | Runtime | Auto-seeded admin username |
| `SUPER_ADMIN_PASSWORD` | Yes | Runtime | Auto-seeded admin password |
| `GROQ_API_KEY` | Yes* | Runtime | Groq API key for AI features |
| `UPLOAD_MAX_SIZE` | No | Runtime | Max upload size in bytes |
| `FRONTEND_URL` | No | Runtime | CORS origin for backend |
| `VITE_API_URL` | No | **Build time** | Backend API URL for frontend |
| `SMTP_HOST` | No | Runtime | SMTP server hostname |
| `SMTP_PORT` | No | Runtime | SMTP server port |
| `SMTP_USER` | No | Runtime | SMTP username |
| `SMTP_PASS` | No | Runtime | SMTP password |

\* AI endpoints return an error if `GROQ_API_KEY` is not a valid key. All other features work without it.

---

## Port Map

| Service | Host Port | Container Port |
|---------|-----------|----------------|
| Frontend (nginx) | 3000 | 80 |
| Backend (Express) | 4000 | 4000 |
| PostgreSQL | 5432 | 5432 |

---

## Troubleshooting

### Backend won't start — database connection refused

Postgres takes a few seconds to become ready. The `healthcheck` in docker-compose waits for it, but if you see this error:

```bash
docker compose restart backend
```

### "Invalid API Key" from Groq AI endpoints

Your `GROQ_API_KEY` in `.env` is still the placeholder. Replace it with a real key from https://console.groq.com, then:

```bash
docker compose up -d backend
```

### Frontend shows old version after rebuild

Browser cache. Hard-refresh with Ctrl+Shift+R (or Cmd+Shift+R on Mac).

### Migrations need to re-run

Migrations run automatically on backend startup. To force a fresh database:

```bash
docker compose down -v
docker compose up -d
```

### Reset super admin password

The super admin is only seeded if it doesn't already exist. To reset:

```bash
docker compose exec postgres psql -U postgres iset_db -c "DELETE FROM users WHERE role = 'super_admin';"
docker compose restart backend
```

The backend will re-seed the super admin on next boot using the current `.env` values.
