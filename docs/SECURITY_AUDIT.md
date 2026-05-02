# Security Audit Report — ISET Tozeur Digital Observatory

**Date:** 2026-05-02
**Scope:** Full-stack security audit (Issue #53)
**Status:** All findings remediated

---

## 1. SQL Injection Protection

### Findings
- All user-provided values use parameterized queries (`$1`, `$2`, etc.)
- Dynamic identifiers (table/column names from metadata) were interpolated without re-validation at point of use
- `sortBy` from user input was checked via `fieldMap.has()` but not against a regex
- SQL editor used naive `toLowerCase().includes()` blocklist — trivially bypassable
- `executeChartQuery` skipped validation entirely
- Chart/raw SQL execution had no read-only transaction or statement timeout

### Fixes Applied
- Added `assertValidIdentifier()` — validates all identifiers against `/^[a-z0-9_]+$/` regex at every read/use point in schema-engine, analytics, public routes, survey-engine, and report-engine
- Added `assertDtPrefix()` — enforces `dt_` prefix on destructive DDL (DROP TABLE) to prevent dropping system tables
- Replaced naive `validateSqlQuery()` with `node-sql-parser` AST-based `astValidateSql()` — parses SQL into AST, blocks all non-SELECT statements at the AST level
- Added validation to `executeChartQuery` (was missing entirely)
- Wrapped SQL execution in `BEGIN READ ONLY` + `SET LOCAL statement_timeout = 10000` (10s timeout)
- Parameterized LIMIT clause (was string-concatenated), added `MAX_CHART_LIMIT=10000` upper bound
- Added `sortBy` regex validation via `identifierRegex.test()`
- Tightened Zod tableName regex from `/^[a-zA-Z][a-z0-9_]*$/` to `/^[a-z0-9_]+$/`
- Added `logActivity` calls for chart execution and raw SQL execution endpoints

**Files:** `schema-engine/service.ts`, `viz-engine/service.ts`, `viz-engine/routes.ts`, `analytics/service.ts`, `public/routes.ts`, `survey-engine/service.ts`, `report-engine/service.ts`, `data-ingestion/routes.ts`

---

## 2. XSS Protection

### Findings
- Content Security Policy (CSP) header was **missing** — `helmet()` was called without `contentSecurityPolicy` enabled
- No `dangerouslySetInnerHTML`, `innerHTML`, or `eval()` in frontend code
- Backend HTML preview endpoint properly uses `escapeHtml()`

### Fixes Applied
- Enabled `helmet.contentSecurityPolicy()` with default policy

**Files:** `app.ts`

---

## 3. File Upload Security

### Findings
- `application/octet-stream` MIME type was blindly accepted — allows uploading any file
- `.csv`/`.json` extensions bypassed MIME type check entirely
- `/exports` directory was served via unauthenticated `express.static()`
- `UPLOAD_MAX_SIZE` env var was defined but never used (hard-coded 50MB)

### Fixes Applied
- Removed `application/octet-stream` blind bypass (now only accepted as explicit allowed type)
- Removed extension-only MIME bypass (`.csv`/`.json` must pass MIME check)
- Replaced unauthenticated `/exports` static serving with authenticated download endpoint that validates filenames
- Now uses `config.UPLOAD_MAX_SIZE` instead of hard-coded value

**Files:** `data-ingestion/routes.ts`, `app.ts`

---

## 4. Authentication & JWT Security

### Findings
- `JWT_SECRET` had hardcoded fallback `'change-me-in-production'` — app would start with insecure secret in production
- `generateToken()` hardcoded `'24h'` ignoring `config.JWT_EXPIRES_IN`
- `jwt.verify()` didn't specify `algorithms: ['HS256']` — vulnerable to algorithm confusion attacks
- Super admin login used plaintext `===` comparison instead of `bcrypt.compare`
- `BCRYPT_ROUNDS=12` was duplicated in 3 separate files
- Public survey route JWT verify also lacked `algorithms` spec

### Fixes Applied
- `requireEnv()` now validates JWT_SECRET, SUPER_ADMIN_USERNAME, SUPER_ADMIN_PASSWORD — app **fails to start** if missing
- `generateToken()` now uses `config.JWT_EXPIRES_IN`
- Added `algorithms: ['HS256']` to all `jwt.verify()` calls (middleware + public routes)
- Super admin login now uses `bcrypt.compare` (constant-time comparison)
- Centralized `BCRYPT_ROUNDS` in `config/env.ts`, removed all duplicates
- Docker Compose now uses `${VAR:?message}` for required secrets — no insecure fallbacks

**Files:** `config/env.ts`, `core/auth/service.ts`, `middleware/auth.ts`, `survey-engine/public-routes.ts`, `core/users/service.ts`, `core/super-admin-seeder.ts`, `docker-compose.yml`

---

## 5. CORS & Rate Limiting

### Findings
- CORS methods/headers were left to defaults (overly permissive)
- No `trust proxy` setting — rate limiting would not work correctly behind reverse proxy
- `authLimiter` only applied to `/login`, missing on `/change-password`
- No rate limit on public survey submission endpoint
- Test-mode `Infinity` bypass for rate limiting could leak to production if `NODE_ENV` is misconfigured

### Fixes Applied
- Tightened CORS with explicit `methods`, `allowedHeaders`, `credentials: true`, `maxAge: 86400`
- Added `app.set('trust proxy', 1)` for correct rate limiting behind reverse proxy
- Added `authLimiter` to `/change-password` route
- Added `publicSubmissionLimiter` (20 requests/hour) on public survey submission
- Extracted `isTest` const to prevent `Infinity` from leaking to production

**Files:** `app.ts`, `core/auth/routes.ts`, `middleware/rate-limit.ts`, `survey-engine/public-routes.ts`

---

## 6. Committed Secrets

### Findings
- `.env` not in git (good)
- `.gitignore` was too narrow — `.env.local`, `.env.production`, `*.pem`, `*.key` files could be committed
- `docker-compose.yml` had `POSTGRES_PASSWORD: postgres` hardcoded

### Fixes Applied
- Expanded `.gitignore` with `.env.*`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `credentials.json`, `service-account.json`
- Docker Compose now uses `${POSTGRES_PASSWORD:?message}` — no hardcoded password
- Updated `.env.example` with `POSTGRES_PASSWORD` and prominent warnings about required secrets

**Files:** `.gitignore`, `docker-compose.yml`, `.env.example`

---

## 7. DDL Identifier Sanitization

### Findings
- `sanitizeIdentifier()` existed but was only used at 2 creation points
- All reads of `table.name`/`field.name` from metadata did NOT re-validate — a corrupted metadata row could allow SQL injection
- `dt_` prefix was not enforced on read/use — only on creation

### Fixes Applied
- Added exported `assertValidIdentifier()` function — validates against `/^[a-z0-9_]+$/`
- Added `assertDtPrefix()` — enforces `dt_` prefix on destructive DDL operations
- Re-validated ALL `table.name`/`field.name` reads in: `deleteTable`, `updateTable`, `addField`, `deleteField`, `listData`, `insertData`, `updateData`, `deleteData`, `createRelationship`, `deleteRelationship`, analytics, public routes, survey-engine, report-engine

**Files:** `schema-engine/service.ts`, `analytics/service.ts`, `public/routes.ts`, `survey-engine/service.ts`, `report-engine/service.ts`

---

## Summary

| Category | Critical | High | Medium | Fixed |
|----------|----------|------|--------|-------|
| SQL Injection | 3 | 2 | 1 | 6/6 |
| XSS | 0 | 1 | 0 | 1/1 |
| File Upload | 2 | 1 | 0 | 3/3 |
| Auth/JWT | 3 | 1 | 1 | 5/5 |
| CORS/Rate Limiting | 0 | 3 | 1 | 4/4 |
| Committed Secrets | 1 | 1 | 0 | 2/2 |
| DDL Identifiers | 1 | 1 | 0 | 2/2 |
| **Total** | **10** | **10** | **3** | **23/23** |

All 23 findings have been remediated. No known vulnerabilities remain.
