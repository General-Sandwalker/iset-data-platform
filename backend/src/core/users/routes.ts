import { Router } from 'express';
import { z } from 'zod';
import { validate, uuidParam } from '../../middleware/validation.js';
import { authenticate } from '../../middleware/auth.js';
import { requireAdmin } from '../../middleware/rbac.js';
import { sendSuccess, sendCreated, paginatedResponse } from '../../middleware/response.js';
import { logActivity } from '../../middleware/activity-logger.js';
import { createUser, listUsers, getUserById, updateUser, deleteUser } from './service.js';

const router = Router();

const createUserSchema = z.object({
  cin: z.string().optional(),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['admin', 'responsable_observatoire', 'enseignant', 'etudiant', 'alumni']),
  phone: z.string().optional(),
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  role: z.enum(['admin', 'responsable_observatoire', 'enseignant', 'etudiant', 'alumni']).optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  role: z.string().optional(),
  search: z.string().optional(),
});

router.use(authenticate);

router.post(
  '/',
  requireAdmin,
  validate({ body: createUserSchema }),
  async (req, res, next) => {
    try {
      const user = await createUser(req.body, req.user!.id);
      await logActivity({ userId: req.user!.id, action: 'CREATE_USER', ipAddress: req.ip });
      sendCreated(res, user);
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/',
  requireAdmin,
  validate({ query: listQuerySchema }),
  async (req, res, next) => {
    try {
      const { page, limit, role, search } = req.query as any;
      const result = await listUsers({ page, limit, role, search });
      paginatedResponse(res, result.users, { page: page || 1, limit: limit || 20, total: result.total });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/:id',
  requireAdmin,
  validate({ params: uuidParam }),
  async (req, res, next) => {
    try {
      const user = await getUserById(req.params.id);
      sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/:id',
  requireAdmin,
  validate({ params: uuidParam, body: updateUserSchema }),
  async (req, res, next) => {
    try {
      const user = await updateUser(req.params.id, req.body);
      await logActivity({ userId: req.user!.id, action: 'UPDATE_USER', ipAddress: req.ip });
      sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/:id',
  requireAdmin,
  validate({ params: uuidParam }),
  async (req, res, next) => {
    try {
      await deleteUser(req.params.id);
      await logActivity({ userId: req.user!.id, action: 'DELETE_USER', ipAddress: req.ip });
      sendSuccess(res, { message: 'User deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;