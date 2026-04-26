import { Router } from 'express';
import { z } from 'zod';
import { validate, uuidParam } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin, requireSuperAdmin } from '../middleware/rbac.js';
import { sendSuccess, sendCreated } from '../middleware/response.js';
import { logActivity } from '../middleware/activity-logger.js';
import {
  createTable, listTables, getTableById, updateTable, deleteTable,
  addField, listFields, getFieldById, updateField, deleteField,
  fieldTypes,
} from './service.js';

const router = Router();

const createTableSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-zA-Z][a-z0-9_]*$/),
  displayName: z.string().min(1).max(255),
  description: z.string().optional(),
  isUserLinked: z.boolean().default(false),
});

const updateTableSchema = z.object({
  displayName: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
});

const addFieldSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-zA-Z][a-z0-9_]*$/),
  displayName: z.string().min(1).max(255),
  fieldType: z.enum(fieldTypes as unknown as [string, ...string[]]),
  configJson: z.record(z.any()).optional(),
  isRequired: z.boolean().default(false),
  orderIndex: z.number().int().default(0),
});

const updateFieldSchema = z.object({
  displayName: z.string().min(1).max(255).optional(),
  configJson: z.record(z.any()).optional(),
  isRequired: z.boolean().optional(),
  orderIndex: z.number().int().optional(),
});

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const tables = await listTables();
    sendSuccess(res, tables);
  } catch (err) { next(err); }
});

router.post('/', requireAdmin, validate({ body: createTableSchema }), async (req, res, next) => {
  try {
    const table = await createTable({ ...req.body, createdBy: req.user!.id });
    await logActivity({ userId: req.user!.id, action: 'CREATE_TABLE', entityType: 'dynamic_table', ipAddress: req.ip });
    sendCreated(res, table);
  } catch (err) { next(err); }
});

router.get('/:id', validate({ params: uuidParam }), async (req, res, next) => {
  try {
    const table = await getTableById(req.params.id);
    const fields = await listFields(req.params.id);
    sendSuccess(res, { ...table, fields });
  } catch (err) { next(err); }
});

router.patch('/:id', requireAdmin, validate({ params: uuidParam, body: updateTableSchema }), async (req, res, next) => {
  try {
    const table = await updateTable(req.params.id, req.body);
    sendSuccess(res, table);
  } catch (err) { next(err); }
});

router.delete('/:id', requireSuperAdmin, validate({ params: uuidParam }), async (req, res, next) => {
  try {
    await deleteTable(req.params.id);
    await logActivity({ userId: req.user!.id, action: 'DELETE_TABLE', entityType: 'dynamic_table', ipAddress: req.ip });
    sendSuccess(res, { message: 'Table deleted' });
  } catch (err) { next(err); }
});

router.get('/:id/fields', validate({ params: uuidParam }), async (req, res, next) => {
  try {
    const fields = await listFields(req.params.id);
    sendSuccess(res, fields);
  } catch (err) { next(err); }
});

router.post('/:id/fields', requireAdmin, validate({ params: uuidParam, body: addFieldSchema }), async (req, res, next) => {
  try {
    const field = await addField({ ...req.body, tableId: req.params.id });
    sendCreated(res, field);
  } catch (err) { next(err); }
});

router.patch('/fields/:id', requireAdmin, validate({ params: uuidParam, body: updateFieldSchema }), async (req, res, next) => {
  try {
    const field = await updateField(req.params.id, req.body);
    sendSuccess(res, field);
  } catch (err) { next(err); }
});

router.delete('/fields/:id', requireAdmin, validate({ params: uuidParam }), async (req, res, next) => {
  try {
    await deleteField(req.params.id);
    sendSuccess(res, { message: 'Field deleted' });
  } catch (err) { next(err); }
});

export default router;