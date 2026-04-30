import { query, getClient } from '../config/database.js';
import { HttpError } from '../middleware/auth.js';
import { getTableById } from '../schema-engine/service.js';

export const reportStatuses = ['generated', 'exported', 'failed'] as const;
export type ReportStatus = (typeof reportStatuses)[number];

export interface ReportTemplate {
  id: string;
  name: string;
  description: string | null;
  prompt_template: string;
  target_table_id: string | null;
  config_json: object;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GeneratedReport {
  id: string;
  template_id: string;
  user_cin: string | null;
  content: object | null;
  status: ReportStatus;
  created_at: string;
}

export async function createTemplate(data: {
  name: string;
  description?: string;
  promptTemplate: string;
  targetTableId?: string;
  configJson?: object;
  createdBy: string;
}): Promise<ReportTemplate> {
  if (data.targetTableId) {
    await getTableById(data.targetTableId);
  }

  const result = await query<ReportTemplate>(
    `INSERT INTO report_templates (name, description, prompt_template, target_table_id, config_json, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      data.name,
      data.description || null,
      data.promptTemplate,
      data.targetTableId || null,
      JSON.stringify(data.configJson || {}),
      data.createdBy,
    ]
  );

  return result.rows[0];
}

export async function listTemplates(options?: {
  createdBy?: string;
}): Promise<ReportTemplate[]> {
  const conditions: string[] = [];
  const values: any[] = [];
  let i = 1;

  if (options?.createdBy) {
    conditions.push(`created_by = $${i++}`);
    values.push(options.createdBy);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query<ReportTemplate>(
    `SELECT * FROM report_templates ${where} ORDER BY created_at DESC`,
    values
  );

  return result.rows;
}

export async function getTemplateById(id: string): Promise<ReportTemplate> {
  const result = await query<ReportTemplate>(
    `SELECT * FROM report_templates WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new HttpError(404, 'TEMPLATE_NOT_FOUND', 'Report template not found');
  }

  return result.rows[0];
}

export async function updateTemplate(
  id: string,
  data: {
    name?: string;
    description?: string;
    promptTemplate?: string;
    targetTableId?: string | null;
    configJson?: object;
  }
): Promise<ReportTemplate> {
  await getTemplateById(id);

  if (data.targetTableId) {
    await getTableById(data.targetTableId);
  }

  const sets: string[] = [];
  const values: any[] = [];
  let i = 1;

  if (data.name !== undefined) {
    sets.push(`name = $${i++}`);
    values.push(data.name);
  }
  if (data.description !== undefined) {
    sets.push(`description = $${i++}`);
    values.push(data.description);
  }
  if (data.promptTemplate !== undefined) {
    sets.push(`prompt_template = $${i++}`);
    values.push(data.promptTemplate);
  }
  if (data.targetTableId !== undefined) {
    sets.push(`target_table_id = $${i++}`);
    values.push(data.targetTableId);
  }
  if (data.configJson !== undefined) {
    sets.push(`config_json = $${i++}`);
    values.push(JSON.stringify(data.configJson));
  }

  if (sets.length === 0) {
    return getTemplateById(id);
  }

  sets.push(`updated_at = NOW()`);
  values.push(id);

  const result = await query<ReportTemplate>(
    `UPDATE report_templates SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );

  return result.rows[0];
}

export async function deleteTemplate(id: string): Promise<void> {
  const result = await query(
    `DELETE FROM report_templates WHERE id = $1`,
    [id]
  );

  if (result.rowCount === 0) {
    throw new HttpError(404, 'TEMPLATE_NOT_FOUND', 'Report template not found');
  }
}

export async function createGeneratedReport(data: {
  templateId: string;
  userCin?: string;
  content?: object;
  status?: ReportStatus;
}): Promise<GeneratedReport> {
  await getTemplateById(data.templateId);

  const result = await query<GeneratedReport>(
    `INSERT INTO generated_reports (template_id, user_cin, content, status)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [
      data.templateId,
      data.userCin || null,
      data.content ? JSON.stringify(data.content) : null,
      data.status || 'generated',
    ]
  );

  return result.rows[0];
}

export async function listGeneratedReports(options?: {
  templateId?: string;
  userCin?: string;
  status?: string;
}): Promise<GeneratedReport[]> {
  const conditions: string[] = [];
  const values: any[] = [];
  let i = 1;

  if (options?.templateId) {
    conditions.push(`template_id = $${i++}`);
    values.push(options.templateId);
  }
  if (options?.userCin) {
    conditions.push(`user_cin = $${i++}`);
    values.push(options.userCin);
  }
  if (options?.status) {
    conditions.push(`status = $${i++}`);
    values.push(options.status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query<GeneratedReport>(
    `SELECT * FROM generated_reports ${where} ORDER BY created_at DESC`,
    values
  );

  return result.rows;
}

export async function getGeneratedReportById(id: string): Promise<GeneratedReport> {
  const result = await query<GeneratedReport>(
    `SELECT * FROM generated_reports WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new HttpError(404, 'REPORT_NOT_FOUND', 'Generated report not found');
  }

  return result.rows[0];
}

export function fillPlaceholders(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? String(data[key]) : match;
  });
}

export function extractPlaceholders(template: string): string[] {
  const matches = template.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, '')))];
}

export async function previewFilledTemplate(
  templateId: string,
  sampleData: Record<string, any>
): Promise<{ filledTemplate: string; placeholders: string[]; missing: string[] }> {
  const template = await getTemplateById(templateId);
  const placeholders = extractPlaceholders(template.prompt_template);
  const missing = placeholders.filter((p) => !(p in sampleData));
  const filledTemplate = fillPlaceholders(template.prompt_template, sampleData);

  return { filledTemplate, placeholders, missing };
}
