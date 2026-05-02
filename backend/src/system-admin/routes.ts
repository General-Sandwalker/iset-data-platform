import { Router } from 'express';
import { z } from 'zod';
import { validate, uuidParam } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { sendSuccess, sendCreated } from '../middleware/response.js';
import { logActivity } from '../middleware/activity-logger.js';
import {
  getAllSettings, getSettingByKey, upsertSetting, deleteSetting,
  listAcademicYears, getAcademicYearById, createAcademicYear, updateAcademicYear, deleteAcademicYear,
  listActivityLogs,
} from './service.js';

const router = Router();
router.use(authenticate);

const requireAdmin = authorize('super_admin', 'admin');

const upsertSettingSchema = z.object({
  value: z.any(),
});

const createAcademicYearSchema = z.object({
  year: z.string().min(1).max(9),
  startDate: z.string(),
  endDate: z.string(),
  isCurrent: z.boolean().optional(),
});

const updateAcademicYearSchema = z.object({
  year: z.string().min(1).max(9).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isCurrent: z.boolean().optional(),
});

const listLogsQuery = z.object({
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
});

router.get('/settings', async (req, res, next) => {
  try {
    const settings = await getAllSettings();
    sendSuccess(res, settings);
  } catch (err) { next(err); }
});

router.get('/settings/:key', async (req, res, next) => {
  try {
    const setting = await getSettingByKey(req.params.key);
    sendSuccess(res, setting);
  } catch (err) { next(err); }
});

router.put('/settings/:key', requireAdmin, validate({ body: upsertSettingSchema }), async (req, res, next) => {
  try {
    const setting = await upsertSetting(req.params.key, req.body.value, req.user!.id);
    await logActivity({ userId: req.user!.id, action: 'UPDATE_SETTING', ipAddress: req.ip, metadata: { key: req.params.key } });
    sendSuccess(res, setting);
  } catch (err) { next(err); }
});

router.delete('/settings/:key', requireAdmin, async (req, res, next) => {
  try {
    await deleteSetting(req.params.key);
    await logActivity({ userId: req.user!.id, action: 'DELETE_SETTING', ipAddress: req.ip, metadata: { key: req.params.key } });
    sendSuccess(res, { message: 'Setting deleted' });
  } catch (err) { next(err); }
});

router.get('/academic-years', async (req, res, next) => {
  try {
    const years = await listAcademicYears();
    sendSuccess(res, years);
  } catch (err) { next(err); }
});

router.get('/academic-years/:id', validate({ params: uuidParam }), async (req, res, next) => {
  try {
    const year = await getAcademicYearById(req.params.id);
    sendSuccess(res, year);
  } catch (err) { next(err); }
});

router.post('/academic-years', requireAdmin, validate({ body: createAcademicYearSchema }), async (req, res, next) => {
  try {
    const year = await createAcademicYear({
      year: req.body.year,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      isCurrent: req.body.isCurrent,
    });
    await logActivity({ userId: req.user!.id, action: 'CREATE_ACADEMIC_YEAR', ipAddress: req.ip });
    sendCreated(res, year);
  } catch (err) { next(err); }
});

router.patch('/academic-years/:id', requireAdmin, validate({ params: uuidParam, body: updateAcademicYearSchema }), async (req, res, next) => {
  try {
    const year = await updateAcademicYear(req.params.id, {
      year: req.body.year,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      isCurrent: req.body.isCurrent,
    });
    await logActivity({ userId: req.user!.id, action: 'UPDATE_ACADEMIC_YEAR', ipAddress: req.ip });
    sendSuccess(res, year);
  } catch (err) { next(err); }
});

router.delete('/academic-years/:id', requireAdmin, validate({ params: uuidParam }), async (req, res, next) => {
  try {
    await deleteAcademicYear(req.params.id);
    await logActivity({ userId: req.user!.id, action: 'DELETE_ACADEMIC_YEAR', ipAddress: req.ip });
    sendSuccess(res, { message: 'Academic year deleted' });
  } catch (err) { next(err); }
});

router.get('/activity-logs', requireAdmin, validate({ query: listLogsQuery }), async (req, res, next) => {
  try {
    const result = await listActivityLogs(req.query as any);
    sendSuccess(res, result.logs, { page: (req.query as any).page, limit: (req.query as any).limit, total: result.total });
  } catch (err) { next(err); }
});

export default router;
