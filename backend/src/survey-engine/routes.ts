import { Router } from 'express';
import { z } from 'zod';
import { validate, uuidParam } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';
import { sendSuccess, sendCreated, paginatedResponse } from '../middleware/response.js';
import { logActivity } from '../middleware/activity-logger.js';
import {
  createSurvey,
  listSurveys,
  getSurveyById,
  getSurveyWithQuestions,
  updateSurvey,
  deleteSurvey,
  addQuestion,
  listQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  linkSurveyToTable,
  autoCreateFieldsForSurvey,
  publishSurvey,
  closeSurvey,
  getSurveyBySlug,
  submitSurveyResponse,
  getSurveyStats,
  questionTypes,
  surveyStatuses,
  accessTypes,
} from './service.js';

const router = Router();

const createSurveySchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  targetTableId: z.string().uuid().optional(),
  accessType: z.enum(accessTypes as unknown as [string, ...string[]]).default('public'),
  allowMultipleResponses: z.boolean().default(false),
});

const updateSurveySchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  targetTableId: z.string().uuid().nullable().optional(),
  accessType: z.enum(accessTypes as unknown as [string, ...string[]]).optional(),
  allowMultipleResponses: z.boolean().optional(),
});

const addQuestionSchema = z.object({
  type: z.enum(questionTypes as unknown as [string, ...string[]]),
  label: z.string().min(1).max(1000),
  configJson: z.record(z.any()).optional(),
  isRequired: z.boolean().default(false),
  orderIndex: z.number().int().optional(),
  targetFieldId: z.string().uuid().optional(),
  autoCreateField: z.boolean().default(false),
});

const updateQuestionSchema = z.object({
  type: z.enum(questionTypes as unknown as [string, ...string[]]).optional(),
  label: z.string().min(1).max(1000).optional(),
  configJson: z.record(z.any()).optional(),
  isRequired: z.boolean().optional(),
  orderIndex: z.number().int().optional(),
  targetFieldId: z.string().uuid().nullable().optional(),
});

const reorderSchema = z.object({
  questions: z.array(z.object({
    id: z.string().uuid(),
    orderIndex: z.number().int().min(0),
  })).min(1),
});

const linkTableSchema = z.object({
  tableId: z.string().uuid(),
});

const submitSchema = z.object({
  responses: z.record(z.any()),
});

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const page = req.query.page ? parseInt(String(req.query.page)) : 1;
    const limit = req.query.limit ? Math.min(100, parseInt(String(req.query.limit))) : 20;
    const status = req.query.status as string | undefined;
    const result = await listSurveys({
      status: status as any,
      createdBy: req.query.createdBy as string | undefined,
    }, { page, limit });
    paginatedResponse(res, result.data, { page: result.page, limit: result.limit, total: result.total });
  } catch (err) { next(err); }
});

router.post('/', requireAdmin, validate({ body: createSurveySchema }), async (req, res, next) => {
  try {
    const survey = await createSurvey({
      title: req.body.title,
      description: req.body.description,
      targetTableId: req.body.targetTableId,
      accessType: req.body.accessType,
      allowMultipleResponses: req.body.allowMultipleResponses,
      createdBy: req.user!.id,
    });
    await logActivity({ userId: req.user!.id, action: 'CREATE_SURVEY', entityType: 'survey', entityId: survey.id, ipAddress: req.ip });
    sendCreated(res, survey);
  } catch (err) { next(err); }
});

router.get('/:id', validate({ params: uuidParam }), async (req, res, next) => {
  try {
    const survey = await getSurveyWithQuestions(req.params.id);
    sendSuccess(res, survey);
  } catch (err) { next(err); }
});

router.patch('/:id', requireAdmin, validate({ params: uuidParam, body: updateSurveySchema }), async (req, res, next) => {
  try {
    const survey = await updateSurvey(req.params.id, {
      title: req.body.title,
      description: req.body.description,
      targetTableId: req.body.targetTableId,
      accessType: req.body.accessType,
      allowMultipleResponses: req.body.allowMultipleResponses,
    });
    sendSuccess(res, survey);
  } catch (err) { next(err); }
});

router.delete('/:id', requireAdmin, validate({ params: uuidParam }), async (req, res, next) => {
  try {
    await deleteSurvey(req.params.id);
    await logActivity({ userId: req.user!.id, action: 'DELETE_SURVEY', entityType: 'survey', entityId: req.params.id, ipAddress: req.ip });
    sendSuccess(res, { message: 'Survey deleted' });
  } catch (err) { next(err); }
});

router.get('/:id/questions', validate({ params: uuidParam }), async (req, res, next) => {
  try {
    const questions = await listQuestions(req.params.id);
    sendSuccess(res, questions);
  } catch (err) { next(err); }
});

router.post('/:id/questions', requireAdmin, validate({ params: uuidParam, body: addQuestionSchema }), async (req, res, next) => {
  try {
    const question = await addQuestion({
      surveyId: req.params.id,
      type: req.body.type,
      label: req.body.label,
      configJson: req.body.configJson,
      isRequired: req.body.isRequired,
      orderIndex: req.body.orderIndex,
      targetFieldId: req.body.targetFieldId,
      autoCreateField: req.body.autoCreateField,
    });
    await logActivity({ userId: req.user!.id, action: 'ADD_SURVEY_QUESTION', entityType: 'survey_question', entityId: question.id, ipAddress: req.ip });
    sendCreated(res, question);
  } catch (err) { next(err); }
});

router.patch('/questions/:id', requireAdmin, validate({ params: uuidParam, body: updateQuestionSchema }), async (req, res, next) => {
  try {
    const question = await updateQuestion(req.params.id, req.body);
    sendSuccess(res, question);
  } catch (err) { next(err); }
});

router.delete('/questions/:id', requireAdmin, validate({ params: uuidParam }), async (req, res, next) => {
  try {
    await deleteQuestion(req.params.id);
    sendSuccess(res, { message: 'Question deleted' });
  } catch (err) { next(err); }
});

router.post('/:id/reorder', requireAdmin, validate({ params: uuidParam, body: reorderSchema }), async (req, res, next) => {
  try {
    const questions = await reorderQuestions(req.params.id, req.body.questions);
    sendSuccess(res, questions);
  } catch (err) { next(err); }
});

router.post('/:id/link-table', requireAdmin, validate({ params: uuidParam, body: linkTableSchema }), async (req, res, next) => {
  try {
    const survey = await linkSurveyToTable(req.params.id, req.body.tableId);
    await logActivity({ userId: req.user!.id, action: 'LINK_SURVEY_TABLE', entityType: 'survey', entityId: req.params.id, ipAddress: req.ip });
    sendSuccess(res, survey);
  } catch (err) { next(err); }
});

router.post('/:id/auto-create-fields', requireAdmin, validate({ params: uuidParam }), async (req, res, next) => {
  try {
    const survey = await autoCreateFieldsForSurvey(req.params.id);
    await logActivity({ userId: req.user!.id, action: 'AUTO_CREATE_SURVEY_FIELDS', entityType: 'survey', entityId: req.params.id, ipAddress: req.ip });
    sendSuccess(res, survey);
  } catch (err) { next(err); }
});

router.post('/:id/publish', requireAdmin, validate({ params: uuidParam }), async (req, res, next) => {
  try {
    const survey = await publishSurvey(req.params.id);
    await logActivity({ userId: req.user!.id, action: 'PUBLISH_SURVEY', entityType: 'survey', entityId: req.params.id, ipAddress: req.ip });
    sendSuccess(res, survey);
  } catch (err) { next(err); }
});

router.post('/:id/close', requireAdmin, validate({ params: uuidParam }), async (req, res, next) => {
  try {
    const survey = await closeSurvey(req.params.id);
    await logActivity({ userId: req.user!.id, action: 'CLOSE_SURVEY', entityType: 'survey', entityId: req.params.id, ipAddress: req.ip });
    sendSuccess(res, survey);
  } catch (err) { next(err); }
});

router.get('/:id/stats', requireAdmin, validate({ params: uuidParam }), async (req, res, next) => {
  try {
    const stats = await getSurveyStats(req.params.id);
    sendSuccess(res, stats);
  } catch (err) { next(err); }
});

export default router;
