import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validation.js';
import { authenticate, HttpError } from '../../middleware/auth.js';
import { requireAuthenticated } from '../../middleware/rbac.js';
import { authLimiter } from '../../middleware/rate-limit.js';
import { sendSuccess, sendCreated } from '../../middleware/response.js';
import { logActivity } from '../../middleware/activity-logger.js';
import { login, getMe, resetUserPassword, changePassword } from './service.js';

const router = Router();

const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

router.post(
  '/login',
  authLimiter,
  validate({ body: loginSchema }),
  async (req, res, next) => {
    try {
      const { identifier, password } = req.body;
      const result = await login(identifier, password);
      await logActivity({ userId: result.user.id, action: 'LOGIN', ipAddress: req.ip, userAgent: req.headers['user-agent'] });
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/me',
  authenticate,
  requireAuthenticated,
  async (req, res, next) => {
    try {
      const user = await getMe(req.user!.id);
      sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/change-password',
  authenticate,
  requireAuthenticated,
  validate({ body: changePasswordSchema }),
  async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;
      await changePassword(req.user!.id, currentPassword, newPassword);
      await logActivity({ userId: req.user!.id, action: 'CHANGE_PASSWORD', ipAddress: req.ip });
      sendSuccess(res, { message: 'Password changed successfully' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;