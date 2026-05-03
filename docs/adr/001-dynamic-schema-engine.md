# ADR 001: Dynamic Schema Engine with Physical Tables

## Status

Accepted

## Context

ISET Tozeur needs a flexible data platform where administrators can define data structures without developer intervention. The observatory tracks varied data (students, alumni, enrollments, partnerships) and the schema evolves frequently as new data collection needs arise.

The alternatives considered were:
1. **EAV (Entity-Attribute-Value)** — Store all dynamic data in a single table with key-value rows
2. **JSON columns** — Store dynamic data as JSON in a single `data` column
3. **Physical tables** — Create real PostgreSQL tables for each dynamic entity

## Decision

We chose **physical tables** with a `dt_` prefix. Each dynamic table definition in `dynamic_tables` metadata corresponds to a real PostgreSQL table (e.g., `dt_students`). Fields are real columns with proper types.

The schema engine:
- Stores table/field metadata in `dynamic_tables` and `dynamic_fields`
- Executes safe DDL (CREATE TABLE, ALTER TABLE ADD/DROP COLUMN) with sanitized identifiers
- Maps field types to PostgreSQL types (text→VARCHAR(500), number→INTEGER, etc.)
- Adds standard columns (`id`, `created_at`, `updated_at`, `created_by`, optionally `cin`)

## Consequences

**Positive:**
- Full PostgreSQL type safety, constraints, and indexing on dynamic data
- Standard SQL queries work naturally (no complex EAV joins)
- Referential integrity via real foreign keys (`user_link` → `users(cin)`)
- Performance identical to hand-coded tables
- Familiar tooling works (pg_dump, psql, any SQL client)

**Negative:**
- DDL operations require careful identifier sanitization to prevent SQL injection
- Schema changes are not transactional in PostgreSQL (DDL auto-commits)
- Cannot rename columns without data migration (ALTER COLUMN RENAME is supported but must update metadata)
- Table/field count is bounded by PostgreSQL limits (practically not an issue)

**Mitigations:**
- `assertValidIdentifier()` validates all identifiers against `/^[a-z0-9_]+$/` at every use point
- `assertDtPrefix()` prevents dropping system tables (only `dt_*` tables can be dropped)
- All DDL is executed via the schema engine service, never from raw user input
