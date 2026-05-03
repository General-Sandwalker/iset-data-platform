import { query, getClient } from '../config/database.js';
import { HttpError } from '../middleware/auth.js';
import { addField, getTableById, listFields, listData, insertData, assertValidIdentifier, type FieldType } from '../schema-engine/service.js';

export const questionTypes = [
  'multiple_choice',
  'text',
  'rating',
  'dropdown',
  'checkbox',
  'date',
  'number',
] as const;
export type QuestionType = (typeof questionTypes)[number];

export const surveyStatuses = ['draft', 'published', 'closed'] as const;
export type SurveyStatus = (typeof surveyStatuses)[number];

export const accessTypes = ['public', 'authenticated'] as const;
export type AccessType = (typeof accessTypes)[number];

export interface Survey {
  id: string;
  title: string;
  description: string | null;
  target_table_id: string | null;
  status: SurveyStatus;
  access_type: AccessType;
  published_slug: string | null;
  allow_multiple_responses: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SurveyQuestion {
  id: string;
  survey_id: string;
  type: QuestionType;
  label: string;
  config_json: object;
  order_index: number;
  is_required: boolean;
  target_field_id: string | null;
}

export interface SurveyWithQuestions extends Survey {
  questions: SurveyQuestion[];
}

function questionTypeToFieldType(qType: QuestionType): FieldType {
  const mapping: Record<QuestionType, FieldType> = {
    multiple_choice: 'select',
    text: 'text',
    rating: 'number',
    dropdown: 'select',
    checkbox: 'multiselect',
    date: 'date',
    number: 'decimal',
  };
  return mapping[qType];
}

export async function createSurvey(data: {
  title: string;
  description?: string;
  targetTableId?: string;
  accessType?: AccessType;
  allowMultipleResponses?: boolean;
  createdBy: string;
}): Promise<Survey> {
  if (data.targetTableId) {
    await getTableById(data.targetTableId);
  }

  const result = await query<Survey>(
    `INSERT INTO surveys (title, description, target_table_id, access_type, allow_multiple_responses, created_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [
      data.title,
      data.description || null,
      data.targetTableId || null,
      data.accessType || 'public',
      data.allowMultipleResponses || false,
      data.createdBy,
    ]
  );
  return result.rows[0];
}

export async function listSurveys(filters?: {
  status?: SurveyStatus;
  createdBy?: string;
}, params?: { page?: number; limit?: number }): Promise<{ data: Survey[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, params?.page || 1);
  const limit = Math.min(100, Math.max(1, params?.limit || 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const values: any[] = [];
  let i = 1;

  if (filters?.status) {
    conditions.push(`status = $${i++}`);
    values.push(filters.status);
  }
  if (filters?.createdBy) {
    conditions.push(`created_by = $${i++}`);
    values.push(filters.createdBy);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM surveys ${where}`,
    values
  );
  const total = parseInt(countResult.rows[0].count);

  const result = await query<Survey>(
    `SELECT * FROM surveys ${where} ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i++}`,
    [...values, limit, offset]
  );
  return { data: result.rows, total, page, limit };
}

export async function getSurveyById(id: string): Promise<Survey> {
  const result = await query<Survey>('SELECT * FROM surveys WHERE id = $1', [id]);
  if (result.rows.length === 0) {
    throw new HttpError(404, 'SURVEY_NOT_FOUND', 'Survey not found');
  }
  return result.rows[0];
}

export async function getSurveyWithQuestions(id: string): Promise<SurveyWithQuestions> {
  const survey = await getSurveyById(id);
  const questions = await listQuestions(id);
  return { ...survey, questions };
}

export async function updateSurvey(
  id: string,
  data: {
    title?: string;
    description?: string;
    targetTableId?: string;
    accessType?: AccessType;
    allowMultipleResponses?: boolean;
  }
): Promise<Survey> {
  await getSurveyById(id);

  if (data.targetTableId) {
    await getTableById(data.targetTableId);
  }

  const updates: string[] = [];
  const values: any[] = [];
  let i = 1;

  if (data.title !== undefined) {
    updates.push(`title = $${i++}`);
    values.push(data.title);
  }
  if (data.description !== undefined) {
    updates.push(`description = $${i++}`);
    values.push(data.description);
  }
  if (data.targetTableId !== undefined) {
    updates.push(`target_table_id = $${i++}`);
    values.push(data.targetTableId);
  }
  if (data.accessType !== undefined) {
    updates.push(`access_type = $${i++}`);
    values.push(data.accessType);
  }
  if (data.allowMultipleResponses !== undefined) {
    updates.push(`allow_multiple_responses = $${i++}`);
    values.push(data.allowMultipleResponses);
  }

  if (updates.length === 0) {
    return getSurveyById(id);
  }

  updates.push(`updated_at = NOW()`);
  values.push(id);
  const result = await query<Survey>(
    `UPDATE surveys SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return result.rows[0];
}

export async function deleteSurvey(id: string): Promise<void> {
  const survey = await getSurveyById(id);
  if (survey.status === 'published') {
    throw new HttpError(400, 'SURVEY_PUBLISHED', 'Cannot delete a published survey. Close it first.');
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM survey_questions WHERE survey_id = $1', [id]);
    await client.query('DELETE FROM surveys WHERE id = $1', [id]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function addQuestion(data: {
  surveyId: string;
  type: QuestionType;
  label: string;
  configJson?: object;
  isRequired?: boolean;
  orderIndex?: number;
  targetFieldId?: string;
  autoCreateField?: boolean;
}): Promise<SurveyQuestion> {
  const survey = await getSurveyById(data.surveyId);

  if (survey.status !== 'draft') {
    throw new HttpError(400, 'SURVEY_NOT_DRAFT', 'Can only add questions to draft surveys');
  }

  let targetFieldId: string | null = data.targetFieldId || null;

  if (data.autoCreateField && survey.target_table_id && !targetFieldId) {
    const fieldName = `q_${data.label.toLowerCase().replace(/[^a-z0-9_]/g, '_').substring(0, 80)}`;
    const fieldType = questionTypeToFieldType(data.type);
    const displayName = data.label;

    const configJson = data.configJson as Record<string, unknown> | undefined;
    const fieldConfig: Record<string, unknown> = {};
    if (configJson?.options && Array.isArray(configJson.options)) {
      fieldConfig.options = configJson.options;
    }
    if (data.type === 'rating' && configJson?.max) {
      fieldConfig.max = configJson.max;
    }

    const field = await addField({
      tableId: survey.target_table_id,
      name: fieldName,
      displayName,
      fieldType,
      configJson: fieldConfig,
      isRequired: data.isRequired || false,
      orderIndex: data.orderIndex || 0,
    });
    targetFieldId = field.id;
  }

  if (data.orderIndex === undefined || data.orderIndex === null) {
    const maxResult = await query<{ max_order: string | null }>(
      'SELECT MAX(order_index) as max_order FROM survey_questions WHERE survey_id = $1',
      [data.surveyId]
    );
    const maxOrder = maxResult.rows[0]?.max_order;
    data.orderIndex = maxOrder ? parseInt(maxOrder) + 1 : 0;
  }

  const result = await query<SurveyQuestion>(
    `INSERT INTO survey_questions (survey_id, type, label, config_json, order_index, is_required, target_field_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      data.surveyId,
      data.type,
      data.label,
      JSON.stringify(data.configJson || {}),
      data.orderIndex,
      data.isRequired || false,
      targetFieldId,
    ]
  );
  return result.rows[0];
}

export async function listQuestions(surveyId: string): Promise<SurveyQuestion[]> {
  await getSurveyById(surveyId);
  const result = await query<SurveyQuestion>(
    'SELECT * FROM survey_questions WHERE survey_id = $1 ORDER BY order_index',
    [surveyId]
  );
  return result.rows;
}

export async function getQuestionById(id: string): Promise<SurveyQuestion> {
  const result = await query<SurveyQuestion>(
    'SELECT * FROM survey_questions WHERE id = $1',
    [id]
  );
  if (result.rows.length === 0) {
    throw new HttpError(404, 'QUESTION_NOT_FOUND', 'Survey question not found');
  }
  return result.rows[0];
}

export async function updateQuestion(
  id: string,
  data: {
    type?: QuestionType;
    label?: string;
    configJson?: object;
    isRequired?: boolean;
    orderIndex?: number;
    targetFieldId?: string;
  }
): Promise<SurveyQuestion> {
  const question = await getQuestionById(id);
  const survey = await getSurveyById(question.survey_id);

  if (survey.status !== 'draft') {
    throw new HttpError(400, 'SURVEY_NOT_DRAFT', 'Can only update questions on draft surveys');
  }

  const updates: string[] = [];
  const values: any[] = [];
  let i = 1;

  if (data.type !== undefined) {
    updates.push(`type = $${i++}`);
    values.push(data.type);
  }
  if (data.label !== undefined) {
    updates.push(`label = $${i++}`);
    values.push(data.label);
  }
  if (data.configJson !== undefined) {
    updates.push(`config_json = $${i++}`);
    values.push(JSON.stringify(data.configJson));
  }
  if (data.isRequired !== undefined) {
    updates.push(`is_required = $${i++}`);
    values.push(data.isRequired);
  }
  if (data.orderIndex !== undefined) {
    updates.push(`order_index = $${i++}`);
    values.push(data.orderIndex);
  }
  if (data.targetFieldId !== undefined) {
    updates.push(`target_field_id = $${i++}`);
    values.push(data.targetFieldId);
  }

  if (updates.length === 0) {
    return question;
  }

  values.push(id);
  const result = await query<SurveyQuestion>(
    `UPDATE survey_questions SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return result.rows[0];
}

export async function deleteQuestion(id: string): Promise<void> {
  const question = await getQuestionById(id);
  const survey = await getSurveyById(question.survey_id);

  if (survey.status !== 'draft') {
    throw new HttpError(400, 'SURVEY_NOT_DRAFT', 'Can only delete questions from draft surveys');
  }

  await query('DELETE FROM survey_questions WHERE id = $1', [id]);
}

export async function reorderQuestions(
  surveyId: string,
  questionOrder: { id: string; orderIndex: number }[]
): Promise<SurveyQuestion[]> {
  const survey = await getSurveyById(surveyId);

  if (survey.status !== 'draft') {
    throw new HttpError(400, 'SURVEY_NOT_DRAFT', 'Can only reorder questions on draft surveys');
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    for (const item of questionOrder) {
      await client.query(
        'UPDATE survey_questions SET order_index = $1 WHERE id = $2 AND survey_id = $3',
        [item.orderIndex, item.id, surveyId]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return listQuestions(surveyId);
}

export async function linkSurveyToTable(
  surveyId: string,
  tableId: string
): Promise<Survey> {
  const survey = await getSurveyById(surveyId);
  const table = await getTableById(tableId);

  if (survey.status !== 'draft') {
    throw new HttpError(400, 'SURVEY_NOT_DRAFT', 'Can only link tables to draft surveys');
  }

  if (survey.target_table_id) {
    throw new HttpError(400, 'TABLE_ALREADY_LINKED', 'Survey already has a target table. Remove it first.');
  }

  const result = await query<Survey>(
    'UPDATE surveys SET target_table_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [tableId, surveyId]
  );
  return result.rows[0];
}

export async function autoCreateFieldsForSurvey(
  surveyId: string
): Promise<Survey> {
  const survey = await getSurveyById(surveyId);

  if (!survey.target_table_id) {
    throw new HttpError(400, 'NO_TARGET_TABLE', 'Survey must have a target table to auto-create fields');
  }

  if (survey.status !== 'draft') {
    throw new HttpError(400, 'SURVEY_NOT_DRAFT', 'Can only modify draft surveys');
  }

  const questions = await listQuestions(surveyId);
  const existingFields = await listFields(survey.target_table_id);
  const existingFieldNames = new Set(existingFields.map(f => f.name));

  for (const q of questions) {
    if (q.target_field_id) continue;

    const fieldName = `q_${q.label.toLowerCase().replace(/[^a-z0-9_]/g, '_').substring(0, 80)}`;
    let finalName = fieldName;
    let suffix = 1;
    while (existingFieldNames.has(finalName)) {
      finalName = `${fieldName}_${suffix++}`;
    }
    existingFieldNames.add(finalName);

    const fieldType = questionTypeToFieldType(q.type);
    const qConfig = q.config_json as Record<string, unknown>;
    const fieldConfig: Record<string, unknown> = {};
    if (qConfig?.options && Array.isArray(qConfig.options)) {
      fieldConfig.options = qConfig.options;
    }

    const field = await addField({
      tableId: survey.target_table_id,
      name: finalName,
      displayName: q.label,
      fieldType,
      configJson: fieldConfig,
      isRequired: q.is_required,
      orderIndex: q.order_index,
    });

    await query(
      'UPDATE survey_questions SET target_field_id = $1 WHERE id = $2',
      [field.id, q.id]
    );
  }

  return getSurveyById(surveyId);
}

export async function publishSurvey(id: string): Promise<Survey> {
  const survey = await getSurveyById(id);

  if (survey.status === 'published') {
    throw new HttpError(400, 'ALREADY_PUBLISHED', 'Survey is already published');
  }
  if (survey.status === 'closed') {
    throw new HttpError(400, 'SURVEY_CLOSED', 'Cannot republish a closed survey');
  }

  if (!survey.target_table_id) {
    throw new HttpError(400, 'NO_TARGET_TABLE', 'Survey must have a target table before publishing');
  }

  const questions = await listQuestions(id);
  if (questions.length === 0) {
    throw new HttpError(400, 'NO_QUESTIONS', 'Survey must have at least one question before publishing');
  }

  const unpublishedQuestions = questions.filter(q => !q.target_field_id);
  if (unpublishedQuestions.length > 0) {
    throw new HttpError(400, 'UNMAPPED_QUESTIONS', `${unpublishedQuestions.length} question(s) are not mapped to target table fields. Run auto-create-fields first.`);
  }

  const slug = await query('SELECT gen_random_uuid() as slug');
  const publishedSlug = slug.rows[0].slug;

  const result = await query<Survey>(
    'UPDATE surveys SET status = $1, published_slug = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
    ['published', publishedSlug, id]
  );
  return result.rows[0];
}

export async function closeSurvey(id: string): Promise<Survey> {
  const survey = await getSurveyById(id);

  if (survey.status !== 'published') {
    throw new HttpError(400, 'NOT_PUBLISHED', 'Can only close a published survey');
  }

  const result = await query<Survey>(
    'UPDATE surveys SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    ['closed', id]
  );
  return result.rows[0];
}

export async function getSurveyBySlug(slug: string): Promise<SurveyWithQuestions> {
  const result = await query<Survey>(
    'SELECT * FROM surveys WHERE published_slug = $1',
    [slug]
  );
  if (result.rows.length === 0) {
    throw new HttpError(404, 'SURVEY_NOT_FOUND', 'Survey not found');
  }
  const survey = result.rows[0];
  const questions = await listQuestions(survey.id);
  return { ...survey, questions };
}

export interface SurveySubmission {
  [fieldName: string]: any;
}

export async function submitSurveyResponse(
  slug: string,
  responses: SurveySubmission,
  userCin?: string
): Promise<any> {
  const survey = await getSurveyBySlug(slug);

  if (survey.status !== 'published') {
    throw new HttpError(400, 'SURVEY_NOT_ACTIVE', 'This survey is not accepting responses');
  }

  if (survey.access_type === 'authenticated' && !userCin) {
    throw new HttpError(401, 'AUTH_REQUIRED', 'This survey requires authentication');
  }

  if (!survey.target_table_id) {
    throw new HttpError(500, 'NO_TARGET_TABLE', 'Survey has no target table configured');
  }

  const targetTable = await getTableById(survey.target_table_id);
  assertValidIdentifier(targetTable.name);
  const fields = await listFields(survey.target_table_id);
  const questions = await listQuestions(survey.id);

  const fieldMap = new Map(fields.map(f => [f.id, f]));

  const mappedData: Record<string, any> = {};
  const errors: string[] = [];

  for (const question of questions) {
    if (!question.target_field_id) continue;

    const field = fieldMap.get(question.target_field_id);
    if (!field) continue;

    const value = responses[question.id];

    if (question.is_required && (value === undefined || value === null || value === '')) {
      errors.push(`Question "${question.label}" is required`);
      continue;
    }

    if (value !== undefined && value !== null && value !== '') {
      const qConfig = question.config_json as Record<string, unknown>;

      if ((question.type === 'multiple_choice' || question.type === 'dropdown') && qConfig?.options) {
        const options = qConfig.options as string[];
        if (!options.includes(String(value))) {
          errors.push(`Invalid option for "${question.label}"`);
          continue;
        }
      }

      if (question.type === 'checkbox' && qConfig?.options && Array.isArray(value)) {
        const options = qConfig.options as string[];
        for (const v of value) {
          if (!options.includes(String(v))) {
            errors.push(`Invalid option "${v}" for "${question.label}"`);
            continue;
          }
        }
      }

      if (question.type === 'rating') {
        const min = (qConfig?.min as number) || 1;
        const max = (qConfig?.max as number) || 5;
        const numVal = Number(value);
        if (isNaN(numVal) || numVal < min || numVal > max) {
          errors.push(`Rating for "${question.label}" must be between ${min} and ${max}`);
          continue;
        }
      }

      if (question.type === 'date') {
        const dateVal = new Date(value);
        if (isNaN(dateVal.getTime())) {
          errors.push(`Invalid date for "${question.label}"`);
          continue;
        }
      }

      if (question.type === 'number') {
        if (isNaN(Number(value))) {
          errors.push(`Invalid number for "${question.label}"`);
          continue;
        }
      }

      if (question.type === 'checkbox' && Array.isArray(value)) {
        mappedData[field.name] = JSON.stringify(value);
      } else if (question.type === 'number' || question.type === 'rating') {
        mappedData[field.name] = Number(value);
      } else if (question.type === 'date') {
        mappedData[field.name] = value;
      } else {
        mappedData[field.name] = String(value);
      }
    }
  }

  if (errors.length > 0) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Response validation failed', errors);
  }

  if (!survey.allow_multiple_responses && userCin && targetTable.is_user_linked) {
    const existing = await query(
      `SELECT id FROM ${targetTable.name} WHERE cin = $1`,
      [userCin]
    );
    if (existing.rows.length > 0) {
      throw new HttpError(409, 'DUPLICATE_RESPONSE', 'You have already submitted a response to this survey');
    }
  }

  if (userCin && targetTable.is_user_linked) {
    mappedData.cin = userCin;
  }

  const record = await insertData(survey.target_table_id, mappedData, userCin ? undefined : undefined);
  return record;
}

export async function getSurveyStats(id: string): Promise<any> {
  const survey = await getSurveyById(id);

  if (!survey.target_table_id) {
    throw new HttpError(400, 'NO_TARGET_TABLE', 'Survey has no target table');
  }

  const targetTable = await getTableById(survey.target_table_id);
  assertValidIdentifier(targetTable.name);
  const questions = await listQuestions(id);
  const fields = await listFields(survey.target_table_id);
  const fieldMap = new Map(fields.map(f => [f.id, f]));

  const totalResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM ${targetTable.name}`
  );
  const totalResponses = parseInt(totalResult.rows[0].count);

  const stats: any = {
    surveyId: survey.id,
    title: survey.title,
    status: survey.status,
    totalResponses,
    questions: [],
  };

  for (const question of questions) {
    if (!question.target_field_id) continue;

  const field = fieldMap.get(question.target_field_id);
  if (!field) continue;
  assertValidIdentifier(field.name);

  const questionStat: any = {
      questionId: question.id,
      label: question.label,
      type: question.type,
    };

    if (question.type === 'multiple_choice' || question.type === 'dropdown') {
      const qConfig = question.config_json as Record<string, unknown>;
      const options = (qConfig?.options as string[]) || [];

      const optionCounts: Record<string, number> = {};
      for (const opt of options) {
        const result = await query<{ count: string }>(
          `SELECT COUNT(*) as count FROM ${targetTable.name} WHERE ${field.name} = $1`,
          [opt]
        );
        optionCounts[opt] = parseInt(result.rows[0].count);
      }

      questionStat.distribution = optionCounts;
    } else if (question.type === 'checkbox') {
      const qConfig = question.config_json as Record<string, unknown>;
      const options = (qConfig?.options as string[]) || [];

      const optionCounts: Record<string, number> = {};
      for (const opt of options) {
        const result = await query<{ count: string }>(
          `SELECT COUNT(*) as count FROM ${targetTable.name} WHERE ${field.name} LIKE $1`,
          [`%${opt}%`]
        );
        optionCounts[opt] = parseInt(result.rows[0].count);
      }

      questionStat.distribution = optionCounts;
    } else if (question.type === 'rating' || question.type === 'number') {
      const result = await query<{ avg: string | null; min: string | null; max: string | null }>(
        `SELECT AVG(${field.name}) as avg, MIN(${field.name}) as min, MAX(${field.name}) as max FROM ${targetTable.name} WHERE ${field.name} IS NOT NULL`
      );
      questionStat.average = result.rows[0].avg ? parseFloat(parseFloat(result.rows[0].avg).toFixed(2)) : null;
      questionStat.min = result.rows[0].min ? parseFloat(result.rows[0].min) : null;
      questionStat.max = result.rows[0].max ? parseFloat(result.rows[0].max) : null;
    } else if (question.type === 'text') {
      const result = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM ${targetTable.name} WHERE ${field.name} IS NOT NULL AND ${field.name} != ''`
      );
      questionStat.responseCount = parseInt(result.rows[0].count);
    } else if (question.type === 'date') {
      const result = await query<{ earliest: string | null; latest: string | null }>(
        `SELECT MIN(${field.name}) as earliest, MAX(${field.name}) as latest FROM ${targetTable.name} WHERE ${field.name} IS NOT NULL`
      );
      questionStat.earliest = result.rows[0].earliest;
      questionStat.latest = result.rows[0].latest;
    }

    stats.questions.push(questionStat);
  }

  return stats;
}
