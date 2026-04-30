import { Router } from 'express';
import { z } from 'zod';
import { validate, uuidParam } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin, requireManager } from '../middleware/rbac.js';
import { sendSuccess, sendCreated, paginatedResponse } from '../middleware/response.js';
import { logActivity } from '../middleware/activity-logger.js';
import { aiLimiter } from '../middleware/rate-limit.js';
import {
  createTemplate,
  listTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  createGeneratedReport,
  listGeneratedReports,
  getGeneratedReportById,
  previewFilledTemplate,
  generateReport,
  reportStatuses,
} from './service.js';

const router = Router();

const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  promptTemplate: z.string().min(1),
  targetTableId: z.string().uuid().optional(),
  configJson: z.record(z.any()).optional(),
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  promptTemplate: z.string().min(1).optional(),
  targetTableId: z.string().uuid().nullable().optional(),
  configJson: z.record(z.any()).optional(),
});

const createReportSchema = z.object({
  templateId: z.string().uuid(),
  userCin: z.string().max(50).optional(),
  content: z.record(z.any()).optional(),
  status: z.enum(reportStatuses as unknown as [string, ...string[]]).default('generated'),
});

const previewSchema = z.object({
  sampleData: z.record(z.any()),
});

const generateReportSchema = z.object({
  templateId: z.string().uuid(),
  cin: z.string().min(1).max(50),
  filters: z.record(z.any()).optional(),
});

const listReportsQuerySchema = z.object({
  templateId: z.string().uuid().optional(),
  userCin: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

router.use(authenticate);

router.get('/templates', requireManager, async (req, res, next) => {
  try {
    const templates = await listTemplates({
      createdBy: req.query.createdBy as string | undefined,
    });
    sendSuccess(res, templates);
  } catch (err) { next(err); }
});

router.post('/templates', requireAdmin, validate({ body: createTemplateSchema }), async (req, res, next) => {
  try {
    const template = await createTemplate({
      name: req.body.name,
      description: req.body.description,
      promptTemplate: req.body.promptTemplate,
      targetTableId: req.body.targetTableId,
      configJson: req.body.configJson,
      createdBy: req.user!.id,
    });
    await logActivity({
      userId: req.user!.id,
      action: 'CREATE_REPORT_TEMPLATE',
      entityType: 'report_template',
      entityId: template.id,
      ipAddress: req.ip,
    });
    sendCreated(res, template);
  } catch (err) { next(err); }
});

router.get('/templates/:id', requireManager, validate({ params: uuidParam }), async (req, res, next) => {
  try {
    const template = await getTemplateById(req.params.id);
    sendSuccess(res, template);
  } catch (err) { next(err); }
});

router.patch('/templates/:id', requireAdmin, validate({ params: uuidParam, body: updateTemplateSchema }), async (req, res, next) => {
  try {
    const template = await updateTemplate(req.params.id, {
      name: req.body.name,
      description: req.body.description,
      promptTemplate: req.body.promptTemplate,
      targetTableId: req.body.targetTableId,
      configJson: req.body.configJson,
    });
    await logActivity({
      userId: req.user!.id,
      action: 'UPDATE_REPORT_TEMPLATE',
      entityType: 'report_template',
      entityId: template.id,
      ipAddress: req.ip,
    });
    sendSuccess(res, template);
  } catch (err) { next(err); }
});

router.delete('/templates/:id', requireAdmin, validate({ params: uuidParam }), async (req, res, next) => {
  try {
    await deleteTemplate(req.params.id);
    await logActivity({
      userId: req.user!.id,
      action: 'DELETE_REPORT_TEMPLATE',
      entityType: 'report_template',
      entityId: req.params.id,
      ipAddress: req.ip,
    });
    sendSuccess(res, { message: 'Report template deleted' });
  } catch (err) { next(err); }
});

router.post('/templates/:id/preview', requireManager, validate({ params: uuidParam, body: previewSchema }), async (req, res, next) => {
  try {
    const result = await previewFilledTemplate(req.params.id, req.body.sampleData);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.get('/reports', requireManager, validate({ query: listReportsQuerySchema }), async (req, res, next) => {
  try {
    const q = req.query as unknown as z.infer<typeof listReportsQuerySchema>;
    const reports = await listGeneratedReports({
      templateId: q.templateId,
      userCin: q.userCin,
      status: q.status,
    });
    const page = q.page;
    const limit = q.limit;
    const start = (page - 1) * limit;
    const paged = reports.slice(start, start + limit);
    paginatedResponse(res, paged, { page, limit, total: paged.length });
  } catch (err) { next(err); }
});

router.post('/reports', requireManager, validate({ body: createReportSchema }), async (req, res, next) => {
  try {
    const report = await createGeneratedReport({
      templateId: req.body.templateId,
      userCin: req.body.userCin,
      content: req.body.content,
      status: req.body.status,
    });
    await logActivity({
      userId: req.user!.id,
      action: 'CREATE_GENERATED_REPORT',
      entityType: 'generated_report',
      entityId: report.id,
      ipAddress: req.ip,
    });
    sendCreated(res, report);
  } catch (err) { next(err); }
});

router.get('/reports/:id', requireManager, validate({ params: uuidParam }), async (req, res, next) => {
  try {
    const report = await getGeneratedReportById(req.params.id);
    sendSuccess(res, report);
  } catch (err) { next(err); }
});

router.post('/reports/generate', requireManager, aiLimiter, validate({ body: generateReportSchema }), async (req, res, next) => {
  try {
    const report = await generateReport({
      templateId: req.body.templateId,
      cin: req.body.cin,
      filters: req.body.filters,
    });
    await logActivity({
      userId: req.user!.id,
      action: 'AI_GENERATE_REPORT',
      entityType: 'generated_report',
      entityId: report.id,
      ipAddress: req.ip,
      metadata: { templateId: req.body.templateId, cin: req.body.cin },
    });
    sendCreated(res, report);
  } catch (err) { next(err); }
});

export default router;
