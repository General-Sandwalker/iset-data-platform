# Performance Optimizations

This document describes all performance optimizations applied to the ISET Tozeur Digital Observatory platform.

## Database Indexes

### Core Indexes (pre-existing via migrations + PK/UNIQUE constraints)

| Table | Column | Type |
|-------|--------|------|
| `users` | `cin` | UNIQUE |
| `users` | `role` | INDEX |
| `dynamic_tables` | `name` | UNIQUE |
| `dynamic_fields` | `table_id` | INDEX |
| `surveys` | `published_slug` | UNIQUE |
| `charts` | `id` | PRIMARY KEY |

### Composite / Ordering Indexes (migration 007)

Added via `backend/migrations/007_performance_indexes.sql`:

| Index | On | Purpose |
|-------|----|---------|
| `idx_dynamic_fields_table_id_order` | `dynamic_fields(table_id, order)` | Field ordering queries |
| `idx_dynamic_tables_owner_id` | `dynamic_tables(owner_id)` | User-owned tables lookup |
| `idx_surveys_status_created` | `surveys(status, created_at DESC)` | Survey list by status |
| `idx_charts_type_created` | `charts(chart_type, created_at DESC)` | Charts list by type |
| `idx_dashboards_created` | `dashboards(created_at DESC)` | Dashboard ordering |
| `idx_activity_logs_user_time` | `activity_logs(user_id, created_at DESC)` | User activity log queries |
| `idx_activity_logs_time` | `activity_logs(created_at DESC)` | Recent activity log queries |
| `idx_partnerships_companies_name` | `partnerships_companies(name)` | Company name search |
| `idx_partnerships_offers_company_status` | `partnerships_offers(company_id, status)` | Company offers by status |
| `idx_report_templates_type_created` | `report_templates(template_type, created_at DESC)` | Template list by type |

## Pagination

All list endpoints use database-level pagination with consistent parameters:

- **Default limit:** 20 records per page
- **Maximum limit:** 100 records per page
- **Shared schema:** `paginationSchema` in `backend/src/middleware/pagination.ts`
- **Shared helper:** `parsePagination()` for extracting page/limit from validated query params
- **Response format:** `{ success, data, meta: { page, limit, total } }`

### Paginated Endpoints

- `GET /api/v1/schema-engine/tables`
- `GET /api/v1/schema-engine/relationships`
- `GET /api/v1/schema-engine/my-records`
- `GET /api/v1/schema-engine/tables/:id/data`
- `GET /api/v1/survey-engine`
- `GET /api/v1/viz-engine/charts`
- `GET /api/v1/viz-engine/dashboards`
- `GET /api/v1/partnerships/companies`
- `GET /api/v1/partnerships/offers`
- `GET /api/v1/partnerships/collaborations`
- `GET /api/v1/report-center/templates`
- `GET /api/v1/report-center/reports`
- `GET /api/v1/system-admin/academic-years`
- `GET /api/v1/system-admin/activity-logs`
- `GET /api/v1/data-ingestion` (max limit enforced)
- `GET /api/v1/public/surveys` (fixed LIMIT 20)

## Chart Data Payload Limit

Chart data endpoints enforce `MAX_CHART_LIMIT = 10000` rows server-side (default 500). This prevents excessive memory usage and response sizes when visualizing large dynamic tables.

## Frontend Optimizations

### React.lazy + Suspense (Code Splitting)

All 30+ page components in `App.tsx` use `React.lazy()` for route-based code splitting:

```tsx
const ChartsPage = lazy(() => import('./viz-builder/charts'));
```

Each lazy-loaded route is wrapped in a `<Suspense>` boundary with an Ant Design `Spin` fallback.

### Vite Manual Chunks

The Vite build configuration splits vendor code into separate bundles:

| Chunk | Contents | Rationale |
|-------|----------|-----------|
| `vendor-react` | react, react-dom, react-router-dom | Core framework (rarely changes) |
| `vendor-antd` | antd, @ant-design/icons | UI library (large, stable) |
| `vendor-charts` | @ant-design/charts | Chart library (large, isolated) |
| `vendor-query` | @tanstack/react-query, zustand, axios | Data/state layer |

This allows browsers to cache vendor bundles independently from application code.

### React Query Caching

`@tanstack/react-query` is configured with:

- **Global defaults:** `staleTime: 5min`, `retry: 1`
- **Analytics queries:** `staleTime: 10min` (aggregated data changes infrequently)
- **Mapping queries:** `staleTime: 30min` (table mappings rarely change)

Custom query hooks are provided in `web-frontend/src/core/hooks/useAnalyticsQueries.ts` with proper query key management for cache invalidation by filter.

## Nginx Optimizations

### Gzip Compression

Enabled for: `text/plain`, `text/css`, `text/xml`, `text/javascript`, `application/javascript`, `application/json`, `application/xml`, `application/rss+xml`, `image/svg+xml`

### Caching Headers

| Location | Cache Policy |
|----------|-------------|
| `/assets/` | 1 year, `public, immutable` (hashed filenames from Vite) |
| `*.js, *.css, *.png, *.jpg, ...` | 30 days, `public, no-transform` |
| `/uploads/` | 7 days, `public` |
| `/api` | No caching (proxy to backend) |

### File Serving for Uploads

The `/uploads/` location serves static files from `/usr/share/nginx/uploads/` directly via nginx, bypassing the Node.js backend. The Docker image creates this directory at build time.

### Proxy Headers

The API proxy passes `X-Real-IP`, `X-Forwarded-For`, and `X-Forwarded-Proto` headers for proper request tracking.

## Analytics SQL Optimization

All analytics service functions have been refactored from multiple sequential queries into single CTE (Common Table Expression) queries:

| Function | Before | After | Reduction |
|----------|--------|-------|-----------|
| `getEnrollmentsSummary` | 5 queries | 1 CTE query | 80% |
| `getSuccessRates` | 4 queries | 1 CTE query | 75% |
| `getTeacherStats` | 5 queries | 1 CTE query | 80% |
| `getFormationStats` | 5 queries | 1 CTE query | 80% |
| `getEventStats` | 5 queries | 1 CTE query | 80% |
| `getInsertionRates` | 5 queries | 1 CTE query | 80% |
| `getInsertionDelays` | 4 queries | 1 CTE query | 75% |
| `getInsertionSectors` | 4 queries | 1 CTE query | 75% |
| `getInsertionContracts` | 4 queries | 1 CTE query | 75% |

### CTE Pattern

Each function uses a `WITH filtered AS (SELECT * FROM table WHERE ...)` CTE to apply user filters once, then branches into multiple aggregate CTEs. The `byPromotion` and `byYear` breakdowns query the base table directly (without user filters) since they display trend data across all years/promotions.

The single-query approach reduces:
- Round-trips to the database (from 4-5 to 1 per endpoint)
- Repeated WHERE clause evaluation (filtered once via CTE)
- Connection pool pressure under concurrent requests
