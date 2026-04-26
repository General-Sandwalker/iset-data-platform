import { Router } from 'express';
import { validate, uuidParam } from '../../middleware/validation.js';
import { authenticate } from '../../middleware/auth.js';
import { requireAdmin } from '../../middleware/rbac.js';
import { sendSuccess } from '../../middleware/response.js';
import { resetUserPassword } from './service.js';

const router = Router();

router.post(
  '/:id/reset-password',
  authenticate,
  requireAdmin,
  validate({ params: uuidParam }),
  async (req, res, next) => {
    try {
      const tempPassword = await resetUserPassword(req.params.id);
      sendSuccess(res, { tempPassword, message: 'Password reset successfully. Share this temporary password with the user.' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;