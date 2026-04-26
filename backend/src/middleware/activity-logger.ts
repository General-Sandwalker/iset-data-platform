import { Request, Response, NextFunction } from 'express';
import { query } from '../config/database.js';

interface LogEntry {
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: object;
}

export async function logActivity(entry: LogEntry): Promise<void> {
  try {
    await query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        entry.userId || null,
        entry.action,
        entry.entityType || null,
        entry.entityId || null,
        entry.ipAddress || null,
        entry.userAgent || null,
        JSON.stringify(entry.metadata || {}),
      ]
    );
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

export function activityLogger(action: string, entityType?: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (req.user) {
      await logActivity({
        userId: req.user.id,
        action,
        entityType,
        entityId: req.params.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }
    next();
  };
}