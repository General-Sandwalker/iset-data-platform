import { Request, Response, NextFunction } from 'express';
import { HttpError } from './auth.js';

type Role = 'super_admin' | 'admin' | 'responsable_observatoire' | 'enseignant' | 'etudiant' | 'alumni';

export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new HttpError(401, 'UNAUTHORIZED', 'Authentication required'));
      return;
    }

    if (!allowedRoles.includes(req.user.role as Role)) {
      next(new HttpError(403, 'FORBIDDEN', 'Insufficient permissions'));
      return;
    }

    next();
  };
}

export const requireSuperAdmin = authorize('super_admin');
export const requireAdmin = authorize('super_admin', 'admin');
export const requireManager = authorize('super_admin', 'admin', 'responsable_observatoire');
export const requireAuthenticated = authorize('super_admin', 'admin', 'responsable_observatoire', 'enseignant', 'etudiant', 'alumni');