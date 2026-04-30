import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin, requireManager } from '../middleware/rbac.js';
import { sendSuccess, paginatedResponse } from '../middleware/response.js';
import { logActivity } from '../middleware/activity-logger.js';
import {
  getEnrollments,
  getEnrollmentsSummary,
  getSuccessRates,
  getTeacherStats,
  getFormationStats,
  getEventStats,
  getAcademicTableMappings,
  setAcademicTableMapping,
} from './service.js';

const router = Router();

const academicFilterSchema = z.object({
  annee: z.string().optional(),
  filiere: z.string().optional(),
  niveau: z.string().optional(),
  genre: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

type AcademicFilter = z.infer<typeof academicFilterSchema>;

const teacherFilterSchema = z.object({
  annee: z.string().optional(),
  genre: z.string().optional(),
});

type TeacherFilter = z.infer<typeof teacherFilterSchema>;

const formationFilterSchema = z.object({
  annee: z.string().optional(),
});

type FormationFilter = z.infer<typeof formationFilterSchema>;

const eventFilterSchema = z.object({
  annee: z.string().optional(),
});

type EventFilter = z.infer<typeof eventFilterSchema>;

const mappingSchema = z.object({
  key: z.enum([
    'analytics_students_table',
    'analytics_teachers_table',
    'analytics_formations_table',
    'analytics_events_table',
  ]),
  tableId: z.string().uuid(),
});

router.use(authenticate);

router.get('/academic/enrollments', requireManager, validate({ query: academicFilterSchema }), async (req, res, next) => {
  try {
    const q = req.query as unknown as AcademicFilter;
    const result = await getEnrollments(q);
    paginatedResponse(res, result.data, result.meta);
  } catch (err) { next(err); }
});

router.get('/academic/enrollments/summary', requireManager, validate({ query: academicFilterSchema }), async (req, res, next) => {
  try {
    const q = req.query as unknown as AcademicFilter;
    const result = await getEnrollmentsSummary(q);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.get('/academic/success-rates', requireManager, validate({ query: academicFilterSchema }), async (req, res, next) => {
  try {
    const q = req.query as unknown as AcademicFilter;
    const result = await getSuccessRates(q);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.get('/academic/teachers', requireManager, validate({ query: teacherFilterSchema }), async (req, res, next) => {
  try {
    const q = req.query as unknown as TeacherFilter;
    const result = await getTeacherStats(q);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.get('/academic/formations', requireManager, validate({ query: formationFilterSchema }), async (req, res, next) => {
  try {
    const q = req.query as unknown as FormationFilter;
    const result = await getFormationStats(q);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.get('/academic/events', requireManager, validate({ query: eventFilterSchema }), async (req, res, next) => {
  try {
    const q = req.query as unknown as EventFilter;
    const result = await getEventStats(q);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.get('/academic/mappings', requireAdmin, async (_req, res, next) => {
  try {
    const mappings = await getAcademicTableMappings();
    sendSuccess(res, mappings);
  } catch (err) { next(err); }
});

router.post('/academic/mappings', requireAdmin, validate({ body: mappingSchema }), async (req, res, next) => {
  try {
    await setAcademicTableMapping(req.body.key, req.body.tableId);
    await logActivity({
      userId: req.user!.id,
      action: 'UPDATE_ANALYTICS_MAPPING',
      entityType: 'system_setting',
      ipAddress: req.ip,
      metadata: { key: req.body.key, tableId: req.body.tableId },
    });
    sendSuccess(res, { key: req.body.key, tableId: req.body.tableId });
  } catch (err) { next(err); }
});

export default router;
