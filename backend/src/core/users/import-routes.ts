import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validation.js';
import { authenticate } from '../../middleware/auth.js';
import { requireAdmin } from '../../middleware/rbac.js';
import { sendSuccess } from '../../middleware/response.js';
import { logActivity } from '../../middleware/activity-logger.js';
import { createUser } from './service.js';

const router = Router();

const importUserSchema = z.object({
  cin: z.string().optional(),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['admin', 'responsable_observatoire', 'enseignant', 'etudiant', 'alumni']),
  phone: z.string().optional(),
});

router.post(
  '/',
  authenticate,
  requireAdmin,
  async (req, res, next) => {
    try {
      const { users } = req.body as { users: z.infer<typeof importUserSchema>[] };

      if (!Array.isArray(users) || users.length === 0) {
        const { sendError } = await import('../../middleware/response.js');
        return sendError(res, 'INVALID_INPUT', 'users must be a non-empty array', 400);
      }

      const results = { imported: 0, failed: 0, errors: [] as string[] };

      for (let i = 0; i < users.length; i++) {
        try {
          const parsed = importUserSchema.parse(users[i]);
          await createUser(
            {
              email: parsed.email,
              firstName: parsed.firstName,
              lastName: parsed.lastName,
              role: parsed.role,
              cin: parsed.cin,
              phone: parsed.phone,
            },
            req.user!.id
          );
          results.imported++;
        } catch (err: any) {
          results.failed++;
          results.errors.push(`Row ${i + 1}: ${err.message || 'Validation failed'}`);
        }
      }

      await logActivity({ userId: req.user!.id, action: 'BULK_IMPORT_USERS', ipAddress: req.ip });
      sendSuccess(res, results);
    } catch (err) {
      next(err);
    }
  }
);

export default router;