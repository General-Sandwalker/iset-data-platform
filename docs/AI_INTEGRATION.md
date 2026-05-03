# AI Integration Documentation — ISET Tozeur Digital Observatory

## Overview

The platform integrates **Groq AI** (model: `qwen/qwen3-32b`) for four AI-powered features:

1. **Table Schema Suggestion** — Suggests a dynamic table structure from an uploaded file
2. **Survey Generation** — Generates a complete survey from a description
3. **Chart Generation** — Generates a chart definition with SQL query from a description
4. **Report Generation** — Generates individual student performance reports from data

All AI features follow the **suggestion-confirmation pattern**: AI returns structured proposals for human review. The user must explicitly confirm by calling the corresponding CRUD endpoint. AI never writes directly to the database.

---

## Groq Configuration

| Setting | Value |
|---------|-------|
| Provider | Groq (https://api.groq.com/openai/v1/chat/completions) |
| Model | `qwen/qwen3-32b` |
| Auth | Bearer token via `GROQ_API_KEY` environment variable |
| Format | OpenAI-compatible chat completions API |
| Required | No — all non-AI features work without a valid key |

If `GROQ_API_KEY` is empty or invalid, AI endpoints return an error. The rest of the platform is unaffected.

---

## Rate Limiting

| Limiter | Window | Max Requests | Applies To |
|---------|--------|:------------:|------------|
| AI Limiter | 60 minutes | 50 | All `/api/v1/ai/*` routes |
| AI Limiter | 60 minutes | 50 | `/api/v1/reports/reports/generate` |
| AI Limiter | 60 minutes | 50 | `/api/v1/reports/reports/batch-generate` |
| Global Limiter | 15 minutes | 100 | All routes (including AI) |

Rate limiters are disabled in test environment.

---

## AI Response Parsing Pattern

All AI services follow the same processing pattern:

1. **Build messages:** System prompt (role-specific instructions) + User message (data/context)
2. **Call Groq:** `groqChat(systemMessage, userMessage)` sends to the API
3. **Clean response:** Strip markdown code fences (` ```json ` and ` ``` `)
4. **Parse JSON:** `JSON.parse()` the cleaned response
5. **Validate:** Check required fields exist
6. **Sanitize:** Replace invalid enum values with fallback defaults
7. **Return:** Structured proposal to the frontend

### Error Handling

| Code | HTTP | When |
|------|------|------|
| `AI_PARSE_ERROR` | 502 | AI response could not be parsed as valid JSON |
| `AI_INVALID_RESPONSE` | 502 | AI response is valid JSON but missing required fields |
| `AI_ERROR` | 502 | Groq API call failed (network, rate limit on Groq side) |

---

## Feature Details

### 1. Table Schema Suggestion

**Endpoint:** `POST /api/v1/ai/import/suggest-table`
**Auth:** Admin
**Input:** `{ fileId: UUID }`

**System Prompt:** Instructs the AI to act as a database schema design expert. Analyzes uploaded file column names and sample data to suggest:
- Table name (lowercase, underscored)
- Display name
- Description
- Whether user-linked (has CIN column)
- Per-column: name, displayName, fieldType (from enum), isRequired, configJson

**User Message format:**
```
File: students.csv
Columns: first_name, last_name, email, cin, gpa
Sample data (5 rows):
1. John | Doe | john@email.com | 12345678 | 15.5
...
```

**Key prompt rules:**
- Output ONLY valid JSON (no markdown, no code fences)
- Do not include system columns (id, created_at, updated_at, created_by, cin)
- Use French display names if data appears French
- Be conservative with `isRequired` — prefer optional

**Fallback defaults:** Invalid fieldTypes → `text`; names sanitized to lowercase with underscores

---

### 2. Survey Generation

**Endpoint:** `POST /api/v1/ai/surveys/generate`
**Auth:** Admin
**Input:** `{ description: string (5-2000 chars), targetAudience?: string (max 200) }`

**System Prompt:** Instructs the AI to act as an expert academic survey designer. Generates structured survey with:
- `title`: Survey title
- `description`: Survey description
- `questions[]`: Array of question objects with type, label, configJson, isRequired, orderIndex

**Supported question types:** `multiple_choice`, `dropdown`, `checkbox`, `text`, `rating`, `number`, `date`

**Key prompt rules:**
- 5-15 questions
- Start with easy questions, group related ones
- Use French labels if context suggests French
- For `multiple_choice`/`dropdown`/`checkbox`: include `configJson.options[]`
- For `rating`: include `configJson.min` and `configJson.max`

**Fallback defaults:**
- Invalid questionTypes → `text`
- Missing labels → `"Untitled question"`
- Missing options → `["Option 1", "Option 2", "Option 3"]`
- Missing rating config → `{ min: 1, max: 5 }`

---

### 3. Chart Generation

**Endpoint:** `POST /api/v1/ai/charts/generate`
**Auth:** Admin
**Input:** `{ description: string (5-2000 chars), tableId: UUID }`

**System Prompt:** Instructs the AI to act as a data visualization expert. Generates:
- `title`: Chart title
- `chartType`: From the chart type enum
- `sqlQuery`: SELECT query referencing the exact table name
- `configJson`: Chart-specific configuration

**Supported chart types:** `bar`, `line`, `pie`, `donut`, `area`, `scatter`, `table`, `metric`, `horizontal_bar`, `radar`

**SQL query rules in the prompt:**
- Must be a single SELECT statement
- Must reference the exact table name (e.g., `dt_students`)
- Must use column aliases (AS label, AS value, AS x, AS y)
- No semicolons

**User message includes:** Table name, display name, and full field list with types and display names.

**Fallback defaults:**
- Invalid chartType → `bar`
- Missing configJson → `{}`

---

### 4. Report Generation

**Endpoint:** `POST /api/v1/reports/reports/generate`
**Auth:** Manager (super_admin, admin, responsable_observatoire)
**Input:** `{ templateId: UUID, cin: string, filters?: object }`

**Process:**
1. Load the report template (prompt template + target table)
2. Call `fetchStudentContext(cin)` — queries ALL user-linked dynamic tables for rows matching the CIN (up to 50 records per table, 20 sent to AI)
3. Assemble the user message: student CIN + student data + filled prompt template
4. Send to Groq
5. Parse response into sections: `[{ title, content }]`

**System Prompt:**
```
You are an academic advisor writing student performance reports for ISET Tozeur.
Based strictly on the provided student data, write a professional report with sections:
- Summary
- Academic Performance
- Strengths
- Areas for Improvement
- Recommendations

Do not invent data. Use formal academic tone.
Respond in structured JSON with sections: [{ title, content }].
If data is in French, respond in French.
```

**Batch Generation:** `POST /api/v1/reports/reports/batch-generate` (admin only)
- Accepts up to 50 CINs per request
- Generates reports sequentially for each CIN
- Individual failures don't abort the batch

---

## Suggestion-Confirmation Flow

All AI features follow this two-step pattern:

### Step 1: AI Suggests

The user triggers an AI endpoint. The AI returns a structured proposal. **Nothing is written to the database.**

Example (chart generation):
```json
{
  "success": true,
  "data": {
    "title": "Enrollment by Year",
    "chartType": "bar",
    "sqlQuery": "SELECT annee AS label, COUNT(*) AS value FROM dt_students GROUP BY annee",
    "configJson": { "xField": "label", "yField": "value" }
  }
}
```

### Step 2: Human Confirms

The user reviews the proposal in the frontend, optionally edits it, and then calls the corresponding CRUD endpoint:

| AI Endpoint | Confirmation Endpoint |
|-------------|----------------------|
| `POST /ai/import/suggest-table` | `POST /schema/tables` + `POST /import/execute` |
| `POST /ai/surveys/generate` | `POST /surveys` + `POST /surveys/:id/questions` |
| `POST /ai/charts/generate` | `POST /viz/charts` |
| `POST /reports/reports/generate` | Auto-saved (report is created directly) |

For reports, the generated content is saved directly because it's a report artifact (not a schema change). However, the user can still review it before exporting.

---

## Frontend AI Integration

### Survey Builder

- **AI button:** Robot icon (`RobotOutlined`) in the survey builder toolbar
- **Flow:** User enters description + optional target audience → clicks AI → receives generated questions → reviews, edits, and saves

### Chart Builder

- **AI button:** AI Suggest button in the chart creation form
- **Flow:** User enters description → clicks AI → receives chart definition with SQL → reviews, executes preview, and saves

### Report Center

- **Generate button:** In the report template view
- **Flow:** User enters CIN → clicks Generate → AI fetches student data and generates report → user previews HTML, exports as PDF/Excel

---

## Disabling AI Features

AI features can be disabled by:
1. Leaving `GROQ_API_KEY` empty or removing it from `.env`
2. The AI endpoints will return an error, but all other features continue working
3. The frontend AI buttons will show errors from the API response

This is useful for:
- Development without a Groq API key
- Environments where AI is not desired
- Testing with mocked AI responses
