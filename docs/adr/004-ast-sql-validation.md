# ADR 004: AST-Based SQL Validation

## Status

Accepted

## Context

The visualization engine allows admins to write SQL queries against dynamic tables for chart data. This is essential for flexible analytics but introduces SQL injection risk. We considered:
1. **Blocklist approach** — Block keywords like DROP, DELETE, INSERT, UPDATE
2. **Allowlist approach** — Only allow pre-approved query templates
3. **AST parsing** — Parse SQL into an Abstract Syntax Tree and validate structure

## Decision

We chose **AST-based SQL validation** using `node-sql-parser`. All user-submitted SQL is:
1. Parsed into an AST
2. Rejected if it contains multiple statements
3. Rejected if the statement is not a single SELECT
4. Executed in a `BEGIN READ ONLY` transaction with `SET LOCAL statement_timeout = 10000` (10 seconds)

## Consequences

**Positive:**
- Cryptographically sound validation — cannot be bypassed with tricks (comments, encoding, case manipulation)
- Only SELECT statements can execute — DROP, INSERT, UPDATE, DELETE are impossible at the AST level
- Read-only transaction provides defense in depth — even if validation is bypassed, writes fail
- 10-second timeout prevents long-running queries from consuming resources
- Parameterized LIMIT clause prevents injection through pagination

**Negative:**
- `node-sql-parser` adds a dependency (~2MB)
- Complex but valid SELECT queries (CTEs, subqueries) are allowed — could be expensive
- Cannot restrict which tables the query accesses (any `dt_*` table is accessible)

**Mitigations:**
- Table identifiers are validated with `assertValidIdentifier()` at execution time
- `MAX_CHART_LIMIT = 10000` prevents excessive row counts
- Raw SQL execution is admin-only
- Chart execution is authenticated-only with activity logging
