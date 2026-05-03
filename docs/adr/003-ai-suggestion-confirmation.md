# ADR 003: AI Suggestion-Confirmation Pattern

## Status

Accepted

## Context

The platform integrates Groq AI for three features: table schema suggestion, survey generation, and chart generation. We considered:
1. **Auto-apply** — AI writes directly to the database
2. **Suggestion-confirmation** — AI returns proposals; human reviews and confirms
3. **AI-assisted editing** — AI modifies existing entities in place

## Decision

We chose the **suggestion-confirmation** pattern. AI endpoints return structured proposals. The human user reviews the output and explicitly confirms by calling the corresponding CRUD endpoint (create table, create survey, create chart). AI never writes to the database directly.

## Consequences

**Positive:**
- Human always in the loop — no unchecked AI mutations
- User can edit AI suggestions before applying (rename fields, remove questions, adjust SQL)
- Prevents AI hallucinations from corrupting data (e.g., wrong SQL, nonsensical schemas)
- Clear audit trail — the CRUD endpoint logs the action, not the AI suggestion
- AI can be disabled (empty GROQ_API_KEY) without affecting core functionality

**Negative:**
- Extra step in workflow (generate → review → confirm)
- AI response parsing can fail — requires fallback defaults for invalid enum values

**Mitigations:**
- Invalid field types default to `text`; invalid chart types default to `bar`
- Missing required fields trigger `AI_PARSE_ERROR` (502) with clear message
- AI rate limiting (50/hour) prevents abuse
- Markdown code fences are stripped from AI responses before JSON.parse()
