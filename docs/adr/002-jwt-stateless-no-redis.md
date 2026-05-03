# ADR 002: JWT Stateless Authentication (No Redis)

## Status

Accepted

## Context

The platform needs authentication for 6 user roles. We considered:
1. **Session-based auth** — Server-side sessions stored in Redis or database
2. **JWT stateless** — Tokens contain all auth data, no server-side store
3. **JWT with blacklist** — JWT + Redis for token revocation

## Decision

We chose **stateless JWT** with no Redis dependency. Tokens are signed with HS256 and contain user ID, CIN, email, and role. Expiry is configurable (default 24h).

## Consequences

**Positive:**
- No Redis dependency — simpler Docker stack (3 services instead of 4)
- Horizontal scaling without shared state
- No session store to manage or lose
- Token contains all authorization data (no DB lookup per request)

**Negative:**
- Cannot revoke individual tokens before expiry (no blacklist)
- Role changes take effect only after token expiry/re-login
- Token size is larger than session cookie (still small — ~500 bytes)

**Mitigations:**
- 24h token expiry limits the window of stale permissions
- Admin can deactivate user account — `authenticate()` middleware checks `isActive` from DB on every request
- Password changes invalidate the current session client-side (frontend clears token)
- Rate limiting on auth endpoints prevents brute force
- `algorithms: ['HS256']` specified in `jwt.verify()` to prevent algorithm confusion attacks
