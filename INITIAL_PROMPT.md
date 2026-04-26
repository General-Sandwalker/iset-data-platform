You are a senior technical project manager initializing the GitHub project structure for the ISET Tozeur Digital Observatory. 

Your task is to use ONLY the `gh` CLI tool to create milestones and issues. Do NOT write any application code, Dockerfiles, configuration files, or documentation files. Do NOT create branches or pull requests. Only execute `gh` commands to set up the project management structure.

Repository context:
- This is a monorepo with folders: backend/, web-frontend/, mobile-frontend/, docs/
- Backend: Node.js + Express + TypeScript + PostgreSQL 17
- Frontend: React 19 + Vite + Ant Design 6 + Ant Design Charts
- AI features use Groq API
- Deployment: Docker Compose (postgres:17-alpine, backend, web-frontend)
- No Redis. No signup. CIN-based login. Super admin seeded from .env.

Execute the following steps in exact order. For each phase, first create the milestone, then create all its issues under that milestone using the exact milestone title.

Phase 1: Foundation & DevOps
Milestone description: Initialize repository structure, Docker Compose, core backend/frontend scaffolding, database connection, migration runner, error handling, logging, environment config, Ant Design theming, and super admin seeding.
Issues:
1. "Initialize monorepo structure and Docker Compose" — Create backend/, web-frontend/, mobile-frontend/, docs/ folders. Setup docker-compose.yml with postgres:17-alpine, backend, and web-frontend services with networking and volumes. Add .env.example.
2. "Setup Node.js backend scaffolding" — Express + TypeScript project structure. Install pg, bcrypt, jsonwebtoken, zod, multer, helmet, express-rate-limit, csv-parser, xlsx, exceljs, pdfkit/puppeteer, node-sql-parser. Setup folder structure: config, core, schema-engine, data-ingestion, survey-engine, viz-engine, report-engine, analytics, partnerships, ai-services, middleware, utils.
3. "Setup React 19 frontend scaffolding" — Vite + React 19 + TypeScript. Install antd, @ant-design/charts, react-router-dom, @tanstack/react-query, zustand, axios. Setup folder structure: app, core, admin, survey-builder, viz-builder, report-center, analytics, portals, public-pages, design-system. Configure Ant Design ConfigProvider with custom theme tokens and dark/light toggle.
4. "Setup PostgreSQL connection and migration runner" — Create core tables migration system. Implement ordered SQL migration runner executed on backend boot. Setup pg connection pool with environment config.
5. "Implement global middleware and error handling" — Helmet, CORS, rate limiting, JWT verification, RBAC, activity logging middleware, centralized async error handler, Zod validation wrapper, consistent API response envelope.
6. "Seed super admin from environment" — On boot, check if super admin exists. If not, read SUPER_ADMIN_USERNAME and SUPER_ADMIN_PASSWORD from .env, hash password, insert into users table with role super_admin and null cin.

Phase 2: Identity, Access Control & User Management
Milestone description: Build complete authentication system with CIN-based login, no signup, JWT sessions, role-based access, user CRUD, bulk import, and frontend login/admin user management UI.
Issues:
1. "Implement authentication API" — POST /auth/login with CIN or super admin username. JWT generation and verification. POST /auth/me. Password reset by admin and optional email token.
2. "Implement user management API" — CRUD users (POST, GET list with filters/pagination, GET by id, PATCH, DELETE). Bulk import from CSV/Excel. Enforce unique CIN. Prevent deletion of super admin.
3. "Build login page and auth context" — Frontend login form with Ant Design. Zustand auth store. Axios interceptor for JWT. Role-based route guards (AuthGuard, RoleGuard). Logout handling.
4. "Build admin user management UI" — AdminLayout with sidebar. User list page with Ant Design Table, search, role filters. Add/Edit user modal. Bulk import button with file upload. Password reset action.
5. "Implement user import wizard frontend" — Drag-and-drop CSV/Excel upload. Column preview. Mapping interface. Progress tracking. Error display.

Phase 3: Dynamic Schema Engine & Visual Database Manager
Milestone description: Build the low-code database engine allowing admins to create tables, fields, relationships via visual editor, with user-linking capabilities and generic data browsing.
Issues:
1. "Implement dynamic table metadata API" — CRUD for dynamic_tables and dynamic_fields. Support field types: text, number, decimal, date, datetime, boolean, select, multiselect, email, phone, file, user_link. Execute safe DDL (CREATE TABLE, ALTER TABLE, ADD COLUMN, DROP COLUMN) with sanitized identifiers.
2. "Implement dynamic relationships API" — POST/PATCH/DELETE relationships between tables. Support one_to_many and many_to_one. Handle user_link special relationship to users.cin.
3. "Implement generic dynamic data API" — GET /schema/tables/:id/data with pagination, filtering, sorting. POST/PATCH/DELETE single records with field validation against metadata.
4. "Build visual database manager UI" — Table list view. Table creator wizard (stepper). Field configuration panel with type-specific options. Visual relationship editor (canvas with tables and connection lines). Data browser grid with inline editing for any dynamic table.
5. "Implement user linking in visual editor" — Toggle is_user_linked on table. Configure user_link field type. Display linked user info in data browser.

Phase 4: Data Ingestion, Mapping & User Record Linking
Milestone description: Enable CSV/Excel/JSON import with column mapping, data preview, validation, and storage into dynamic tables with optional CIN-based user linking.
Issues:
1. "Implement file upload and parsing backend" — Multer upload endpoint. Detect file type. Parse CSV (csv-parser), Excel (xlsx stream), JSON. Return columns and sample rows.
2. "Implement import mapping and validation API" — POST /import/preview with column-to-field mappings. Type coercion and validation rules per dynamic field. Return preview with error indicators per row.
3. "Implement import execution API" — Batch insert valid rows into target dynamic table. Track import history (status, row count, errors). Handle user linking via CIN column mapping.
4. "Build data import wizard frontend" — 5-step wizard: Upload, Preview Raw, Column Mapping, Validation Preview, Execute. Show progress and final summary with download error log.
5. "Implement AI-assisted table creation from import" — Endpoint that sends file schema to Groq to suggest dynamic table structure. Frontend button in import wizard: "Auto-generate table with AI".

Phase 5: AI-Assisted Survey Engine
Milestone description: Build dynamic survey creation, AI-generated surveys, publishing, public/authenticated response collection, and direct storage into associated dynamic tables.
Issues:
1. "Implement survey metadata and question API" — CRUD surveys and survey_questions. Support types: multiple_choice, text, rating, dropdown, checkbox, date, number. Reordering with order_index. Link survey to target dynamic table.
2. "Implement survey publishing and response API" — Publish endpoint generating UUID slug. Public GET /public/surveys/:slug returning structure. Public POST submit validating and inserting into target dynamic table. Authenticated mode auto-fills cin.
3. "Integrate Groq AI survey generation" — POST /ai/surveys/generate. Prompt engineering for structured JSON survey output. Frontend chat panel in survey builder.
4. "Build survey builder frontend" — Visual question list with add/edit/delete/reorder. Question config sidebar. Target table selector. AI assistant panel. Publish modal with link copying.
5. "Build survey response viewer" — Data table displaying submissions from the target dynamic table. Basic statistics: response count, averages for ratings, option distributions.

Phase 6: AI-Assisted Data Visualization & Dashboard Builder
Milestone description: Build chart editor with Ant Design Charts gallery, SQL query execution, data mapping, AI-assisted chart generation, and dashboard layout builder with publishing.
Issues:
1. "Implement chart definition and SQL execution API" — CRUD charts (name, type, sql_query, data_mapping_config, config_json). Safe SQL execution service using node-sql-parser to validate SELECT-only. Read-only transaction with timeout. Limit 10k rows.
2. "Implement dashboard API" — CRUD dashboards with layout_config. Dashboard items linking charts. Publishing controls (is_published, access_roles, slug).
3. "Integrate Groq AI chart generation" — POST /ai/charts/generate. Send schema context + user description. Return suggested SQL, chartType, dataMapping. Frontend chat panel in visualization editor.
4. "Build chart editor frontend" — Chart type gallery (all Ant Design Charts types). SQL editor with syntax highlight. Data mapping panel (dropdowns for xField, yField, etc. based on chart type). Live preview rendering actual chart. Save and list charts.
5. "Build dashboard builder frontend" — Grid canvas (12-column). Drag charts from sidebar onto canvas. Resize/move. Global filter configuration. Publish controls. Public dashboard preview.

Phase 7: Academic & Career Insertion Analytics
Milestone description: Implement pre-built analytics endpoints and dashboards for academic indicators and professional insertion metrics as required by the observatory.
Issues:
1. "Implement academic indicators API" — Endpoints for: enrollments by filiere, success/failure/dropout/graduation rates, student evolution by specialty/gender, teacher evolution by specialty/gender, training statistics (certifiant/non-certifiant), event statistics. Configurable table mappings via system_settings.
2. "Implement insertion indicators API" — Endpoints for: insertion rate at 6/12 months, average employment delay, activity sectors distribution, contract type distribution. Query alumni/user-linked dynamic tables.
3. "Build academic analytics dashboard frontend" — Cards with key metrics. Bar charts for enrollments. Line charts for evolution. Pie charts for rates. Filters: academic year, filiere, niveau, genre. Export widgets.
4. "Build insertion analytics dashboard frontend" — Gauge for insertion rates. Histogram for employment delay. Treemap/Pie for sectors. Donut for contract types. Filters: promotion, filiere, year range.

Phase 8: AI-Assisted Report Generation & Export System
Milestone description: Build report templates, AI-powered narrative generation using student data context, and export to PDF/Excel.
Issues:
1. "Implement report template API" — CRUD report_templates with prompt_template and target_table configuration.
2. "Implement AI report generation service" — POST /reports/generate. Aggregate student data from user-linked tables into structured context. Send to Groq with strict system prompt. Store generated report content.
3. "Implement PDF and Excel export API" — Convert generated report content to PDF using Puppeteer with HTML template. Excel export using exceljs with raw data + report metadata.
4. "Build report center frontend" — Template list. New report flow: select template, select student(s) by CIN or filters, generate with AI (show loading), preview structured sections in rich text editor, edit if needed, export to PDF or Excel.
5. "Implement batch report generation" — Select multiple students. Generate reports sequentially. Provide ZIP download of all PDFs.

Phase 9: Multi-Role Web Frontend, Landing Page & Public Portal
Milestone description: Build landing page, role-specific portals (Student, Teacher, Alumni, Responsable), public dashboard viewer, and public survey forms.
Issues:
1. "Build landing page" — Hero section, feature cards, public dashboard previews, login button, ISET Tozeur branding, footer. Responsive design.
2. "Build student portal" — StudentLayout with sidebar. Personal dashboard from user-linked data. Available surveys list. Profile view/edit. Public documents download.
3. "Build teacher and alumni portals" — TeacherLayout: class statistics, read-only academic dashboards filtered by assigned groups. AlumniLayout: professional profile, insertion surveys, public stats.
4. "Build responsable observatoire portal" — Full analytics access, survey and chart creation (if not admin), report generation. Dedicated dashboard layout.
5. "Build public dashboard and survey pages" — PublicLayout routes: /public/dashboards/:slug rendering read-only dashboards. /public/surveys/:token rendering survey forms. No auth required unless survey is authenticated.

Phase 10: Partnerships, Publications & System Administration
Milestone description: Build company partnership management, job/internship offers, collaboration history, system settings, backups, activity logs, and public file manager.
Issues:
1. "Implement partnerships API" — CRUD companies, offers (stage/emploi), collaborations. Filtering and search.
2. "Build partnerships frontend" — Company table, detail drawer with offers and history timeline. Offer creation form.
3. "Implement system settings and academic years API" — CRUD academic_years, set current year. Key-value settings store.
4. "Implement backup and activity log API" — Trigger pg_dump via child_process. List/download backups. GET activity logs with filters.
5. "Build system administration frontend" — Settings page with academic year manager. Backup panel with trigger and download. Activity log viewer with filters. Theme customization. Public file manager for downloads.

Phase 11: Quality Assurance, Security Hardening & Production Deployment
Milestone description: Final testing, security audit, performance optimization, Docker Compose production polish, and documentation.
Issues:
1. "Perform API endpoint testing" — Test all backend endpoints for correct status codes, validation, auth, and RBAC. Fix any broken flows.
2. "Perform frontend critical path testing" — Test login, user creation, dynamic table CRUD, import, survey creation, chart creation, dashboard publishing, report generation across different roles.
3. "Conduct security audit" — Verify all SQL is parameterized. Verify SQL editor blocks non-SELECT. Verify XSS protection. Verify file upload restrictions. Verify JWT expiry and secret handling.
4. "Performance optimization" — Add database indexes. Verify API pagination. Implement React lazy loading and code splitting. Optimize chart data payload size.
5. "Finalize Docker Compose and deployment" — Multi-stage frontend Dockerfile with nginx. Backend Dockerfile optimization. Volume persistence for uploads and postgres. Health checks. Final .env documentation.
6. "Complete project documentation" — API contract docs. User manual. Architecture decision records in docs/. Deployment guide.

Rules for execution:
- Create each milestone first: gh milestone create --title "Phase X: Title" --description "..."
- Then create issues under each milestone: gh issue create --title "..." --body "..." --milestone "Phase X: Title" --label "backend" or "frontend" or "database" or "devops" or "ai" or "documentation"
- Use appropriate labels for each issue.
- Do not write any code files.
- Confirm after each milestone and its issues are created.