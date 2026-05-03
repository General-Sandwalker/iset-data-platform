# ISET Tozeur Digital Observatory — API Documentation

## Base URL

```
http://localhost:4000/api/v1
```

## Authentication

Most endpoints require authentication via JWT Bearer token:

```
Authorization: Bearer <token>
```

## Response Format

All API responses follow this envelope:

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": { "page": 1, "limit": 20, "total": 100 }
}
```

On error:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": { ... }
  }
}
```

## Pagination

All list endpoints support pagination with consistent query parameters:

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `page` | integer | 1 | — | Page number |
| `limit` | integer | 20 | 100 | Items per page |

Paginated responses include a `meta` object:

```json
{ "page": 1, "limit": 20, "total": 150 }
```

## Roles

| Role | Value | Level |
|------|-------|-------|
| Super Admin | `super_admin` | 1 (highest) |
| Admin | `admin` | 2 |
| Responsable Observatoire | `responsable_observatoire` | 3 |
| Enseignant (Teacher) | `enseignant` | 4 |
| Etudiant (Student) | `etudiant` | 5 |
| Alumni | `alumni` | 6 (lowest) |

---

## 1. Authentication

### POST `/auth/login`

Authenticate user and receive JWT token. Rate-limited (10 requests / 15 min).

**Auth:** Public

**Request Body:**
```json
{
  "identifier": "CIN_NUMBER or USERNAME",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 86400,
    "user": {
      "id": "uuid",
      "cin": "12345678",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "admin",
      "isActive": true
    }
  }
}
```

**Errors:** `INVALID_CREDENTIALS` (401), `ACCOUNT_DISABLED` (401)

---

### GET `/auth/me`

Get current authenticated user profile.

**Auth:** Authenticated

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "cin": "12345678",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "admin",
    "phone": "+216 XX XXX XXX",
    "isActive": true,
    "mustChangePassword": false,
    "createdAt": "2026-04-26T00:00:00.000Z",
    "lastLogin": "2026-04-27T00:00:00.000Z"
  }
}
```

---

### POST `/auth/change-password`

Change current user's password. Rate-limited (10 requests / 15 min).

**Auth:** Authenticated

**Request Body:**
```json
{
  "currentPassword": "oldpass123",
  "newPassword": "newpass123456"
}
```

**Response (200):**
```json
{ "success": true, "data": { "message": "Password changed successfully" } }
```

**Errors:** `INVALID_PASSWORD` (400), `VALIDATION_ERROR` (400)

---

### PATCH `/auth/me`

Update current user's profile.

**Auth:** Authenticated

**Request Body (all optional):**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "new@example.com"
}
```

---

### POST `/admin/users/:id/reset-password`

Reset a user's password. Returns a temporary password.

**Auth:** Admin

**Response (200):**
```json
{ "success": true, "data": { "tempPassword": "xK9#mP2$", "message": "Password reset successfully" } }
```

---

## 2. Users

All user CRUD endpoints require admin role.

### POST `/users`

Create a new user.

**Auth:** Admin

**Request Body:**
```json
{
  "cin": "12345678",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "etudiant",
  "phone": "+216 XX XXX XXX"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "cin": "12345678",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "etudiant",
    "isActive": true,
    "mustChangePassword": true,
    "tempPassword": "xK9#mP2$"
  }
}
```

**Errors:** `CIN_EXISTS` (400), `EMAIL_EXISTS` (400), `VALIDATION_ERROR` (400)

---

### GET `/users`

List users with pagination and filtering.

**Auth:** Admin

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20, max: 100) |
| role | string | Filter by role |
| search | string | Search by CIN or name |

**Response (200):**
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "cin": "12345678", "email": "...", "firstName": "...", "lastName": "...", "role": "admin", "isActive": true, "createdAt": "..." }
  ],
  "meta": { "page": 1, "limit": 20, "total": 50 }
}
```

---

### GET `/users/:id`

Get user by ID.

**Auth:** Admin

---

### PATCH `/users/:id`

Update user details.

**Auth:** Admin

**Request Body (all optional):**
```json
{
  "email": "new@example.com",
  "firstName": "New",
  "lastName": "Name",
  "role": "enseignant",
  "phone": "+216 XX XXX XXX",
  "isActive": false
}
```

---

### DELETE `/users/:id`

Delete a user. Cannot delete super admin.

**Auth:** Admin

**Errors:** `CANNOT_DELETE_SUPER_ADMIN` (403)

---

### POST `/users/import`

Bulk import users from an array.

**Auth:** Admin

**Request Body:**
```json
{
  "users": [
    { "cin": "11111111", "email": "a@b.com", "firstName": "A", "lastName": "B", "role": "etudiant" }
  ]
}
```

---

## 3. Schema Engine

### GET `/schema/tables`

List all dynamic tables.

**Auth:** Authenticated

**Query:** `page`, `limit`

---

### POST `/schema/tables`

Create a new dynamic table.

**Auth:** Admin

**Request Body:**
```json
{
  "name": "students",
  "displayName": "Students",
  "description": "Student records",
  "isUserLinked": true
}
```

**Notes:** Physical table created as `dt_students`. Name must match `^[a-z0-9_]+$`. Setting `isUserLinked: true` adds a `cin` column.

---

### GET `/schema/tables/:id`

Get table details.

**Auth:** Authenticated

---

### PATCH `/schema/tables/:id`

Update table metadata.

**Auth:** Admin

**Request Body (all optional):**
```json
{
  "displayName": "Student Records",
  "description": "Updated description",
  "isUserLinked": true
}
```

---

### DELETE `/schema/tables/:id`

Delete a table and all its data.

**Auth:** Super Admin only

---

### GET `/schema/tables/:id/fields`

List all fields for a table.

**Auth:** Authenticated

**Response (200):**
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "tableId": "table-uuid", "name": "first_name", "displayName": "First Name", "fieldType": "text", "configJson": {}, "isRequired": true, "orderIndex": 0 }
  ]
}
```

---

### POST `/schema/tables/:id/fields`

Add a new field to a table.

**Auth:** Admin

**Request Body:**
```json
{
  "name": "email",
  "displayName": "Email Address",
  "fieldType": "email",
  "isRequired": true,
  "orderIndex": 2,
  "configJson": {}
}
```

**Field Types:**

| Type | PostgreSQL Type | Config Options |
|------|----------------|----------------|
| `text` | VARCHAR(500) | — |
| `number` | INTEGER | — |
| `decimal` | DECIMAL(15,2) | — |
| `date` | DATE | — |
| `datetime` | TIMESTAMPTZ | — |
| `boolean` | BOOLEAN | — |
| `select` | VARCHAR(255) | `{ "options": ["A", "B", "C"] }` |
| `multiselect` | VARCHAR(255) | `{ "options": ["A", "B", "C"] }` |
| `email` | VARCHAR(500) | — |
| `phone` | VARCHAR(500) | — |
| `file` | VARCHAR(500) | — |
| `user_link` | VARCHAR(20) | FK to `users(cin)` |

---

### PATCH `/schema/tables/fields/:id`

Update a field (display name, required, config, order — not type).

**Auth:** Admin

---

### DELETE `/schema/tables/fields/:id`

Delete a field from a table.

**Auth:** Admin

---

### GET `/schema/relationships`

List all relationships.

**Auth:** Authenticated

**Query:** `tableId` (optional — filter by source or target table), `page`, `limit`

**Relationship Types:** `one_to_many`, `many_to_one`

---

### POST `/schema/relationships`

Create a relationship.

**Auth:** Admin

**Request Body:**
```json
{
  "sourceTableId": "grades-table-uuid",
  "sourceFieldId": "student-cin-field-uuid",
  "targetTableId": "students-table-uuid",
  "targetFieldId": null,
  "relationshipType": "many_to_one"
}
```

---

### PATCH `/schema/relationships/:id`

Update a relationship.

**Auth:** Admin

---

### DELETE `/schema/relationships/:id`

Delete a relationship.

**Auth:** Admin

---

### GET `/schema/tables/:id/data`

Get paginated data from a dynamic table.

**Auth:** Authenticated

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20, max: 100) |
| sortBy | string | Column name to sort by |
| sortOrder | asc/desc | Sort direction (default: desc) |
| search | string | Text search across text fields |
| filters | JSON string | Filter expressions |

**Filter Format:**
```json
{
  "fieldName": { "op": "eq", "value": "something" },
  "age": { "op": "gt", "value": 18 },
  "name": { "op": "like", "value": "John" }
}
```

**Operators:** `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `like`, `in`

**Response (200):**
```json
{
  "success": true,
  "data": [ { "id": "record-uuid", "cin": "12345678", "first_name": "John", "created_at": "..." } ],
  "meta": { "page": 1, "limit": 20, "total": 150 }
}
```

---

### POST `/schema/tables/:id/data`

Insert a new record.

**Auth:** Authenticated

**Request Body:** Dynamic key-value pairs matching the table's field names.

---

### PATCH `/schema/tables/:id/data/:recordId`

Update an existing record.

**Auth:** Authenticated

---

### DELETE `/schema/tables/:id/data/:recordId`

Delete a record.

**Auth:** Authenticated

---

### GET `/schema/my-records`

Get all records linked to the current user's CIN across all user-linked tables.

**Auth:** Authenticated (requires CIN)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "cin": "12345678",
    "tablesCount": 2,
    "records": {
      "dt_grades": [ { "id": "uuid", "course": "Mathematics", "grade": 15 } ],
      "dt_attendance": [ { "id": "uuid", "date": "2026-04-25", "present": true } ]
    }
  }
}
```

**Errors:** `NO_CIN` (400)

---

## 4. Data Ingestion

All import endpoints require admin role.

### POST `/import/upload`

Upload a file for import. Parses CSV, Excel, or JSON.

**Auth:** Admin

**Content-Type:** `multipart/form-data`

**Form Data:** `file` — CSV, Excel (.xlsx/.xls), or JSON (max 50MB)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "filename": "students.csv",
    "fileType": "csv",
    "fileSize": 10240,
    "columns": ["first_name", "last_name", "email", "cin"],
    "sampleRows": [ { "first_name": "John", "last_name": "Doe" } ],
    "totalRows": 150
  }
}
```

---

### POST `/import/preview`

Preview mapped data with validation before importing.

**Auth:** Admin

**Request Body:**
```json
{
  "fileId": "uuid",
  "tableId": "uuid",
  "mappings": [
    { "sourceColumn": "First Name", "targetField": "first_name", "transform": "trim" },
    { "sourceColumn": "Email", "targetField": "email", "transform": "lowercase" }
  ]
}
```

**Transform Options:** `uppercase`, `lowercase`, `trim`, `date_iso`, `date_fr`, `number`, `boolean`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "validRows": [ { "first_name": "John" } ],
    "invalidRows": [ { "row": 5, "data": {}, "errors": ["Row 5: first_name is required"] } ],
    "stats": { "totalRows": 150, "validCount": 140, "invalidCount": 10 }
  }
}
```

---

### POST `/import/preview-new-table`

Preview import for a new table (no tableId needed).

**Auth:** Admin

---

### POST `/import/execute`

Execute the import.

**Auth:** Admin

**Request Body:**
```json
{
  "fileId": "uuid",
  "tableId": "uuid",
  "mappings": [ { "sourceColumn": "First Name", "targetField": "first_name" } ],
  "skipDuplicates": false
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalRows": 150,
    "importedRows": 140,
    "errorCount": 10,
    "errors": [ { "row": 5, "error": "Row 5: email is required" } ]
  }
}
```

---

### POST `/import/create-table-and-import`

Create a new dynamic table and import data in one step.

**Auth:** Admin

**Request Body:**
```json
{
  "fileId": "uuid",
  "tableName": "students",
  "displayName": "Students",
  "description": "Student records",
  "isUserLinked": true,
  "mappings": [ { "sourceColumn": "First Name", "targetField": "first_name" } ]
}
```

---

### GET `/import`

List all imports with pagination.

**Auth:** Admin

**Query:** `page`, `limit`

---

### GET `/import/:id`

Get import details including errors.

**Auth:** Admin

---

### DELETE `/import/:id`

Delete an import record.

**Auth:** Admin

---

## 5. Survey Engine

### GET `/surveys`

List surveys with pagination and filtering.

**Auth:** Authenticated

**Query:** `page`, `limit`, `status` (draft/published/closed), `createdBy`

---

### POST `/surveys`

Create a new survey.

**Auth:** Admin

**Request Body:**
```json
{
  "title": "Student Satisfaction Survey",
  "description": "Annual survey",
  "targetTableId": "uuid",
  "accessType": "public",
  "allowMultipleResponses": false
}
```

**Survey Statuses:** `draft`, `published`, `closed`
**Access Types:** `public`, `authenticated`

---

### GET `/surveys/:id`

Get survey details.

**Auth:** Authenticated

---

### PATCH `/surveys/:id`

Update survey metadata.

**Auth:** Admin

---

### DELETE `/surveys/:id`

Delete a survey.

**Auth:** Admin

---

### GET `/surveys/:id/questions`

List all questions for a survey.

**Auth:** Authenticated

---

### POST `/surveys/:id/questions`

Add a question to a survey.

**Auth:** Admin

**Request Body:**
```json
{
  "type": "multiple_choice",
  "label": "How satisfied are you?",
  "configJson": { "options": ["Very", "Somewhat", "Not at all"] },
  "isRequired": true,
  "orderIndex": 0,
  "targetFieldId": null,
  "autoCreateField": false
}
```

**Question Types:** `multiple_choice`, `text`, `rating`, `dropdown`, `checkbox`, `date`, `number`

---

### PATCH `/surveys/questions/:id`

Update a question.

**Auth:** Admin

---

### DELETE `/surveys/questions/:id`

Delete a question.

**Auth:** Admin

---

### POST `/surveys/:id/reorder`

Reorder survey questions.

**Auth:** Admin

**Request Body:**
```json
{
  "questions": [
    { "id": "uuid-1", "orderIndex": 0 },
    { "id": "uuid-2", "orderIndex": 1 }
  ]
}
```

---

### POST `/surveys/:id/link-table`

Link a survey to a dynamic table for response storage.

**Auth:** Admin

**Request Body:** `{ "tableId": "uuid" }`

---

### POST `/surveys/:id/auto-create-fields`

Auto-create dynamic table fields from survey questions.

**Auth:** Admin

---

### POST `/surveys/:id/publish`

Publish a survey (status: draft → published).

**Auth:** Admin

---

### POST `/surveys/:id/close`

Close a survey (status: published → closed).

**Auth:** Admin

---

### GET `/surveys/:id/stats`

Get survey response statistics.

**Auth:** Admin

---

## 6. Public Survey Endpoints

### GET `/public/surveys/:slug`

Get a published survey for public viewing.

**Auth:** Public (authenticated surveys require Bearer token)

---

### POST `/public/surveys/:slug/submit`

Submit a survey response. Rate-limited (20 requests / hour).

**Auth:** Public (authenticated surveys require Bearer token)

**Request Body:**
```json
{
  "responses": {
    "question-uuid-1": "answer text",
    "question-uuid-2": ["option1", "option2"],
    "question-uuid-3": 4
  }
}
```

---

## 7. Visualization Engine

### GET `/viz/charts`

List charts with pagination and filtering.

**Auth:** Authenticated

**Query:** `page`, `limit`, `tableId`, `isPublic`, `createdBy`

---

### POST `/viz/charts`

Create a new chart.

**Auth:** Admin

**Request Body:**
```json
{
  "title": "Enrollment by Year",
  "description": "Annual enrollment trend",
  "chartType": "bar",
  "tableId": "uuid",
  "sqlQuery": "SELECT year AS label, COUNT(*) AS value FROM dt_enrollments GROUP BY year",
  "configJson": {},
  "isPublic": false
}
```

**Chart Types:** `bar`, `line`, `pie`, `donut`, `area`, `scatter`, `table`, `metric`, `horizontal_bar`, `radar`

---

### GET `/viz/charts/:id`

Get chart details.

**Auth:** Authenticated

---

### PATCH `/viz/charts/:id`

Update a chart.

**Auth:** Admin

---

### DELETE `/viz/charts/:id`

Delete a chart.

**Auth:** Admin

---

### POST `/viz/charts/:id/execute`

Execute a chart's SQL query and return data.

**Auth:** Authenticated

**Query:** `limit` (default: 500, max: 10000)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "chartType": "bar",
    "configJson": {},
    "rows": [ { "label": "2024", "value": 150 } ]
  }
}
```

---

### POST `/viz/charts/execute-raw`

Execute a raw SQL query (for chart preview/testing).

**Auth:** Admin

**Request Body:**
```json
{
  "tableId": "uuid",
  "sqlQuery": "SELECT * FROM dt_students LIMIT 10",
  "limit": 100
}
```

**Notes:** SQL is AST-validated (SELECT only), executed in read-only transaction with 10s timeout.

---

### GET `/viz/dashboards`

List dashboards with pagination.

**Auth:** Authenticated

**Query:** `page`, `limit`, `isPublic`, `createdBy`

---

### POST `/viz/dashboards`

Create a new dashboard.

**Auth:** Admin

**Request Body:**
```json
{
  "title": "Academic Overview",
  "description": "Main academic dashboard",
  "layoutJson": {},
  "isPublic": false
}
```

---

### GET `/viz/dashboards/:id`

Get dashboard with charts.

**Auth:** Authenticated

---

### PATCH `/viz/dashboards/:id`

Update a dashboard.

**Auth:** Admin

---

### DELETE `/viz/dashboards/:id`

Delete a dashboard.

**Auth:** Admin

---

### POST `/viz/dashboards/:id/charts`

Add a chart to a dashboard.

**Auth:** Admin

**Request Body:**
```json
{
  "chartId": "uuid",
  "positionX": 0,
  "positionY": 0,
  "width": 6,
  "height": 4,
  "configJson": {}
}
```

---

### PATCH `/viz/dashboards/charts/:chartId`

Update a dashboard chart's position/size.

**Auth:** Admin

---

### DELETE `/viz/dashboards/charts/:chartId`

Remove a chart from a dashboard.

**Auth:** Admin

---

### POST `/viz/dashboards/:id/publish`

Publish a dashboard (makes it publicly accessible).

**Auth:** Admin

---

### POST `/viz/dashboards/:id/unpublish`

Unpublish a dashboard.

**Auth:** Admin

---

### GET `/public/dashboards/:slug`

View a published dashboard with executed chart data.

**Auth:** Public

---

## 8. Report Engine

### GET `/reports/templates`

List report templates.

**Auth:** Manager (super_admin, admin, responsable_observatoire)

**Query:** `page`, `limit`, `createdBy`

---

### POST `/reports/templates`

Create a report template.

**Auth:** Admin

**Request Body:**
```json
{
  "name": "Student Performance Report",
  "description": "Individual student performance analysis",
  "promptTemplate": "Analyze student with CIN {{cin}}...",
  "targetTableId": "uuid",
  "configJson": {}
}
```

---

### GET `/reports/templates/:id`

Get template details.

**Auth:** Manager

---

### PATCH `/reports/templates/:id`

Update a template.

**Auth:** Admin

---

### DELETE `/reports/templates/:id`

Delete a template.

**Auth:** Admin

---

### POST `/reports/templates/:id/preview`

Preview a template with sample data.

**Auth:** Manager

**Request Body:** `{ "sampleData": { ... } }`

---

### GET `/reports/reports`

List generated reports.

**Auth:** Manager

**Query:** `templateId`, `userCin`, `status`, `page`, `limit`

**Report Statuses:** `generated`, `exported`, `failed`

---

### POST `/reports/reports`

Create a report manually.

**Auth:** Manager

---

### GET `/reports/reports/:id`

Get a generated report.

**Auth:** Manager

---

### POST `/reports/reports/generate`

Generate a report using AI (Groq). Rate-limited (50 requests / hour).

**Auth:** Manager

**Request Body:**
```json
{
  "templateId": "uuid",
  "cin": "12345678",
  "filters": {}
}
```

**Process:** Fetches student data from all user-linked tables → assembles context → sends to Groq → returns structured report sections.

---

### POST `/reports/reports/batch-generate`

Generate reports for multiple users by CIN. Rate-limited (50 requests / hour).

**Auth:** Admin

**Request Body:**
```json
{
  "templateId": "uuid",
  "cins": ["11111111", "22222222"],
  "filters": {}
}
```

**Max:** 50 CINs per request.

---

### POST `/reports/reports/batch-zip`

Export multiple reports as a ZIP file of PDFs.

**Auth:** Manager

**Request Body:** `{ "reportIds": ["uuid-1", "uuid-2"] }` (1-100 IDs)

---

### GET `/reports/reports/:id/preview-html`

Preview a report as raw HTML.

**Auth:** Manager

---

### POST `/reports/reports/:id/export/pdf`

Export a report as PDF.

**Auth:** Manager

---

### POST `/reports/reports/:id/export/excel`

Export a report as Excel.

**Auth:** Manager

---

## 9. Analytics

All analytics endpoints require manager role (super_admin, admin, responsable_observatoire).

### GET `/analytics/academic/enrollments`

**Query:** `annee`, `filiere`, `niveau`, `genre`, `page`, `limit`

### GET `/analytics/academic/enrollments/summary`

**Query:** Same as enrollments

### GET `/analytics/academic/success-rates`

**Query:** Same as enrollments

### GET `/analytics/academic/teachers`

**Query:** `annee`, `genre`

### GET `/analytics/academic/formations`

**Query:** `annee`

### GET `/analytics/academic/events`

**Query:** `annee`

### GET `/analytics/insertion/rates`

**Query:** `promotion`, `filiere`, `anneeDebut`, `anneeFin`, `page`, `limit`

### GET `/analytics/insertion/delays`

**Query:** Same as insertion rates

### GET `/analytics/insertion/sectors`

**Query:** Same as insertion rates

### GET `/analytics/insertion/contracts`

**Query:** Same as insertion rates

### GET `/analytics/academic/mappings`

Get analytics-to-table mappings.

**Auth:** Admin

### POST `/analytics/academic/mappings`

Set analytics-to-table mapping.

**Auth:** Admin

**Request Body:**
```json
{
  "key": "analytics_students_table",
  "tableId": "uuid"
}
```

**Mapping Keys:** `analytics_students_table`, `analytics_teachers_table`, `analytics_formations_table`, `analytics_events_table`, `analytics_alumni_table`

---

## 10. Partnerships

### GET `/partnerships/companies`

List companies.

**Auth:** Authenticated

**Query:** `search`, `sector`, `isActive`, `page`, `limit`

---

### POST `/partnerships/companies`

Create a company.

**Auth:** Manager

**Request Body:**
```json
{
  "name": "Company Name",
  "sector": "Technology",
  "address": "Tunis",
  "contactName": "John",
  "contactEmail": "john@company.com",
  "contactPhone": "+216 XX XXX XXX",
  "partnershipStartDate": "2026-01-01",
  "isActive": true
}
```

---

### GET `/partnerships/companies/:id`

Get company details.

**Auth:** Authenticated

---

### PATCH `/partnerships/companies/:id`

Update a company.

**Auth:** Manager

---

### DELETE `/partnerships/companies/:id`

Delete a company.

**Auth:** Manager

---

### GET `/partnerships/offers`

List offers.

**Auth:** Authenticated

**Query:** `companyId`, `type` (stage/emploi), `isActive`, `page`, `limit`

---

### POST `/partnerships/offers`

Create an offer.

**Auth:** Manager

**Request Body:**
```json
{
  "companyId": "uuid",
  "type": "stage",
  "title": "Internship Opportunity",
  "description": "...",
  "requirements": "...",
  "publishDate": "2026-01-01",
  "expiryDate": "2026-06-30",
  "isActive": true
}
```

**Offer Types:** `stage`, `emploi`

---

### GET `/partnerships/offers/:id`

**Auth:** Authenticated

### PATCH `/partnerships/offers/:id`

**Auth:** Manager

### DELETE `/partnerships/offers/:id`

**Auth:** Manager

---

### GET `/partnerships/collaborations`

List collaborations.

**Auth:** Authenticated

**Query:** `companyId`, `academicYear`, `page`, `limit`

---

### POST `/partnerships/collaborations`

Create a collaboration.

**Auth:** Manager

**Request Body:**
```json
{
  "companyId": "uuid",
  "type": "Internship Agreement",
  "description": "...",
  "date": "2026-03-15",
  "academicYear": "2025-2026"
}
```

---

### GET `/partnerships/collaborations/:id`

**Auth:** Authenticated

### PATCH `/partnerships/collaborations/:id`

**Auth:** Manager

### DELETE `/partnerships/collaborations/:id`

**Auth:** Manager

---

## 11. System Administration

### GET `/system/settings`

List all system settings.

**Auth:** Authenticated

---

### GET `/system/settings/:key`

Get a specific setting.

**Auth:** Authenticated

---

### PUT `/system/settings/:key`

Upsert a setting.

**Auth:** Admin

**Request Body:** `{ "value": "any JSON value" }`

---

### DELETE `/system/settings/:key`

Delete a setting.

**Auth:** Admin

---

### GET `/system/academic-years`

List academic years.

**Auth:** Authenticated

**Query:** `page`, `limit`

---

### GET `/system/academic-years/:id`

Get academic year details.

**Auth:** Authenticated

---

### POST `/system/academic-years`

Create an academic year.

**Auth:** Admin

**Request Body:**
```json
{
  "year": "2025-2026",
  "startDate": "2025-09-01",
  "endDate": "2026-06-30",
  "isCurrent": true
}
```

---

### PATCH `/system/academic-years/:id`

Update an academic year.

**Auth:** Admin

---

### DELETE `/system/academic-years/:id`

Delete an academic year.

**Auth:** Admin

---

### GET `/system/activity-logs`

List activity logs.

**Auth:** Admin

**Query:** `userId`, `action`, `page`, `limit`

---

## 12. AI Services

All AI endpoints are rate-limited (50 requests / hour) and require admin role.

### POST `/ai/import/suggest-table`

Suggest a dynamic table structure from an uploaded file.

**Auth:** Admin

**Request Body:** `{ "fileId": "uuid" }`

**Response:** AI-generated table schema with field suggestions.

---

### POST `/ai/surveys/generate`

Generate a survey from a description.

**Auth:** Admin

**Request Body:**
```json
{
  "description": "Student satisfaction survey for 2025",
  "targetAudience": "Third-year students"
}
```

**Response:** AI-generated survey with questions.

---

### POST `/ai/charts/generate`

Generate a chart from a natural language description.

**Auth:** Admin

**Request Body:**
```json
{
  "description": "Show enrollment trends by year",
  "tableId": "uuid"
}
```

**Response:** AI-generated chart definition with SQL query.

---

## 13. Public Endpoints

### GET `/public/stats`

Platform statistics (users, tables, surveys, dashboards).

**Auth:** Public

---

### GET `/public/dashboards`

Last 6 published dashboards.

**Auth:** Public

---

### GET `/public/surveys`

Last 20 published surveys.

**Auth:** Public

---

### GET `/public/student-stats`

Student portal statistics.

**Auth:** Authenticated

---

### GET `/public/teacher-stats`

Teacher portal statistics.

**Auth:** Authenticated

---

### GET `/public/alumni-stats`

Alumni portal statistics.

**Auth:** Authenticated

---

### GET `/public/observatoire-stats`

Observatory portal statistics.

**Auth:** Authenticated

---

## 14. Health & Exports

### GET `/health`

**Auth:** Public

**Response:** `{ "status": "ok", "timestamp": "..." }`

### GET `/api/v1/health`

**Auth:** Public

### GET `/exports/:fileName`

Download an exported file (PDF/Excel/ZIP).

**Auth:** Authenticated

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | No token provided |
| `TOKEN_EXPIRED` | 401 | JWT token expired |
| `INVALID_TOKEN` | 401 | Malformed or invalid JWT |
| `INVALID_CREDENTIALS` | 401 | Wrong CIN/username or password |
| `ACCOUNT_DISABLED` | 401 | User account is deactivated |
| `FORBIDDEN` | 403 | Role not authorized for this action |
| `CANNOT_DELETE_SUPER_ADMIN` | 403 | Cannot delete super admin user |
| `NOT_FOUND` | 404 | Resource not found |
| `USER_NOT_FOUND` | 404 | User ID not found |
| `TEMPLATE_NOT_FOUND` | 404 | Report template not found |
| `REPORT_NOT_FOUND` | 404 | Generated report not found |
| `NO_STUDENT_DATA` | 404 | No data found for CIN |
| `FILE_NOT_FOUND` | 404 | Export file not found on disk |
| `VALIDATION_ERROR` | 400 | Zod schema validation failed |
| `INVALID_INPUT` | 400 | Generic invalid input |
| `INVALID_IDENTIFIER` | 400 | Identifier fails `[a-z0-9_]+` regex |
| `INVALID_TABLE_NAME` | 400 | Table name missing `dt_` prefix |
| `INVALID_SQL` | 400 | SQL not a single SELECT statement |
| `INVALID_PASSWORD` | 400 | Current password is wrong |
| `INVALID_FILENAME` | 400 | Export filename contains invalid characters |
| `NO_CIN` | 400 | Account has no CIN linked |
| `CIN_EXISTS` | 400 | CIN already registered |
| `EMAIL_EXISTS` | 400 | Email already registered |
| `TABLE_EXISTS` | 400 | Table name already exists |
| `FIELD_EXISTS` | 400 | Field name already exists |
| `RELATIONSHIP_EXISTS` | 400 | Relationship already exists |
| `CIRCULAR_RELATIONSHIP` | 400 | Would create circular dependency |
| `AUTH_REQUIRED` | 401 | Survey requires authentication |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `AI_PARSE_ERROR` | 502 | AI response could not be parsed as JSON |
| `AI_INVALID_RESPONSE` | 502 | AI response missing required fields |
| `AI_ERROR` | 502 | Groq API call failed |
| `INTERNAL_ERROR` | 500 | Unhandled server error |

---

## Rate Limiting

| Limiter | Window | Max Requests | Applies To |
|---------|--------|:------------:|------------|
| Global | 15 min | 100 | All routes |
| Auth | 15 min | 10 | `/auth/login`, `/auth/change-password` |
| AI | 60 min | 50 | `/ai/*`, report generation |
| Public Submission | 60 min | 20 | `/public/surveys/:slug/submit` |

Rate limiters are disabled in test environment (`NODE_ENV=test`).

---

## JWT Token Payload

```json
{
  "id": "uuid",
  "cin": "12345678",
  "email": "user@example.com",
  "role": "admin",
  "iat": 1714022400,
  "exp": 1714108800
}
```

- **Algorithm:** HS256
- **Expiry:** Configurable via `JWT_EXPIRES_IN` (default 24h)
