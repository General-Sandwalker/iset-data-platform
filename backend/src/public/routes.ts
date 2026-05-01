import { Router } from 'express';
import { query } from '../config/database.js';
import { sendSuccess } from '../middleware/response.js';

export const publicLandingRoutes = Router();

publicLandingRoutes.get('/stats', async (_req, res, next) => {
  try {
    const [usersRes, tablesRes, surveysRes, dashboardsRes] = await Promise.all([
      query('SELECT COUNT(*)::int AS count FROM users'),
      query('SELECT COUNT(*)::int AS count FROM dynamic_tables'),
      query('SELECT COUNT(*)::int AS count FROM surveys WHERE status = $1', ['published']),
      query('SELECT COUNT(*)::int AS count FROM dashboards WHERE is_published = true'),
    ]);

    const stats = {
      students: usersRes.rows[0]?.count || 0,
      tables: tablesRes.rows[0]?.count || 0,
      surveys: surveysRes.rows[0]?.count || 0,
      dashboards: dashboardsRes.rows[0]?.count || 0,
    };

    sendSuccess(res, stats);
  } catch (err) { next(err); }
});

publicLandingRoutes.get('/dashboards', async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT id, title, description, slug FROM dashboards WHERE is_published = true ORDER BY updated_at DESC LIMIT 6`
    );
    sendSuccess(res, result.rows);
  } catch (err) { next(err); }
});
