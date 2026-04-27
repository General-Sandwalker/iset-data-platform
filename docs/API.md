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
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
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

---

## Authentication API

### POST `/auth/login`

Authenticate user and receive JWT token.

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

**Errors:**
- `INVALID_CREDENTIALS` - Wrong identifier or password
- `ACCOUNT_DISABLED` - User is inactive

---

### GET `/auth/me`

Get current authenticated user profile.

**Headers:** `Authorization: Bearer <token>`

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

Change current user's password.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "currentPassword": "oldpass123",
  "newPassword": "newpass123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { "message": "Password changed successfully" }
}
```

**Errors:**
- `INVALID_PASSWORD` - Current password is wrong
- `VALIDATION_ERROR` - New password too short

---

## Users API

All user endpoints require authentication and admin role (except `/users/me`).

### GET `/users`

List users with pagination and filtering.

**Headers:** `Authorization: Bearer <token>`

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
    {
      "id": "uuid",
      "cin": "12345678",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "admin",
      "phone": "+216 XX XXX XXX",
      "isActive": true,
      "createdAt": "2026-04-26T00:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 50
  }
}
```

**Roles:**
- `super_admin` - Super administrator
- `admin` - Administrator
- `responsable_observatoire` - Observatory manager
- `enseignant` - Teacher
- `etudiant` - Student
- `alumni` - Alumni

---

### POST `/users`

Create a new user (admin only).

**Headers:** `Authorization: Bearer <token>`

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
    "phone": "+216 XX XXX XXX",
    "isActive": true,
    "mustChangePassword": true,
    "tempPassword": "xK9#mP2$"
  }
}
```

**Errors:**
- `CIN_EXISTS` - CIN already registered
- `EMAIL_EXISTS` - Email already registered
- `VALIDATION_ERROR` - Invalid input

---

### GET `/users/:id`

Get user by ID.

**Headers:** `Authorization: Bearer <token>`

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
    "role": "etudiant",
    "phone": "+216 XX XXX XXX",
    "isActive": true,
    "mustChangePassword": true,
    "createdAt": "2026-04-26T00:00:00.000Z"
  }
}
```

---

### PATCH `/users/:id`

Update user details.

**Headers:** `Authorization: Bearer <token>`

**Request Body (all fields optional):**
```json
{
  "displayName": "Student Records",
  "description": "Updated description",
  "isUserLinked": true
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "dt_students",
    "displayName": "Student Records",
    "description": "Updated description",
    "isUserLinked": true
  }
}
```

**Notes:**
- Setting `isUserLinked` to `true` automatically adds a `cin` column to the table if not present
- Setting `isUserLinked` to `false` keeps the column but unlinks the table
- Table name cannot be changed after creation to preserve data

---

### DELETE `/schema/tables/:id`

Delete a table and all its data (super_admin only).

**Headers:** `Authorization: Bearer <token>` (super_admin role required)

**Response (200):**
```json
{
  "success": true,
  "data": { "message": "Table deleted" }
}
```

---

### GET `/schema/tables/:id/fields`

List all fields for a table.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "tableId": "table-uuid",
      "name": "first_name",
      "displayName": "First Name",
      "fieldType": "text",
      "configJson": {},
      "isRequired": true,
      "orderIndex": 0
    }
  ]
}
```

---

### POST `/schema/tables/:id/fields`

Add a new field to a table.

**Headers:** `Authorization: Bearer <token>` (admin role required)

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
| Type | Description | Config |
|------|-------------|--------|
| `text` | Short text | - |
| `number` | Integer | - |
| `decimal` | Decimal number | - |
| `date` | Date | - |
| `datetime` | Date and time | - |
| `boolean` | Yes/No | - |
| `select` | Single choice | `{ "options": ["A", "B", "C"] }` |
| `multiselect` | Multiple choices | `{ "options": ["A", "B", "C"] }` |
| `email` | Email address | - |
| `phone` | Phone number | - |
| `file` | File path | - |
| `user_link` | Link to user by CIN | - |

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tableId": "table-uuid",
    "name": "email",
    "displayName": "Email Address",
    "fieldType": "email",
    "isRequired": true,
    "orderIndex": 2
  }
}
```

---

### PATCH `/schema/tables/fields/:id`

Update a field (display name, required, config only - not type).

**Headers:** `Authorization: Bearer <token>` (admin role required)

**Request Body:**
```json
{
  "displayName": "Email",
  "isRequired": false,
  "configJson": {},
  "orderIndex": 3
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { ... }
}
```

---

### DELETE `/schema/tables/fields/:id`

Delete a field from a table (admin only).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": { "message": "Field deleted" }
}
```

---

### GET `/schema/relationships`

List all relationships.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `tableId` (optional) - Filter by source or target table

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "sourceTableId": "table-uuid-1",
      "sourceFieldId": "field-uuid-1",
      "targetTableId": "table-uuid-2",
      "targetFieldId": null,
      "relationshipType": "many_to_one",
      "sourceTableName": "dt_grades",
      "sourceFieldName": "student_cin",
      "targetTableName": "dt_students",
      "targetFieldName": null
    }
  ]
}
```

**Relationship Types:**
- `many_to_one` - Source belongs to target (e.g., grade belongs to student)
- `one_to_many` - Source has many targets

---

### POST `/schema/relationships`

Create a relationship between tables.

**Headers:** `Authorization: Bearer <token>` (admin role required)

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

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "sourceTableId": "...",
    "sourceFieldId": "...",
    "targetTableId": "...",
    "targetFieldId": null,
    "relationshipType": "many_to_one"
  }
}
```

---

### PATCH `/schema/relationships/:id`

Update a relationship.

**Headers:** `Authorization: Bearer <token>` (admin role required)

**Request Body:**
```json
{
  "relationshipType": "one_to_many",
  "targetFieldId": "target-field-uuid"
}
```

---

### DELETE `/schema/relationships/:id`

Delete a relationship.

**Headers:** `Authorization: Bearer <token>` (admin role required)

**Response (200):**
```json
{
  "success": true,
  "data": { "message": "Relationship deleted" }
}
```

---

### GET `/schema/tables/:id/data`

Get paginated data from a table.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20, max: 100) |
| sortBy | string | Column name to sort by |
| sortOrder | asc/desc | Sort direction (default: desc) |
| search | string | Text search across text fields |
| filters | JSON | Filter expressions |

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
  "data": [
    {
      "id": "record-uuid",
      "cin": "12345678",
      "first_name": "John",
      "last_name": "Doe",
      "createdAt": "2026-04-26T00:00:00.000Z",
      "updatedAt": "2026-04-26T00:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

---

### POST `/schema/tables/:id/data`

Insert a new record into a table.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com",
  "birthDate": "2000-05-15"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "new-record-uuid",
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@example.com",
    "birthDate": "2000-05-15",
    "createdAt": "2026-04-27T00:00:00.000Z"
  }
}
```

---

### PATCH `/schema/tables/:id/data/:recordId`

Update an existing record.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "lastName": "Johnson",
  "email": "newemail@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "record-uuid",
    "firstName": "Jane",
    "lastName": "Johnson",
    "email": "newemail@example.com",
    "updatedAt": "2026-04-27T00:00:00.000Z"
  }
}
```

---

### DELETE `/schema/tables/:id/data/:recordId`

Delete a record from a table.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": { "message": "Record deleted" }
}
```

---

### GET `/schema/my-records`

Get all records linked to the current user's CIN across all user-linked tables. Use this for student/alumni portals to fetch their data.

**Headers:** `Authorization: Bearer <token>` (requires CIN in users table)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "cin": "12345678",
    "tablesCount": 2,
    "records": {
      "dt_grades": [
        {
          "id": "uuid",
          "cin": "12345678",
          "course": "Mathematics",
          "grade": 15,
          "created_at": "2026-04-26T00:00:00.000Z"
        }
      ],
      "dt_attendance": [
        {
          "id": "uuid",
          "cin": "12345678",
          "date": "2026-04-25",
          "present": true
        }
      ]
    }
  }
}
```

**Errors:**
- `NO_CIN` - Account does not have a CIN linked

---

## Import API

All import endpoints require authentication and admin role.

### POST `/import/upload`

Upload a file for import. Parses CSV, Excel, or JSON and returns column info with sample rows.

**Headers:** `Authorization: Bearer <token>` (admin role required)
**Content-Type:** `multipart/form-data`

**Form Data:**
| Field | Type | Description |
|-------|------|-------------|
| file | File | CSV, Excel (.xlsx/.xls), or JSON file (max 50MB) |

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
    "sampleRows": [
      { "first_name": "John", "last_name": "Doe", "email": "john@example.com", "cin": "12345678" }
    ],
    "totalRows": 150
  }
}
```

---

### POST `/import/preview`

Preview mapped data with validation results before executing import.

**Headers:** `Authorization: Bearer <token>` (admin role required)

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
    "validRows": [
      { "first_name": "John", "last_name": "Doe", "email": "john@example.com" }
    ],
    "invalidRows": [
      { "row": 5, "data": { "first_name": "" }, "errors": ["Row 5: first_name is required"] }
    ],
    "stats": {
      "totalRows": 150,
      "validCount": 140,
      "invalidCount": 10
    }
  }
}
```

---

### POST `/import/execute`

Execute the import, inserting valid rows into the target dynamic table.

**Headers:** `Authorization: Bearer <token>` (admin role required)

**Request Body:**
```json
{
  "fileId": "uuid",
  "tableId": "uuid",
  "mappings": [
    { "sourceColumn": "First Name", "targetField": "first_name" },
    { "sourceColumn": "Email", "targetField": "email", "transform": "lowercase" }
  ],
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
    "errors": [
      { "row": 5, "error": "Row 5: email is required" }
    ]
  }
}
```

---

### POST `/import/create-table-and-import`

Shortcut: creates a new dynamic table and imports data in one step.

**Headers:** `Authorization: Bearer <token>` (admin role required)

**Request Body:**
```json
{
  "fileId": "uuid",
  "tableName": "students",
  "displayName": "Students",
  "description": "Student records",
  "isUserLinked": true,
  "mappings": [
    { "sourceColumn": "First Name", "targetField": "first_name" }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "table": { "id": "uuid", "name": "dt_students", "displayName": "Students" },
    "totalRows": 150,
    "importedRows": 140,
    "errorCount": 10,
    "errors": []
  }
}
```

---

### GET `/import`

List all imports with pagination.

**Headers:** `Authorization: Bearer <token>` (admin role required)

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20) |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "filename": "students.csv",
      "fileType": "csv",
      "fileSize": 10240,
      "status": "completed",
      "columns": ["first_name", "last_name"],
      "totalRows": 150,
      "importedRows": 140,
      "errorCount": 10,
      "createdAt": "2026-04-27T10:00:00.000Z",
      "completedAt": "2026-04-27T10:01:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1 }
}
```

---

### GET `/import/:id`

Get import details including errors.

**Headers:** `Authorization: Bearer <token>` (admin role required)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "filename": "students.csv",
    "fileType": "csv",
    "fileSize": 10240,
    "status": "completed",
    "columns": ["first_name"],
    "totalRows": 150,
    "importedRows": 140,
    "errorCount": 10,
    "errors": [{ "row": 5, "error": "Row 5: email is required" }],
    "createdAt": "2026-04-27T10:00:00.000Z",
    "completedAt": "2026-04-27T10:01:00.000Z"
  }
}
```

---

### DELETE `/import/:id`

Delete an import record.

**Headers:** `Authorization: Bearer <token>` (admin role required)

**Response (200):**
```json
{
  "success": true,
  "data": { "message": "Import deleted" }
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_CREDENTIALS` | 401 | Wrong username/password |
| `ACCOUNT_DISABLED` | 403 | User account is inactive |
| `UNAUTHORIZED` | 401 | Missing or invalid JWT |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `TABLE_EXISTS` | 400 | Table name already exists |
| `FIELD_EXISTS` | 400 | Field name already exists |
| `RELATIONSHIP_EXISTS` | 400 | Relationship already exists |
| `CIRCULAR_RELATIONSHIP` | 400 | Would create circular dependency |
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `CIN_EXISTS` | 400 | CIN already registered |
| `EMAIL_EXISTS` | 400 | Email already registered |
| `CANNOT_DELETE_SUPER_ADMIN` | 403 | Cannot delete super admin |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Roles & Permissions

| Role | Permissions |
|------|-------------|
| `super_admin` | Full access, can delete tables, manage all |
| `admin` | Can manage tables, fields, relationships, data; can manage users |
| `responsable_observatoire` | Can create/edit surveys, charts, dashboards, reports |
| `enseignant` | Read-only access to assigned data |
| `etudiant` | Access own data via user-linked tables |
| `alumni` | Access own data and insertion surveys |
