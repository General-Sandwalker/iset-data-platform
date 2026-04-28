import { groqChat } from '../config/groq.js';
import { HttpError } from '../middleware/auth.js';
import { fieldTypes, type FieldType } from '../schema-engine/service.js';
import { questionTypes, type QuestionType } from '../survey-engine/service.js';
import { chartTypes, type ChartType } from '../viz-engine/service.js';

export interface SuggestedField {
  name: string;
  displayName: string;
  fieldType: FieldType;
  isRequired: boolean;
  configJson?: Record<string, unknown>;
}

export interface TableSuggestion {
  tableName: string;
  displayName: string;
  description: string;
  isUserLinked: boolean;
  fields: SuggestedField[];
}

const IMPORT_SUGGEST_SYSTEM_PROMPT = `You are a database schema design expert working on an academic observatory platform for ISET Tozeur. Your task is to analyze uploaded file data and suggest an optimal dynamic table structure.

Given the column names and sample data from an uploaded file, you must suggest:
1. A suitable table name (lowercase, underscored, e.g. "students", "alumni_2024", "course_grades")
2. A human-readable display name
3. A brief description of what this table stores
4. Whether the table should be user-linked (linked to a CIN — set to true if the data is about specific people like students, alumni, or teachers)
5. For each column, suggest:
   - "name": a clean database column name (lowercase, underscores only, [a-z0-9_])
   - "displayName": a human-readable label
   - "fieldType": one of: ${fieldTypes.join(', ')}
   - "isRequired": boolean
   - "configJson": optional, used for select/multiselect fields to list { options: [...] }

Field type guidelines:
- "text": general text strings (names, addresses, descriptions)
- "number": integer numbers (age, count, year)
- "decimal": numbers with decimals (GPA, salary, rates)
- "date": dates only (birth date, start date)
- "datetime": dates with time (event timestamp)
- "boolean": true/false values (active, graduated, passed)
- "select": single choice from a list (gender, level, status) — include options in configJson
- "multiselect": multiple choices (skills, languages) — include options in configJson
- "email": email addresses
- "phone": phone numbers
- "file": file references (documents, certificates)
- "user_link": CIN references to users table (8-digit national ID)

IMPORTANT RULES:
- Respond ONLY with valid JSON, no markdown, no code fences, no explanation
- The output must be exactly this JSON structure:
{
  "tableName": "string",
  "displayName": "string",
  "description": "string",
  "isUserLinked": boolean,
  "fields": [
    {
      "name": "string",
      "displayName": "string",
      "fieldType": "string",
      "isRequired": boolean,
      "configJson": {}
    }
  ]
}
- Do NOT include columns that are clearly system columns (id, created_at, updated_at, created_by, cin) — these are auto-generated
- Use French display names if the column names or data appear to be in French
- Be conservative with "isRequired" — only mark as required if the column clearly always has data
- For select fields with obvious categories, list the detected options`;

export async function suggestTableFromImport(
  columns: string[],
  sampleRows: Record<string, unknown>[],
  fileName?: string
): Promise<TableSuggestion> {
  if (!columns || columns.length === 0) {
    throw new HttpError(400, 'INVALID_INPUT', 'Columns array cannot be empty');
  }

  if (!sampleRows || sampleRows.length === 0) {
    throw new HttpError(400, 'INVALID_INPUT', 'Sample rows cannot be empty');
  }

  const truncatedSample = sampleRows.slice(0, 5).map((row) => {
    const truncated: Record<string, unknown> = {};
    for (const col of columns) {
      const val = row[col];
      if (typeof val === 'string' && val.length > 100) {
        truncated[col] = val.substring(0, 100) + '...';
      } else {
        truncated[col] = val;
      }
    }
    return truncated;
  });

  const userMessage = `Analyze this uploaded file data and suggest a dynamic table structure.

File name: ${fileName || 'unknown'}
Columns (${columns.length}): ${columns.join(', ')}

Sample data (first ${truncatedSample.length} rows):
${JSON.stringify(truncatedSample, null, 2)}

Suggest the optimal table schema as JSON.`;

  const responseText = await groqChat([
    { role: 'system', content: IMPORT_SUGGEST_SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ]);

  let parsed: TableSuggestion;
  try {
    const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new HttpError(502, 'AI_PARSE_ERROR', 'Failed to parse AI response as valid JSON. Please try again.');
  }

  if (!parsed.tableName || !parsed.fields || !Array.isArray(parsed.fields)) {
    throw new HttpError(502, 'AI_INVALID_RESPONSE', 'AI response is missing required fields (tableName, fields). Please try again.');
  }

  const validFieldTypes = new Set<string>(fieldTypes);
  parsed.fields = parsed.fields.map((field: SuggestedField) => {
    if (!validFieldTypes.has(field.fieldType)) {
      field.fieldType = 'text';
    }
    field.name = field.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!field.displayName) {
      field.displayName = field.name;
    }
    if (field.isRequired === undefined) {
      field.isRequired = false;
    }
    return field;
  });

  parsed.tableName = parsed.tableName.toLowerCase().replace(/[^a-z0-9_]/g, '_');

  return parsed;
}

export interface SuggestedQuestion {
  label: string;
  type: QuestionType;
  options?: string[];
  isRequired: boolean;
  min?: number;
  max?: number;
}

export interface SurveySuggestion {
  title: string;
  description: string;
  questions: SuggestedQuestion[];
}

const SURVEY_GENERATE_SYSTEM_PROMPT = `You are an expert academic survey designer working for ISET Tozeur, a higher education observatory platform. Generate structured survey questions in JSON format based on the user's description.

You must use ONLY these question types:
- "multiple_choice": single selection from a list of options (e.g., satisfaction level, yes/no, category)
- "dropdown": single selection from a dropdown (same as multiple_choice but rendered as dropdown for long option lists)
- "checkbox": multiple selections from a list (e.g., select all that apply)
- "text": open-ended text response (short answer, comments, descriptions)
- "rating": numeric rating scale (e.g., 1-5, 1-10 satisfaction)
- "number": numeric input (e.g., age, count, percentage)
- "date": date input (e.g., graduation date, employment start date)

Survey design best practices:
- Start with easy, non-sensitive questions first
- Group related questions together
- Keep the survey concise (5-15 questions)
- Use "multiple_choice" or "dropdown" when possible for easier analysis
- Only mark questions as required if they are truly essential
- For rating scales, include configJson with min and max
- For choice questions, include configJson with options array
- Use French labels if the context suggests a French-speaking audience
- Avoid biased or leading questions

IMPORTANT RULES:
- Respond ONLY with valid JSON, no markdown, no code fences, no explanation
- The output must be exactly this JSON structure:
{
  "title": "string",
  "description": "string",
  "questions": [
    {
      "label": "string",
      "type": "string",
      "options": ["string"],
      "isRequired": boolean,
      "min": number,
      "max": number
    }
  ]
}
- The "options" field is only needed for multiple_choice, dropdown, and checkbox types
- The "min" and "max" fields are only needed for rating type
- Omit options/min/max from the JSON if not applicable to the question type
- Every question must have "label", "type", and "isRequired"`;

export async function generateSurvey(
  description: string,
  targetAudience?: string
): Promise<SurveySuggestion> {
  if (!description || description.trim().length === 0) {
    throw new HttpError(400, 'INVALID_INPUT', 'Description cannot be empty');
  }

  const audienceText = targetAudience ? `Target audience: ${targetAudience}.` : '';
  const userMessage = `Generate a survey based on this description:

${description}

${audienceText}

Generate the survey as JSON.`;

  const responseText = await groqChat([
    { role: 'system', content: SURVEY_GENERATE_SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ]);

  let parsed: SurveySuggestion;
  try {
    const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new HttpError(502, 'AI_PARSE_ERROR', 'Failed to parse AI response as valid JSON. Please try again.');
  }

  if (!parsed.title || !parsed.questions || !Array.isArray(parsed.questions)) {
    throw new HttpError(502, 'AI_INVALID_RESPONSE', 'AI response is missing required fields (title, questions). Please try again.');
  }

  const validQuestionTypes = new Set<string>(questionTypes);
  parsed.questions = parsed.questions.map((q: SuggestedQuestion) => {
    if (!validQuestionTypes.has(q.type)) {
      q.type = 'text';
    }
    if (!q.label) {
      q.label = 'Untitled question';
    }
    if (q.isRequired === undefined) {
      q.isRequired = false;
    }
    if ((q.type === 'multiple_choice' || q.type === 'dropdown' || q.type === 'checkbox') && (!q.options || !Array.isArray(q.options))) {
      q.options = ['Option 1', 'Option 2', 'Option 3'];
    }
    if (q.type === 'rating' && !q.min) {
      q.min = 1;
      q.max = q.max || 5;
    }
      return q;
    });

  return parsed;
}

export interface ChartSuggestion {
  title: string;
  chartType: ChartType;
  sqlQuery: string;
  configJson: Record<string, unknown>;
  description: string;
}

const CHART_GENERATE_SYSTEM_PROMPT = `You are a data visualization expert working on an academic observatory platform for ISET Tozeur. Generate chart definitions in JSON format based on the user's description and available table schema.

You must use ONLY these chart types: ${chartTypes.join(', ')}

Chart type guidelines:
- "bar": vertical bar chart for comparing categories
- "horizontal_bar": horizontal bar chart for comparing categories with long labels
- "line": line chart for trends over time
- "pie": pie chart for proportions (max 6-8 categories)
- "donut": donut chart for proportions with center space
- "area": area chart for cumulative trends
- "scatter": scatter plot for correlations
- "table": tabular data display
- "metric": single key metric (count, average, sum)
- "radar": radar chart for multi-dimensional comparison

SQL query rules:
- Use ONLY SELECT queries
- The table name MUST be used exactly as provided (e.g., dt_students)
- For aggregation, use GROUP BY with appropriate aggregate functions
- For metric charts, return a single row with a "value" column alias
- For bar/horizontal_bar/line/area charts, return rows with a "label" column and a "value" column
- For pie/donut charts, return rows with a "label" column and a "value" column
- For scatter charts, return rows with "x" and "y" column aliases
- For table charts, return the raw data columns
- For radar charts, return rows with "label" and "value" columns
- Always use meaningful column aliases (AS label, AS value, AS x, AS y)
- Use COUNT(*), AVG(), SUM(), MIN(), MAX() for aggregations
- Keep queries simple and efficient

configJson options:
- For metric charts: { "prefix": "", "suffix": "", "decimals": 0 }
- For bar/line/area: { "colors": ["#4e79a7", ...], "showLegend": true/false, "stacked": true/false }
- For pie/donut: { "colors": ["#4e79a7", ...], "showLegend": true/false }
- For table: { "columns": [{ "key": "col", "label": "Label" }] }

IMPORTANT RULES:
- Respond ONLY with valid JSON, no markdown, no code fences, no explanation
- The output must be exactly this JSON structure:
{
  "title": "string",
  "chartType": "string",
  "sqlQuery": "string",
  "configJson": {},
  "description": "string"
}
- Use French for titles and descriptions if the context suggests a French-speaking audience
- Ensure the SQL query is valid PostgreSQL and references the correct table name`;

export async function generateChart(
  description: string,
  tableName: string,
  tableDisplayName: string,
  fields: { name: string; displayName: string; fieldType: string }[]
): Promise<ChartSuggestion> {
  if (!description || description.trim().length === 0) {
    throw new HttpError(400, 'INVALID_INPUT', 'Description cannot be empty');
  }

  const fieldDescriptions = fields
    .map(f => `  - ${f.name} (${f.fieldType}): ${f.displayName}`)
    .join('\n');

  const userMessage = `Generate a chart definition for the following request:

Description: ${description}

Table: ${tableName} (display name: "${tableDisplayName}")
Fields:
${fieldDescriptions}

Generate the chart as JSON.`;

  const responseText = await groqChat([
    { role: 'system', content: CHART_GENERATE_SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ]);

  let parsed: ChartSuggestion;
  try {
    const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new HttpError(502, 'AI_PARSE_ERROR', 'Failed to parse AI response as valid JSON. Please try again.');
  }

  if (!parsed.title || !parsed.chartType || !parsed.sqlQuery) {
    throw new HttpError(502, 'AI_INVALID_RESPONSE', 'AI response is missing required fields (title, chartType, sqlQuery). Please try again.');
  }

  const validChartTypes = new Set<string>(chartTypes);
  if (!validChartTypes.has(parsed.chartType)) {
    parsed.chartType = 'bar';
  }

  if (!parsed.configJson) {
    parsed.configJson = {};
  }

  if (!parsed.description) {
    parsed.description = parsed.title;
  }

  return parsed;
}
