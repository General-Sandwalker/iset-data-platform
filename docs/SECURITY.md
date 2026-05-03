# Security Documentation — ISET Tozeur Digital Observatory

## Authentication Flow

### Login Process

1. User submits `{ identifier, password }` to `POST /api/v1/auth/login`
2. The `identifier` field accepts:
   - **CIN** (8-digit national ID) for regular users
   - **Username** for super admin accounts (CIN is NULL)
3. The system queries `users` table by CIN or by super_admin role + username
4. Password is verified using `bcrypt.compare()` (constant-time comparison for all roles, including super admin)
5. On success, a JWT token is generated containing: `{ id, cin, email, role, iat, exp }`
6. The token is signed with HS256 using `JWT_SECRET`
7. Token expiry is configurable via `JWT_EXPIRES_IN` (default: 24h)

### Token Validation

Every authenticated request passes through the `authenticate()` middleware:

1. Extract `Authorization: Bearer <token>` header
2. Verify JWT signature with `algorithms: ['HS256']` (prevents algorithm confusion attacks)
3. Check token expiry
4. Load user from database to verify `isActive` status
5. Attach `req.user = { id, cin, email, role }` to the request

### Session Management

- **Stateless:** No server-side session store. JWT contains all authorization data.
- **No token revocation:** Tokens remain valid until expiry. Mitigated by:
  - 24h default expiry limits window
  - `isActive` check on every request (deactivated users are immediately locked out)
  - Client-side token clear on logout
- **No signup:** Accounts are admin-provisioned only. No self-registration endpoint.

### Password Security

- **Bcrypt** with 12 rounds for all password hashing
- Auto-generated temporary passwords for new accounts (8+ characters, mixed case + special chars)
- `mustChangePassword` flag forces password change on first login
- Password change endpoint requires current password verification
- Auth endpoints are rate-limited (10 requests / 15 minutes)

---

## RBAC Model

### Role Hierarchy

| Level | Role | Description |
|-------|------|-------------|
| 1 | `super_admin` | Full system access, can delete tables, manage all settings |
| 2 | `admin` | Can manage users, schema, data, surveys, viz, reports, partnerships, settings |
| 3 | `responsable_observatoire` | Can manage surveys, charts, dashboards, reports, partnerships, analytics |
| 4 | `enseignant` | Read access to surveys, dashboards; can submit survey responses |
| 5 | `etudiant` | Access to own data, surveys, dashboards; can submit survey responses |
| 6 | `alumni` | Access to own data, insertion surveys, insertion dashboards |

### Middleware Guards

| Guard | Allowed Roles |
|-------|--------------|
| `requireSuperAdmin()` | super_admin |
| `requireAdmin()` | super_admin, admin |
| `requireManager()` | super_admin, admin, responsable_observatoire |
| `requireAuthenticated()` | All authenticated users |
| `authorize(...roles)` | Custom subset |

### Permissions Matrix

| Module | super_admin | admin | responsable_observatoire | enseignant | etudiant | alumni |
|--------|:-----------:|:-----:|:-----------------------:|:---------:|:-------:|:-----:|
| User Management (CRUD) | Y | Y | — | — | — | — |
| Database Schema (CRUD) | Y | Y | — | — | — | — |
| Delete Tables | Y | — | — | — | — | — |
| Data Import | Y | Y | — | — | — | — |
| Survey CRUD + Publish | Y | Y | Y | — | — | — |
| Survey List/Submit | Y | Y | Y | Y | Y | Y |
| Chart/Dashboard CRUD | Y | Y | Y | — | — | — |
| Chart Execute | Y | Y | Y | Y | Y | Y |
| Raw SQL Execution | Y | Y | — | — | — | — |
| Report CRUD + Generate | Y | Y | Y | — | — | — |
| Batch Report Generate | Y | Y | — | — | — | — |
| Analytics | Y | Y | Y | — | — | — |
| Partnership CRUD | Y | Y | Y | — | — | — |
| Partnership List | Y | Y | Y | Y | Y | Y |
| System Settings | Y | Y | — | — | — | — |
| Activity Logs | Y | Y | — | — | — | — |
| AI Endpoints | Y | Y | — | — | — | — |
| My Records | Y | Y | Y | Y | Y | Y |

---

## SQL Injection Prevention

### Multi-Layer Defense

The platform uses four layers of SQL injection prevention:

#### Layer 1: Parameterized Queries

All user-provided values use parameterized queries (`$1`, `$2`, etc.). No string interpolation for values.

```typescript
// Safe — parameterized
await query('SELECT * FROM dt_students WHERE cin = $1', [cin]);

// Never done — string interpolation
await query(`SELECT * FROM dt_students WHERE cin = '${cin}'`);
```

#### Layer 2: Identifier Validation

All dynamic identifiers (table names, column names) are validated with `assertValidIdentifier()`:

```typescript
function assertValidIdentifier(name: string): void {
  if (!/^[a-z0-9_]+$/.test(name)) {
    throw new HttpError(400, 'INVALID_IDENTIFIER', `Invalid identifier: ${name}`);
  }
}
```

This is applied at every point where a table/field name from metadata is used in a query — not just at creation time.

#### Layer 3: AST-Based SQL Validation

User-submitted SQL (chart queries, raw SQL editor) is parsed into an Abstract Syntax Tree using `node-sql-parser`:

```typescript
function astValidateSql(sql: string): void {
  const ast = Parser.parse(sql);
  // Must be single statement
  // Must be SELECT only
  // Rejects DROP, INSERT, UPDATE, DELETE, etc. at the AST level
}
```

This replaces the previous naive blocklist approach which could be bypassed.

#### Layer 4: Read-Only Transactions

All chart/raw SQL execution runs in a read-only transaction with a statement timeout:

```sql
BEGIN READ ONLY;
SET LOCAL statement_timeout = 10000;  -- 10 seconds
EXECUTE query;
COMMIT;
```

Even if all validation is bypassed, writes are impossible and queries cannot run indefinitely.

### dt_ Prefix Enforcement

The `assertDtPrefix()` function ensures that destructive DDL operations (DROP TABLE) can only target tables with the `dt_` prefix. System tables (`users`, `dynamic_tables`, etc.) cannot be dropped through the API.

---

## File Upload Security

- **Extension whitelist:** Only `.csv`, `.xlsx`, `.xls`, `.json` files accepted
- **MIME type validation:** Uploaded files must match their claimed extension's MIME type
- **No octet-stream bypass:** `application/octet-stream` is not blindly accepted
- **Size limit:** Configurable via `UPLOAD_MAX_SIZE` (default 50MB)
- **Filename sanitization:** Files are renamed to random IDs on disk
- **Authenticated downloads:** Export files require authentication; filenames validated against `^[a-zA-Z0-9_.\-]+$`
- **No static serving:** Export files are served via an authenticated endpoint, not `express.static()`

---

## Security Headers

The backend uses `helmet()` middleware to set security headers:

- **Content-Security-Policy:** `defaultSrc 'self'`, `styleSrc 'self' 'unsafe-inline'`, `imgSrc 'self' data:`, `connectSrc 'self' <FRONTEND_URL>`
- **Strict-Transport-Security:** Enabled via Helmet defaults
- **X-Content-Type-Options:** nosniff
- **X-Frame-Options:** DENY
- **X-XSS-Protection:** 0 (modern browsers handle this via CSP)

---

## CORS Configuration

- **Origin:** Restricted to `FRONTEND_URL` (no wildcard in production)
- **Methods:** GET, POST, PUT, PATCH, DELETE, OPTIONS
- **Allowed Headers:** Content-Type, Authorization
- **Credentials:** Enabled (for JWT cookie passthrough if needed)
- **Max Age:** 86400 (1 year preflight cache)
- **Trust Proxy:** Set to 1 for correct rate limiting behind reverse proxy

---

## Rate Limiting

| Limiter | Window | Max Requests | Applies To |
|---------|--------|:------------:|------------|
| Global | 15 min | 100 | All routes |
| Auth | 15 min | 10 | `/auth/login`, `/auth/change-password` |
| AI | 60 min | 50 | `/ai/*`, report generation, batch generation |
| Public Submission | 60 min | 20 | `/public/surveys/:slug/submit` |

Rate limiters are disabled in test environment (`NODE_ENV=test`) via `Infinity` max values, with a safety check to prevent leaking to production.

---

## Audit Logging

All write operations are logged to the `activity_logs` table:

- **Who:** `user_id` (from JWT)
- **What:** `action` (e.g., `CREATE_USER`, `AI_GENERATE_REPORT`)
- **Where:** `ip_address`, `user_agent`
- **When:** `created_at` (auto-timestamped)
- **Context:** `metadata` (JSONB, arbitrary key-value data)
- **Entity:** `entity_type` + `entity_id` (e.g., `dynamic_table` + UUID)

Activity log failures are caught silently (console.error only) to prevent blocking user operations.

---

## Secret Management

- **No secrets in code:** All secrets come from environment variables
- **App fails to start** if `JWT_SECRET`, `SUPER_ADMIN_USERNAME`, or `SUPER_ADMIN_PASSWORD` are missing or use placeholder values
- **Docker Compose uses `${VAR:?message}`** for required secrets — fails with a clear error if missing
- **`.gitignore`** covers `.env`, `.env.*`, `*.pem`, `*.key`, `*.p12`, `credentials.json`, `service-account.json`
- **No hardcoded passwords** — even the PostgreSQL password in Docker Compose comes from `.env`

---

## Security Audit Summary

A full security audit was conducted (Issue #53). All 23 findings were remediated:

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

See `docs/SECURITY_AUDIT.md` for the full audit report with details on each finding and fix.
