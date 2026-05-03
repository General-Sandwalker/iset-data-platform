# ADR 006: No Signup — Admin-Provisioned Accounts

## Status

Accepted

## Context

The platform manages sensitive academic data. We considered:
1. **Open signup** — Anyone can create an account
2. **Invitation-based signup** — Users sign up with an invitation code
3. **Admin-provisioned** — Only administrators can create accounts

## Decision

We chose **admin-provisioned accounts**. There is no signup endpoint. Administrators create user accounts individually or via bulk import. Each new account receives an auto-generated temporary password that must be changed on first login.

## Consequences

**Positive:**
- Strict access control — only authorized individuals get accounts
- Prevents spam and unauthorized registrations
- Admin assigns the correct role immediately (no self-selection)
- CIN is verified at creation time (admin knows the student's real CIN)
- Bulk import from institutional CSV/Excel files matches existing workflows

**Negative:**
- Administrative overhead for creating accounts
- Cannot scale to open-access scenarios (e.g., public survey respondents needing accounts)
- Temporary password delivery requires out-of-band communication (email, paper, etc.)

**Mitigations:**
- Bulk import handles large user creation efficiently (hundreds at once)
- `mustChangePassword` flag forces password change on first login
- Future SMTP integration could automate temporary password delivery
- Public surveys work without accounts (access type = `public`)
