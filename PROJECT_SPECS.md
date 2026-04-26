Here is the complete architectural specification and the agent prompt. I have synthesized the French requirements document with your technical constraints, filled all logical gaps, and structured everything into deliverable-based phases.

---

# ISET Tozeur Digital Observatory — Technical Specification

## 1. Project Overview

This platform is a centralized digital observatory for ISET Tozeur that replaces scattered Excel files and paper documents with a unified web application. It manages academic data, alumni tracking, professional insertion metrics, enterprise partnerships, and dynamic surveys. The system is built around a **dynamic database engine** that allows administrators to create, import, link, and visualize data without writing code, augmented by Groq-powered AI assistants.

**Core Philosophy:** The application is a low-code data platform wrapped in an academic observatory. Admins define the data structure; the system generates the storage, APIs, forms, and visualizations automatically.

---

## 2. Monorepo & Container Architecture

```
/project-root
├── backend/                  # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── config/           # Env, DB connection, Groq client
│   │   ├── core/             # Auth, users, roles, audit
│   │   ├── schema-engine/    # Dynamic tables, fields, relationships, DDL
│   │   ├── data-ingestion/   # CSV/Excel/JSON import, mapping, validation
│   │   ├── survey-engine/    # Surveys, questions, responses, publishing
│   │   ├── viz-engine/       # Charts, dashboards, SQL executor
│   │   ├── report-engine/    # AI report generation, PDF/Excel export
│   │   ├── analytics/        # Pre-built academic & insertion queries
│   │   ├── partnerships/     # Companies, offers, collaborations
│   │   ├── ai-services/      # Groq prompt builders, context assemblers
│   │   ├── middleware/       # AuthZ, validation, error handling, rate limit
│   │   └── utils/            # File storage, backup, mailer stubs
│   ├── uploads/              # Persistent volume for imports/exports
│   └── Dockerfile
├── web-frontend/             # React 19 + Vite + TypeScript + Ant Design 6
│   ├── src/
│   │   ├── app/              # Routing, layouts, role guards
│   │   ├── core/             # Auth context, API client, Zustand stores
│   │   ├── admin/            # DB manager, import wizard, user mgmt
│   │   ├── survey-builder/   # Visual survey editor + AI panel
│   │   ├── viz-builder/      # Chart editor, SQL editor, dashboard builder
│   │   ├── report-center/    # Report templates, AI generator, preview
│   │   ├── analytics/        # Academic & insertion dashboards
│   │   ├── portals/          # Student, Alumni, Teacher, Observatoire views
│   │   ├── public-pages/     # Landing page, public dashboards, public forms
│   │   └── design-system/    # Ant Design theme tokens, shared components
│   └── Dockerfile
├── mobile-frontend/          # Jetpack Compose (future scope — scaffold only)
├── docs/                     # Architecture decisions, API contracts, user manual
└── docker-compose.yml        # 3 services: postgres, backend, web-frontend
```

**Docker Compose Services:**
- `postgres`: `postgres:17-alpine` with named volume `pg_data`.
- `backend`: Node.js image, depends on `postgres`, exposes API, mounts `uploads` volume.
- `web-frontend`: Multi-stage build (Vite dev for local; nginx for production), connects to backend via env proxy.

**No Redis.** Session state is stateless JWT. File processing is streaming.

---

## 3. Backend Architecture & Functional Specification

### 3.1 Core Infrastructure Layer

**Environment & Boot:**
- On first boot, the backend reads `SUPER_ADMIN_USERNAME` and `SUPER_ADMIN_PASSWORD` from `.env`, hashes the password with bcrypt, and seeds the `users` table with `role = 'super_admin'` and `cin = null`. If the super admin exists, skip.
- All other configuration is env-driven: `DATABASE_URL`, `GROQ_API_KEY`, `JWT_SECRET`, `UPLOAD_MAX_SIZE`, `SMTP_*` (optional, for email distribution), `FRONTEND_URL`.

**Database Access:**
- Use `pg` (node-postgres) for all database operations.
- Dynamic DDL (CREATE TABLE, ALTER TABLE, ADD COLUMN) is executed via parameterized-safe string building with strict identifier sanitization (allow only `[a-z0-9_]`).
- Core tables use a lightweight migration runner (ordered `.sql` files executed on startup).
- Dynamic tables are created with a `dt_` prefix to avoid name collisions with core tables.

**Standard API Contract:**
- All endpoints under `/api/v1/*`.
- Consistent JSON envelope: `{ success: boolean, data?: any, error?: { code, message, details }, meta?: { page, limit, total } }`.
- Zod schemas validate every request body, query, and param.
- Centralized async error handler (catch → next(error)).
- Activity logging middleware captures: `user_id`, `action`, `entity_type`, `entity_id`, `ip_address`, `timestamp`.

**Security Middleware:**
- `helmet` for headers.
- `express-rate-limit` (global + stricter for auth and AI endpoints).
- CORS configured to accept `FRONTEND_URL`.
- JWT verification middleware extracts user, attaches to `req.user`.
- RBAC middleware checks `req.user.role` against allowed roles array.
- File upload: `multer` with size limits, extension whitelist (`csv`, `xlsx`, `xls`, `json`), and MIME type validation.

### 3.2 Authentication & Authorization Module (`/api/v1/auth`, `/api/v1/users`)

**Users Table (Core):**
- `id` (UUID, PK)
- `cin` (VARCHAR, UNIQUE, NULL for super admin) — the login identifier for all non-super-admin users.
- `email` (VARCHAR, UNIQUE, NOT NULL)
- `password_hash` (VARCHAR, NOT NULL)
- `role` (ENUM: `super_admin`, `admin`, `responsable_observatoire`, `enseignant`, `etudiant`, `alumni`)
- `first_name`, `last_name`, `phone`
- `is_active` (BOOLEAN, default true)
- `must_change_password` (BOOLEAN, default true for admin-created accounts)
- `created_at`, `updated_at`, `last_login`

**Flows:**
- **Login:** `POST /auth/login` accepts `{ identifier: string, password: string }`. If identifier matches `SUPER_ADMIN_USERNAME` from env, authenticate super admin. Otherwise, treat identifier as `cin` and authenticate regular user. Returns JWT access token.
- **No Signup:** No `POST /auth/register` endpoint exists.
- **Password Reset:** Two paths: (1) Admin resets a user's password via admin panel (generates random temp password). (2) If SMTP is configured, user can request an email token to reset their own password.
- **Me:** `GET /auth/me` returns current user with role permissions.
- **User CRUD (Admin+):** `POST /users` (create by admin), `GET /users` (list, filter by role, paginated), `GET /users/:id`, `PATCH /users/:id`, `DELETE /users/:id`. Admin cannot delete super admin.
- **Bulk Import:** `POST /users/import` accepts CSV/Excel with columns: `cin,email,first_name,last_name,role,phone`. Validates CIN uniqueness, generates random passwords, sends credentials if email is configured.

### 3.3 Dynamic Schema Engine (`/api/v1/schema/*`)

This is the heart of the low-code platform.

**Metadata Tables (Core):**
- `dynamic_tables`: `id`, `name` (db name, e.g., `dt_students`), `display_name`, `description`, `is_user_linked` (BOOLEAN), `created_by`, `created_at`.
- `dynamic_fields`: `id`, `table_id`, `name` (db column name), `display_name`, `field_type`, `config_json` (options for select, validation rules), `is_required`, `order_index`.
- `dynamic_relationships`: `id`, `source_table_id`, `source_field_id`, `target_table_id`, `target_field_id`, `relationship_type` (`one_to_many`, `many_to_one`).

**Field Types Supported:**
`text`, `number`, `decimal`, `date`, `datetime`, `boolean`, `select`, `multiselect`, `email`, `phone`, `file`, `user_link` (special type that creates a VARCHAR column storing a `cin`, logically linked to `users.cin`).

**API Endpoints:**
- `POST /schema/tables` — Creates metadata row + executes `CREATE TABLE dt_<name> (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), cin VARCHAR REFERENCES users(cin) ON DELETE SET NULL IF is_user_linked, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, created_by UUID)`. Then adds custom columns.
- `PATCH /schema/tables/:id` — Renames display name only. DB table name is immutable to preserve data.
- `DELETE /schema/tables/:id` — Drops the physical table and metadata. Restricted to super admin.
- `POST /schema/tables/:id/fields` — Validates name, executes `ALTER TABLE dt_<name> ADD COLUMN <field> <type>`, stores metadata.
- `PATCH /schema/fields/:id` — Alters column type if safe, updates metadata.
- `DELETE /schema/fields/:id` — Drops column.
- `POST /schema/relationships` — Validates that source/target fields exist. For `user_link` fields, the relationship is implicit to `users.cin`. For others, stores metadata and optionally creates a PostgreSQL foreign key constraint if both tables are dynamic.
- `GET /schema/tables` — Returns list of tables with field schemas. Super admin sees core tables too (read-only). Other roles see only dynamic tables.
- `GET /schema/tables/:id/data` — Generic paginated data browser for any dynamic table. Supports filtering, sorting, search.
- `POST /schema/tables/:id/data` — Insert record into dynamic table with validation against field metadata.
- `PATCH /schema/tables/:id/data/:recordId` — Update record.
- `DELETE /schema/tables/:id/data/:recordId` — Soft or hard delete (configurable per table).

**User Linking Logic:**
- When `is_user_linked = true`, the system automatically adds a `cin` column to the dynamic table (if not present).
- The visual linking tool allows admins to mark any field as `user_link` type, which enforces that values must exist in `users.cin`.
- When a student/alumni logs in, the system can fetch their linked records across all user-linked tables.

### 3.4 Data Ingestion & Mapping Module (`/api/v1/import`)

**Upload Endpoint:**
- `POST /import/upload` — Saves file to `uploads/imports/`, returns file ID and detected columns with sample rows (first 10).

**Mapping & Validation:**
- `POST /import/preview` — Accepts `{ fileId, tableId, mappings: [{ sourceColumn, targetField, transform? }] }`. Returns preview of mapped data with validation errors per row.
- `POST /import/execute` — Executes the import. Uses streaming parsers (`csv-parser`, `xlsx` stream, `JSON.parse` for arrays). Inserts valid rows into the target dynamic table in batches. Invalid rows are logged to an `import_errors` JSONB column in the `imports` table.
- `POST /import/create-table-and-import` — Shortcut: upload file, auto-detect types, create a new dynamic table, map columns, and import. AI-assisted via Groq.

**Import History:**
- `GET /import` — List all imports with status (`pending`, `processing`, `completed`, `failed`), row counts, error summaries.

### 3.5 Survey Engine (`/api/v1/surveys`, `/public/surveys/*`)

**Survey Metadata:**
- `surveys`: `id`, `title`, `description`, `target_table_id` (dynamic table where responses are stored), `status` (`draft`, `published`, `closed`), `access_type` (`public`, `authenticated`), `published_slug` (UUID for public URL), `allow_multiple_responses`, `created_by`, `created_at`.
- `survey_questions`: `id`, `survey_id`, `type` (`multiple_choice`, `text`, `rating`, `dropdown`, `checkbox`, `date`, `number`), `label`, `config_json` (options, min/max for rating), `order_index`, `is_required`, `target_field_id` (links to dynamic field in target table).

**Flows:**
- **Creation:** Admin creates a survey, selects or creates a target dynamic table. The system auto-creates corresponding dynamic fields in that table for each question (or maps to existing fields).
- **Builder API:** CRUD for surveys and questions. Reordering questions updates `order_index`.
- **Publishing:** `POST /surveys/:id/publish` generates a public slug. If `access_type = authenticated`, only logged-in users with valid JWT can submit.
- **Public Form:** `GET /public/surveys/:slug` returns survey structure (no auth needed if public). `POST /public/surveys/:slug/submit` validates and inserts a row into the target dynamic table. If authenticated, fills the `cin` column automatically.
- **Distribution:** Optional email sending via nodemailer SMTP. If no SMTP, admin copies the link.
- **Analytics:** `GET /surveys/:id/stats` returns aggregated data from the target dynamic table (counts per option, averages for ratings).

**AI Survey Agent (Groq):**
- `POST /ai/surveys/generate` — Accepts `{ description: string, targetAudience?: string }`. Backend constructs a prompt with available field types and best practices. Groq returns JSON: `{ title, questions: [{ label, type, options?, isRequired }] }`. Backend returns this to frontend for admin review before saving.

### 3.6 Data Visualization Engine (`/api/v1/charts`, `/api/v1/dashboards`)

**Chart Definitions:**
- `charts`: `id`, `name`, `description`, `chart_type` (Ant Design Charts name: `Column`, `Pie`, `Line`, etc.), `sql_query` (TEXT), `data_mapping_config` (JSON: `{ xField: 'col_a', yField: 'col_b', seriesField: 'col_c', ... }`), `config_json` (colors, legends, titles), `created_by`.
- `dashboards`: `id`, `name`, `description`, `layout_config` (JSON: react-grid-layout or custom grid positions), `is_published`, `access_roles` (JSON array), `slug`.
- `dashboard_items`: `id`, `dashboard_id`, `chart_id`, `position_config` (`{ x, y, w, h }`).

**SQL Execution Service:**
- `POST /charts/:id/execute` or `POST /charts/preview` — Executes the stored SQL query against the database.
- **Security:** A SQL parser (e.g., `node-sql-parser`) validates that the query starts with `SELECT`. It blocks `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`, `GRANT`. Super admin can bypass but actions are logged.
- **Safety:** Queries run inside a read-only transaction or with a statement timeout (5 seconds). Result sets are limited to 10,000 rows.
- **Context for AI:** The backend provides an endpoint `GET /ai/schema-context` that exports a sanitized list of dynamic tables and fields (no data) to send to Groq.

**Chart Data Mapping:**
- The SQL query must return rows. The `data_mapping_config` maps column names to Ant Design Charts properties. Example: SQL returns `[{ filiere: 'GI', count: 45 }]`, mapping is `{ xField: 'filiere', yField: 'count' }`, chart type is `Column`.
- `POST /charts/preview` runs the query and returns `{ data: [], mapping: {} }` so the frontend can render instantly.

**Dashboard Builder API:**
- CRUD dashboards. Publishing makes them accessible via `/public/dashboards/:slug` or role-restricted routes.
- Layout config uses a simple grid system (e.g., 12-column) stored as JSON.

**AI Chart Agent (Groq):**
- `POST /ai/charts/generate` — Accepts `{ description: string, tableIds?: string[] }`. Backend sends schema context + user description to Groq. Returns `{ suggestedSql, chartType, dataMapping, title }`. Admin can edit before saving.

### 3.7 Report Generation Engine (`/api/v1/reports`)

**Report Templates:**
- `report_templates`: `id`, `name`, `description`, `prompt_template` (text with placeholders like `{{studentName}}`), `target_table_id` (student data source), `config_json`.

**Generation Flow:**
- `POST /reports/generate` — Accepts `{ templateId, cin?, filters? }`. Backend fetches the student's data from all user-linked dynamic tables, aggregates it into a structured context object (grades, attendance, surveys, insertion data), and constructs a rich prompt for Groq.
- Groq returns a narrative report (markdown or structured JSON sections: summary, strengths, weaknesses, recommendations).
- The generated content is stored in `generated_reports` table.
- `POST /reports/:id/export/pdf` — Converts the generated content + template HTML to PDF using Puppeteer (with `--no-sandbox` for Docker) or `pdfkit`. The frontend can preview the HTML version before export.
- `POST /reports/:id/export/excel` — Exports raw data + report metadata to Excel using `exceljs`.

**AI Report Agent (Groq):**
- The prompt engineering includes strict instructions to base conclusions only on provided data (no hallucination), academic tone, and structured output.

### 3.8 Academic & Insertion Analytics (`/api/v1/analytics`)

Pre-built endpoints that query dynamic tables (assuming standard naming conventions or configured table mappings):

- `GET /analytics/academic/enrollments` — Aggregates by filière, niveau, genre, année universitaire.
- `GET /analytics/academic/success-rates` — Success/failure/graduation/dropout ratios.
- `GET /analytics/academic/teachers` — Teacher counts by specialty and gender evolution.
- `GET /analytics/academic/formations` — Certifiant vs non-certifiant, public cible.
- `GET /analytics/academic/events` — Event participation stats.
- `GET /analytics/insertion/rates` — Taux d'insertion at 6 and 12 months.
- `GET /analytics/insertion/delays` — Délai moyen d'emploi.
- `GET /analytics/insertion/sectors` — Répartition par secteur d'activité.
- `GET /analytics/insertion/contracts` — Types de contrat distribution.

These endpoints are essentially parameterized SQL query builders that run against the dynamic tables. Admins configure which dynamic table corresponds to which entity (students, alumni, etc.) via `system_settings`.

### 3.9 Partnerships Module (`/api/v1/partnerships`)

- `companies`: `id`, `name`, `sector`, `address`, `contact_name`, `contact_email`, `contact_phone`, `partnership_start_date`, `is_active`.
- `offers`: `id`, `company_id`, `type` (`stage`, `emploi`), `title`, `description`, `requirements`, `publish_date`, `expiry_date`, `is_active`.
- `collaborations`: `id`, `company_id`, `type`, `description`, `date`, `academic_year`.

### 3.10 System Administration (`/api/v1/admin/*`)

- **Academic Years:** CRUD, set current year.
- **Backups:** `POST /admin/backups` triggers `pg_dump` via child_process, saves to `uploads/backups/`. `GET /admin/backups` lists files. Download endpoint.
- **Activity Logs:** `GET /admin/activity-logs` with filtering by user, action, date range.
- **Settings:** Key-value store for system parameters (e.g., `current_academic_year`, `default_language`).
- **Publications:** Manage public files in `uploads/public/`.

### 3.11 AI Services Layer (`/api/v1/ai/*`)

Centralized Groq client:
- Uses `GROQ_API_KEY` from env.
- Rate-limited per user (e.g., 50 requests/hour).
- Prompt templates stored as constants for each agent (Survey, Chart, Report).
- All AI endpoints return a `suggestion` object that requires human confirmation before persistence. AI never writes directly to the database.

---

## 4. Web Frontend Architecture & Functional Specification

### 4.1 Foundation & Design System

**Tech Stack:**
- React 19 (Strict Mode)
- Vite (dev server + build)
- TypeScript
- Ant Design 6 (`antd`)
- Ant Design Charts (`@ant-design/charts`)
- React Router v7
- TanStack Query (React Query) for server state
- Zustand for global client state (auth, theme, sidebar)
- Axios with interceptors

**Theming:**
- `ConfigProvider` at app root with custom `theme` tokens (primary color matching ISET Tozeur branding, border radius, typography).
- Dark/light mode toggle stored in Zustand and persisted to `localStorage`.
- All components use Ant Design tokens; no hardcoded colors.

**Layouts:**
- `PublicLayout` — Landing page, public dashboards, public survey forms, login. No sidebar.
- `AdminLayout` — Collapsible Ant Design `Sider` + `Layout`. Header with breadcrumbs, user avatar, notifications, theme toggle. Sidebar menu is role-aware (filtered by `user.role`).
- `StudentLayout` / `TeacherLayout` / `AlumniLayout` — Simplified sidebar with role-specific menus.

**Routing Guards:**
- `AuthGuard` — Redirects to `/login` if no JWT.
- `RoleGuard` — Renders `<Result status="403" />` if role not in allowed list.
- `PublicGuard` — For published dashboards/surveys, no auth required.

### 4.2 Public Pages

**Landing Page (`/`):**
- Hero section with ISET Tozeur branding and observatory mission.
- Feature cards: Academic Analytics, Alumni Tracking, Surveys, Partnerships.
- Preview of public dashboards (if any are published).
- Login button.
- Footer with contact info.

**Login (`/login`):**
- Form: Identifier (CIN or Super Admin username) + Password.
- "Forgot password?" link (triggers admin reset or email if configured).
- Ant Design form with validation rules.

### 4.3 Admin Portal Modules

**Admin Dashboard (`/admin/dashboard`):**
- Stat cards: Total students, total alumni, active surveys, published dashboards.
- Recent activity feed (from activity logs API).
- Quick action buttons: Add User, New Survey, Import Data.

**User Management (`/admin/users`):**
- Ant Design `Table` with pagination, filtering by role, search by CIN/name.
- "Add User" modal with form (CIN, names, email, role, phone). Password auto-generated.
- "Import Users" button → opens Import Wizard.
- Bulk actions: Activate/Deactivate, Reset Password, Delete.
- Detail drawer showing user's linked records across dynamic tables.

**Visual Database Manager (`/admin/database`):**
- **Table List View:** Card grid showing all dynamic tables. Super admin sees core tables in a separate read-only section.
- **Table Creator Wizard:** Stepper: (1) Name & Description, (2) Add Fields (select type, configure options/validation), (3) Review & Create.
- **Relationship Editor:** Visual canvas (using a simple React flow library or custom SVG) showing tables as nodes. Admin draws lines between fields to create relationships. Saves via `/schema/relationships`.
- **Data Browser:** For selected table, a full-featured `ProTable` (or Ant Design Table with tools) with CRUD operations, column filtering, sorting, export to CSV/Excel.
- **User Linking Panel:** Toggle `is_user_linked` on table. If enabled, show which field is the CIN link.

**Data Import Wizard (`/admin/import`):**
- Step 1: Drag-and-drop upload (CSV, Excel, JSON).
- Step 2: Preview raw data (first 10 rows).
- Step 3: Column Mapping — dropdown per source column to target dynamic field. Option to create new table from this import.
- Step 4: Validation preview — green/red indicators per row.
- Step 5: Execute import with progress bar. Show success/error summary.

**Survey Builder (`/admin/surveys` & `/admin/surveys/:id/builder`):**
- Survey list with status badges.
- Builder interface:
  - Left panel: AI Assistant chat (Groq). Admin types intent, AI returns suggested survey JSON. Admin clicks "Apply" to populate builder.
  - Center: Question list. Each question card shows type, label, options. Drag-handle for reordering.
  - Right panel: Configuration for selected question (label, type, options, required, mapping to target field).
  - Top bar: Survey title, description, target table selector, publish toggle.
- Publishing modal: Choose access type (public/authenticated), copy link, send email (if configured).
- Responses tab: Data table showing submissions directly from the target dynamic table.

**Visualization Editor (`/admin/visualizations/charts` & `/admin/visualizations/charts/:id/edit`):**
- Chart gallery: Grid of Ant Design Charts thumbnails (Column, Bar, Line, Pie, Area, Radar, etc.). Clicking one creates a new chart of that type.
- Editor layout:
  - Left: AI Assistant chat. Admin describes desired insight. AI returns `{ sql, chartType, mapping }`.
  - Center-Top: SQL Query Editor (monaco-editor or textarea with SQL highlighting).
  - Center-Bottom: Live Preview. Runs `POST /charts/preview` on button click or auto-debounce. Renders the actual Ant Design Chart.
  - Right: Data Mapping panel. Dropdowns mapping SQL result columns to chart properties (xField, yField, seriesField, colorField, etc.). Dynamic based on chart type.
  - Bottom: Config panel (title, colors, legend position, axis labels).
- Save button stores chart definition.

**Dashboard Builder (`/admin/visualizations/dashboards` & `/admin/visualizations/dashboards/:id/edit`):**
- Grid canvas (12-column responsive grid).
- Sidebar with saved charts. Drag chart onto canvas.
- Resize/move cards on grid.
- Global filters: Configure dashboard-level filters (e.g., academic year, filière) that inject into chart SQL queries as parameters.
- Publishing controls: `is_published`, `access_roles`, `slug`.

**Report Center (`/admin/reports`):**
- Template list.
- "New Report" flow:
  - Select template.
  - Select target student(s) (by CIN or filters).
  - Click "Generate with AI". Shows loading state.
  - Preview generated report in a rich text preview (rendered markdown/HTML).
  - Edit inline if needed.
  - Export: PDF or Excel.
- Batch generation: Select multiple students, generate reports in background, download ZIP.

**Academic Analytics (`/admin/analytics/academic`):**
- Pre-built dashboard with cards and charts:
  - Effectifs par filière (Bar chart)
  - Taux de réussite/échec/abandon/diplomation (Pie or Gauge charts)
  - Évolution étudiants par spécialité/genre (Line chart, grouped)
  - Évolution enseignants (Line chart)
  - Formations stats (Stacked bar)
  - Événements stats (Table + Bar)
- Filters: Academic year range, filière, niveau, genre.
- Export each widget to PNG/PDF/Excel.

**Insertion Analytics (`/admin/analytics/insertion`):**
- Taux d'insertion 6/12 mois (Gauge or Bar)
- Délai moyen d'emploi (Statistic card + Histogram)
- Secteurs d'activité (Pie or Treemap)
- Type de contrat (Donut)
- Filters: Promotion, filière, year.

**Partnerships (`/admin/partnerships`):**
- Companies table with search.
- Company detail drawer: info + offers list + collaboration history.
- Offer management form.
- Collaboration timeline.

**System Settings (`/admin/settings`):**
- Academic year CRUD.
- Backup panel: Trigger backup, download files.
- Activity log viewer: Ant Design Table with filters.
- Theme customization: Primary color picker (updates ConfigProvider).
- Public file manager: Upload/manage files for public download space.

### 4.4 Role-Specific Portals

**Student Portal (`/student/*`):**
- Dashboard: Personal academic summary (pulled from user-linked dynamic tables).
- Surveys: List of available surveys to complete.
- Profile: View/edit personal info (controlled by admin permissions).
- Documents: Download public files.

**Teacher Portal (`/teacher/*`):**
- Dashboard: Class/group statistics (if linked).
- Consultation: Read-only access to academic dashboards filtered to their classes.

**Alumni Portal (`/alumni/*`):**
- Profile: Professional situation, company, hire date.
- Surveys: Insertion professionnelle surveys.
- Dashboards: Public insertion stats.

**Responsable Observatoire Portal (`/observatoire/*`):**
- Full access to analytics and reports.
- Survey and chart creation (but not user management or database schema changes — unless also Admin).

### 4.5 Shared Components

- `DataTable`: Generic CRUD table for any dynamic table. Used in Database Manager, Survey Responses, etc.
- `SqlEditor`: Textarea with SQL syntax highlighting and basic validation.
- `AiAssistantPanel`: Collapsible chat panel used in Survey Builder, Chart Editor, and Report Center. Connects to respective `/ai/*` endpoints. Shows streaming or batched responses.
- `ImportWizard`: The 5-step import flow.
- `ChartRenderer`: Wrapper around Ant Design Charts that accepts `type`, `data`, `mapping`, and `config`.
- `PublicDashboardViewer`: Renders a published dashboard in read-only mode. Used at `/public/dashboards/:slug`.

---

## 5. AI Integration Details (Groq)

All AI features share a common service but use different prompt templates.

**Survey AI Agent:**
- **System Prompt:** "You are an expert academic survey designer. Generate structured survey questions in JSON format. Use only these question types: multiple_choice, text, rating, dropdown, checkbox, date, number. Ensure questions are unbiased and logically ordered."
- **User Input:** Natural language goal + target audience.
- **Output Format:** JSON with `title`, `description`, `questions[]`.
- **Frontend:** Chat UI in survey builder. Admin reviews and clicks "Apply to Builder".

**Chart AI Agent:**
- **System Prompt:** "You are a data visualization expert. Given a database schema and a user request, write a safe PostgreSQL SELECT query and recommend the best Ant Design Charts type. Return JSON with `sql`, `chartType`, `dataMapping`, `title`, `description`. Use only SELECT statements. Do not use DELETE, DROP, INSERT, UPDATE."
- **Context:** Schema context includes dynamic table names, field names, and types. No actual data is sent.
- **Frontend:** Chat UI in visualization editor. Admin clicks "Apply to Editor" which fills SQL, mapping, and chart type.

**Report AI Agent:**
- **System Prompt:** "You are an academic advisor writing student performance reports. Based strictly on the provided student data, write a professional report with sections: Summary, Academic Performance, Strengths, Areas for Improvement, Recommendations. Do not invent data. Use formal academic tone. Respond in structured JSON with `sections: [{ title, content }]`. If data is in French, respond in French."
- **Context:** Aggregated student data JSON from user-linked tables (grades, attendance, survey responses, insertion data).
- **Frontend:** Report center. Admin selects student, clicks generate, reviews structured output in preview pane.

---

## 6. Security & Performance Specification

**Security:**
- All passwords hashed with bcrypt (cost factor 12).
- JWTs signed with `HS256`, expiry 24h (refresh token strategy optional but not required for PFE).
- SQL injection: 100% parameterized queries. Dynamic identifiers (table/column names) are whitelisted against metadata tables before interpolation.
- XSS: Helmet CSP headers; all user-generated content rendered via React (escaped by default).
- File uploads: Stored outside web root; served via API with auth checks.
- SQL Editor: Strict `SELECT` validation. Read-only DB user for chart execution (optional advanced setup).

**Performance:**
- Database indexes on `users.cin`, `users.role`, `dynamic_tables.name`, `dynamic_fields.table_id`, `surveys.published_slug`, `charts.id`.
- Paginated API responses (default 20, max 100).
- React Query caching with stale-while-revalidate.
- Vite code-splitting by route (`React.lazy`).
- Chart data limited to 10k rows server-side.
- Image/file serving via nginx in production.

---

## 7. Development Phases

These are outcome-based phases. You finish one completely before starting the next.

### Phase 1: Foundation & DevOps
Initialize repository structure, Docker Compose, core dependencies, database connection, migration runner, error handling, logging, and environment configuration. Seed super admin from `.env`. Create basic health check endpoint. Setup Ant Design theming in frontend with routing skeleton.

### Phase 2: Identity, Access Control & User Management
Build authentication API (login, JWT, no signup), RBAC middleware, user CRUD API, bulk user import. Frontend: Login page, AdminLayout, User Management UI with table, modals, and import wizard.

### Phase 3: Dynamic Schema Engine & Visual Database Manager
Build dynamic table/field/relationship metadata APIs with DDL execution. Build visual database manager frontend: table creator, field configurator, relationship editor, data browser grid. Implement user-linking logic.

### Phase 4: Data Ingestion, Mapping & User Record Linking
Build file upload, CSV/Excel/JSON parsing, column mapping preview, and bulk insert into dynamic tables. Frontend: 5-step Import Wizard. Connect imported records to users via CIN linking.

### Phase 5: AI-Assisted Survey Engine
Build survey metadata API, question builder, target table association, public/authenticated response endpoints. Integrate Groq for AI survey generation. Frontend: Survey builder with AI chat panel, question designer, publish controls, and response data viewer.

### Phase 6: AI-Assisted Data Visualization & Dashboard Builder
Build chart definition storage, safe SQL execution engine, data mapping logic. Integrate Groq for AI chart generation. Frontend: Chart gallery, SQL editor, live preview with Ant Design Charts, data mapping panel, AI chat panel. Build dashboard grid builder with publishing.

### Phase 7: Academic & Career Insertion Analytics
Build pre-built analytics APIs (academic indicators + insertion indicators). Configure system settings to map dynamic tables to standard entities. Frontend: Academic analytics dashboard and Insertion analytics dashboard with filters and exports.

### Phase 8: AI-Assisted Report Generation & Export System
Build report template storage, AI report generation via Groq with student data context, PDF/Excel export. Frontend: Report center with template selector, student picker, AI generation flow, preview editor, and export buttons.

### Phase 9: Multi-Role Web Frontend, Landing Page & Public Portal
Build landing page. Build role-specific layouts and routes (Student, Teacher, Alumni, Responsable Observatoire). Implement public dashboard viewer and public survey forms. Polish navigation, breadcrumbs, and responsive behavior.

### Phase 10: Partnerships, Publications & System Administration
Build partnerships API (companies, offers, collaborations). Frontend: Company management, offer board. Build settings UI (academic years, backups, activity logs, public file manager, theme customization).

### Phase 11: Quality Assurance, Security Hardening & Production Deployment
End-to-end API testing, frontend critical path testing, SQL injection and XSS audit, rate limiting verification, performance optimization (query indexing, React lazy loading), final Docker Compose polish, documentation completion, and production deployment readiness.
