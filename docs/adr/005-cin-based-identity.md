# ADR 005: CIN-Based User Identity

## Status

Accepted

## Context

ISET Tozeur is a Tunisian academic institution. The national identity card number (CIN — Carte d'Identite Nationale) is the standard unique identifier for citizens. We considered:
1. **Email-based identity** — Users log in with email
2. **CIN-based identity** — Users log in with their 8-digit CIN
3. **Username-based identity** — Users choose a username

## Decision

We chose **CIN-based identity**. Regular users log in with their CIN. The super admin (seeded from environment) uses a configurable username since it has no CIN.

User linking to dynamic data works via the `cin` column on user-linked dynamic tables. The `user_link` field type creates a foreign key to `users(cin)`.

## Consequences

**Positive:**
- Matches institutional practice — CIN is the standard identifier in Tunisian universities
- Guaranteed unique — issued by the state
- Enables automatic data linking — a student's CIN links their records across all dynamic tables
- No signup needed — admins create accounts with the user's CIN

**Negative:**
- CIN is personal data — must be handled carefully (not logged, not exposed to unauthorized users)
- Super admin has no CIN — requires special login logic (username-based)
- CIN format is Tunisia-specific (8 digits) — not internationally portable

**Mitigations:**
- CIN is never logged in activity logs
- `my-records` endpoint only returns data for the authenticated user's own CIN
- Super admin CIN is NULL in the database
- Login accepts either CIN or super admin username via a single `identifier` field
