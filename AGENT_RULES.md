# ISET Tozeur Digital Observatory — Agent Guide

This document guides AI agents working on this codebase. Read it at the start of every session.

---

## Project Overview

A monorepo digital observatory platform for ISET Tozeur replacing scattered Excel files and paper documents. Built around a **dynamic database engine** that allows admins to create tables, fields, and relationships via a visual editor without writing code, augmented by Groq-powered AI assistants.

**Repository:** `General-Sandwalker/iset-data-platform`

**Stack:**
- Backend: Node.js + Express + TypeScript + PostgreSQL 17
- Frontend: React 19 + Vite + TypeScript + Ant Design 6 + Ant Design Charts
- AI: Groq API for survey generation, chart generation, and report generation
- Deployment: Docker Compose (postgres:17-alpine, backend, web-frontend)

---

## Repository Structure

```
/project-root
├── backend/                  # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── config/           # Env, DB connection, Groq client
│   │   ├── core/             # Auth, users, roles, audit
│   │   ├── schema-engine/    # Dynamic tables, fields, relationships, DDL
│   │   ├── data-ingestion/   # CSV/Excel/JSON import, mapping, validation
│   │   ├── survey-engine/   # Surveys, questions, responses, publishing
│   │   ├── viz-engine/      # Charts, dashboards, SQL executor
│   │   ├── report-engine/   # AI report generation, PDF/Excel export
│   │   ├── analytics/        # Pre-built academic & insertion queries
│   │   ├── partnerships/    # Companies, offers, collaborations
│   │   ├── ai-services/     # Groq prompt builders, context assemblers
│   │   ├── middleware/       # AuthZ, validation, error handling, rate limit
│   │   └── utils/           # File storage, backup, mailer stubs
│   ├── uploads/             # Persistent volume for imports/exports
│   ├── Dockerfile
│   └── package.json
├── web-frontend/             # React 19 + Vite + TypeScript + Ant Design 6
│   ├── src/
│   │   ├── app/             # Routing, layouts, role guards
│   │   ├── core/            # Auth context, API client, Zustand stores
│   │   ├── admin/           # DB manager, import wizard, user mgmt
│   │   ├── survey-builder/  # Visual survey editor + AI panel
│   │   ├── viz-builder/     # Chart editor, SQL editor, dashboard builder
│   │   ├── report-center/   # Report templates, AI generator, preview
│   │   ├── analytics/       # Academic & insertion dashboards
│   │   ├── portals/         # Student, Alumni, Teacher, Observatoire views
│   │   ├── public-pages/    # Landing page, public dashboards, public forms
│   │   └── design-system/   # Ant Design theme tokens, shared components
│   ├── public/
│   ├── Dockerfile
│   └── package.json
├── mobile-frontend/          # Scaffold only — future Jetpack Compose
├── docs/                     # Project documentation
├── docker-compose.yml        # 3 services: postgres, backend, web-frontend
└── .env.example              # Environment variables template
```

---

## Current Work Status

### Phase 1: Foundation & DevOps ✅ Complete

| Issue | Title | Status |
|-------|-------|--------|
| #1 | Initialize monorepo structure and Docker Compose | ✅ Done |
| #2 | Setup Node.js backend scaffolding | ✅ Done |
| #3 | Setup React 19 frontend scaffolding | ✅ Done |
| #4 | Setup PostgreSQL connection and migration runner | ✅ Done |
| #5 | Implement global middleware and error handling | ✅ Done |
| #6 | Seed super admin from environment | ✅ Done |

### Phase 2: Identity, Access Control & User Management ✅ Complete

| Issue | Title | Status |
|-------|-------|--------|
| #7 | Implement authentication API | ✅ Done |
| #8 | Implement user management API | ✅ Done |
| #9 | Build login page and auth context | ✅ Done |
| #10 | Build admin user management UI | ✅ Done |
| #11 | Implement user import wizard frontend | ✅ Done |

### Phase 3: Dynamic Schema Engine & Visual Database Manager (Next)

**6 issues remaining in Phase 3.**

---

## How to Continue Work in a New Session

### Step 1: Check Git Status
```bash
git status
git log --oneline -3
```
See what was committed last and if there are uncommitted changes.

### Step 2: Check Current Issue
```bash
gh issue list --milestone "Phase 1: Foundation & DevOps" --state open
```
Pick up where the previous work left off. Issues must be completed in order within each phase.

### Step 3: Start Docker if Needed
```bash
docker compose ps
```
If nothing is running:
```bash
docker compose up -d
```
Wait for postgres to be healthy, then start backend:
```bash
docker compose up -d backend
```

### Step 4: Verify Backend is Running
```bash
curl http://localhost:4000/health
```
Or check logs:
```bash
docker compose logs backend
```

---

## Issue Workflow

### Before Starting an Issue
1. Read the issue title and description fully
2. Understand the acceptance criteria from PROJECT_SPECS.md
3. Check what files already exist to avoid duplication

### During Implementation
- Make atomic commits: one logical change per commit
- Follow existing code patterns in the codebase
- Do not refactor working code unless explicitly required
- Preserve backward compatibility

### After Completing an Issue
1. Verify the application still imports correctly
2. Run any existing tests
3. Verify no breaking changes were introduced
4. Test the feature works as specified
5. Close the issue with `gh issue close <number> --comment "<details>"`
6. Commit the changes

---

## Important Conventions

### API Response Format
All API endpoints use a consistent JSON envelope:
```typescript
{
  success: boolean,
  data?: any,
  error?: { code: string, message: string, details?: any },
  meta?: { page: number, limit: number, total: number }
}
```

### Database Conventions
- Core tables use the standard naming
- Dynamic tables are prefixed with `dt_` (e.g., `dt_students`)
- All identifiers (table names, column names) must be sanitized — only `[a-z0-9_]` allowed
- Use parameterized queries exclusively — no string interpolation for user values

### File Upload
- Accepted extensions: `csv`, `xlsx`, `xls`, `json`
- Max size: 50MB (configurable via `UPLOAD_MAX_SIZE`)
- Files stored in `backend/uploads/` with subdirectories: `imports/`, `exports/`, `backups/`, `public/`

### Authentication
- JWT-based stateless sessions (24h expiry)
- No signup endpoint — users are created by admins
- Super admin is seeded from `.env` on first boot
- Login identifier: CIN for regular users, username for super admin

### AI Features
- All AI endpoints use Groq API
- AI never writes directly to the database — always returns a suggestion for human confirmation
- Rate limited to prevent abuse

---

## Security Rules

- **NEVER** commit secrets, API keys, or credentials
- **NEVER** skip validation on user input
- **ALWAYS** use parameterized SQL queries
- **ALWAYS** verify JWT on protected routes
- **ALWAYS** check role permissions (RBAC) before allowing actions
- File uploads must validate MIME type and extension

---

## Docker Commands Reference

```bash
# Start everything
docker compose up -d

# View logs
docker compose logs -f backend

# Restart a service
docker compose restart backend

# Stop everything
docker compose down

# Rebuild after changes
docker compose build backend && docker compose up -d backend
```

---

## Useful Queries

```bash
# List all open issues across all milestones
gh issue list --state open

# List issues in current milestone
gh issue list --milestone "Phase 1: Foundation & DevOps" --state open

# View specific issue
gh issue view 2

# Close issue
gh issue close 2 --comment "Implementation details..."
```

---

## File Locations Reference

| Purpose | Path |
|---------|------|
| Backend entry | `backend/src/index.ts` (to be created) |
| Frontend entry | `web-frontend/src/main.tsx` (to be created) |
| Docker Compose | `docker-compose.yml` |
| Environment template | `.env.example` |
| Project specification | `PROJECT_SPECS.md` |
| Initial prompt | `INITIAL_PROMPT.md` |

---

*Last updated: 2026-04-26*