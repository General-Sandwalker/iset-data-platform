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
| `POSTGRES_PASSWORD` | PostgreSQL database password | `postgres` |

Variables with safe defaults you can leave as-is:

| Variable | Default | Notes |
|----------|---------|-------|
| `DATABASE_URL` | `postgresql://postgres:postgres@postgres:5432/iset_db` | Uses the Docker postgres service |
| `SUPER_ADMIN_USERNAME` | `admin` | Auto-seeded on first boot |
| `UPLOAD_MAX_SIZE` | `52428800` (50 MB) | Max file upload size in bytes |
| `FRONTEND_URL` | `http://localhost:3000` | Used by backend for CORS |
| `VITE_API_URL` | `http://localhost:4000` | Backend API URL baked into frontend at build time |
| `PORT` | `4000` | Backend server port |
| `JWT_EXPIRES_IN` | `24h` | JWT token expiry duration |

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
# Username: admin (or whatever SUPER_ADMIN_USERNAME is set to)
# Password: <your SUPER_ADMIN_PASSWORD>
```

### 5. Set up analytics mappings

After first login, navigate to **Analytics** and map each analytics category to the corresponding dynamic table:
- `analytics_students_table` → your students table
- `analytics_teachers_table` → your teachers table
- `analytics_formations_table` → your formations table
- `analytics_events_table` → your events table
- `analytics_alumni_table` → your alumni table

---

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│   Backend    │────▶│  PostgreSQL  │
│  (nginx)     │     │  (Express)   │     │  (postgres)  │
│  Port 3000   │     │  Port 4000   │     │  Port 5432   │
└──────────────┘     └──────────────┘     └──────────────┘
     Static            API Server           Database
     Assets            + Migrations         + Data
```

- **Frontend** serves the React SPA and proxies `/api` requests to the backend
- **Backend** runs Express with auto-migrations on boot, seeds super admin if not exists
- **PostgreSQL** stores all data with automatic migrations on backend startup

### Docker Volumes

| Volume | Mount Point | Purpose |
|--------|------------|---------|
| `pg_data` | `/var/lib/postgresql/data` | PostgreSQL data persistence |
| `uploads_data` | `/app/uploads` (backend) + `/usr/share/nginx/uploads` (frontend) | Uploaded files, imports, exports |

### Health Checks

All services have health checks configured in `docker-compose.yml`:
- **postgres:** `pg_isready -U postgres`
- **backend:** `curl -f http://localhost:4000/health`
- **web-frontend:** `curl -f http://127.0.0.1:80/`

Backend waits for postgres to be healthy before starting (`depends_on: service_healthy`).

---

## Rebuilding After Code Changes

When you change source code and want to deploy the updated version:

```bash
# Rebuild and restart everything
docker compose up -d --build

# Or rebuild only the service you changed:
docker compose up -d --build backend       # backend code changed
docker compose up -d --build web-frontend  # frontend code changed
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

## Backup & Restore

### Database Backup

```bash
# Create a backup
docker compose exec postgres pg_dump -U postgres iset_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
docker compose exec postgres pg_dump -U postgres -F c iset_db > backup_$(date +%Y%m%d_%H%M%S).dump
```

### Database Restore

```bash
# From SQL backup
cat backup_20260503.sql | docker compose exec -T postgres psql -U postgres iset_db

# From compressed backup
docker compose exec -T postgres pg_restore -U postgres -d iset_db < backup_20260503.dump
```

### Full System Backup

```bash
# Stop services
docker compose down

# Back up the PostgreSQL data volume
docker run --rm -v iset-data-platform_pg_data:/data -v $(pwd):/backup alpine tar czf /backup/pg_data_backup_$(date +%Y%m%d).tar.gz -C /data .

# Back up uploaded files
docker run --rm -v iset-data-platform_uploads_data:/data -v $(pwd):/backup alpine tar czf /backup/uploads_backup_$(date +%Y%m%d).tar.gz -C /data .

# Restart services
docker compose up -d
```

### Full System Restore

```bash
# Stop services
docker compose down

# Restore PostgreSQL data
docker run --rm -v iset-data-platform_pg_data:/data -v $(pwd):/backup alpine sh -c "cd /data && tar xzf /backup/pg_data_backup_YYYYMMDD.tar.gz"

# Restore uploaded files
docker run --rm -v iset-data-platform_uploads_data:/data -v $(pwd):/backup alpine sh -c "cd /data && tar xzf /backup/uploads_backup_YYYYMMDD.tar.gz"

# Restart services
docker compose up -d
```

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
docker compose logs --tail 100 backend # last 100 lines
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
docker compose exec backend sh                    # backend container shell
docker compose exec postgres psql -U postgres iset_db  # database shell
```

---

## Production Deployment Checklist

1. **Change all secrets** in `.env`:
   - `JWT_SECRET` — generate a 32+ character random string
   - `SUPER_ADMIN_PASSWORD` — strong password
   - `POSTGRES_PASSWORD` — strong password
   - `GROQ_API_KEY` — valid Groq API key

2. **Set NODE_ENV:**
   - Already set to `production` automatically in Docker

3. **Configure reverse proxy** (if using):
   - Set `FRONTEND_URL` to your public URL
   - Set `VITE_API_URL` to your backend's public URL
   - Rebuild frontend: `docker compose up -d --build web-frontend`

4. **Set up TLS:**
   - Use a reverse proxy (nginx, Caddy, Traefik) in front of the Docker stack
   - The frontend nginx container serves HTTP on port 3000; the reverse proxy should handle TLS termination

5. **Configure backups:**
   - Set up a cron job for database backups (see Backup section)
   - Test restore procedure

6. **Verify health:**
   ```bash
   docker compose ps          # all services healthy
   curl http://localhost:4000/health  # backend responds
   ```

7. **Login and verify:**
   - Login with super admin credentials
   - Create a test user, table, and survey
   - Verify AI features work (requires valid GROQ_API_KEY)

---

## Environment Variable Reference

All variables live in the **root `.env`** file. Docker Compose reads it automatically.

| Variable | Required | Build/Runtime | Description |
|----------|----------|---------------|-------------|
| `DATABASE_URL` | Yes | Runtime | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Runtime | Secret for signing JWT tokens (min 32 chars recommended) |
| `JWT_EXPIRES_IN` | No | Runtime | Token expiry (default: `24h`) |
| `SUPER_ADMIN_USERNAME` | Yes | Runtime | Auto-seeded admin username |
| `SUPER_ADMIN_PASSWORD` | Yes | Runtime | Auto-seeded admin password |
| `POSTGRES_PASSWORD` | Yes | Runtime | PostgreSQL password |
| `POSTGRES_USER` | No | Runtime | PostgreSQL user (default: `postgres`) |
| `POSTGRES_DB` | No | Runtime | Database name (default: `iset_db`) |
| `GROQ_API_KEY` | No* | Runtime | Groq API key for AI features |
| `UPLOAD_MAX_SIZE` | No | Runtime | Max upload size in bytes (default: 50MB) |
| `FRONTEND_URL` | No | Runtime | CORS origin for backend |
| `VITE_API_URL` | No | **Build time** | Backend API URL for frontend |
| `PORT` | No | Runtime | Backend server port (default: 4000) |
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

### View backend startup logs

```bash
docker compose logs backend | head -50
```

Look for lines like:
- `Running migration: 001_initial_core_tables.sql`
- `Super admin seeded successfully`
- `Server running on port 4000`

### Export files not downloading

Export files are served via the backend at `/exports/:fileName`. Ensure the `uploads_data` volume is shared correctly. Check:

```bash
docker compose exec backend ls -la uploads/exports/
```
