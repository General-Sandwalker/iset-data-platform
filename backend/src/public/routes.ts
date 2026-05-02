import { Router } from 'express';
import { query } from '../config/database.js';
import { sendSuccess } from '../middleware/response.js';
import { authenticate } from '../middleware/auth.js';
import { assertValidIdentifier } from '../schema-engine/service.js';

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

publicLandingRoutes.get('/surveys', async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT id, title, description, access_type, published_slug, allow_multiple_responses
       FROM surveys WHERE status = 'published' ORDER BY updated_at DESC`
    );
    sendSuccess(res, result.rows);
  } catch (err) { next(err); }
});

publicLandingRoutes.get('/student-stats', authenticate, async (req, res, next) => {
  try {
    const userCin = req.user!.cin;
    const [surveysRes, dashboardsRes] = await Promise.all([
      query('SELECT COUNT(*)::int AS count FROM surveys WHERE status = $1', ['published']),
      query('SELECT COUNT(*)::int AS count FROM dashboards WHERE is_published = true'),
    ]);

    let myRecordsCount = 0;
    if (userCin) {
      const tablesRes = await query('SELECT name FROM dynamic_tables WHERE is_user_linked = true');
      for (const table of tablesRes.rows) {
        assertValidIdentifier(table.name);
        const countRes = await query(`SELECT COUNT(*)::int AS count FROM ${table.name} WHERE cin = $1`, [userCin]);
        myRecordsCount += countRes.rows[0]?.count || 0;
      }
    }

    sendSuccess(res, {
      availableSurveys: surveysRes.rows[0]?.count || 0,
      publishedDashboards: dashboardsRes.rows[0]?.count || 0,
      myRecords: myRecordsCount,
    });
  } catch (err) { next(err); }
});

publicLandingRoutes.get('/teacher-stats', authenticate, async (req, res, next) => {
  try {
    const [surveysRes, dashboardsRes, recordsRes] = await Promise.all([
      query('SELECT COUNT(*)::int AS count FROM surveys WHERE status = $1', ['published']),
      query('SELECT COUNT(*)::int AS count FROM dashboards WHERE is_published = true'),
      query('SELECT COUNT(*)::int AS count FROM dynamic_tables WHERE is_user_linked = true'),
    ]);

    sendSuccess(res, {
      availableSurveys: surveysRes.rows[0]?.count || 0,
      publishedDashboards: dashboardsRes.rows[0]?.count || 0,
      dataTables: recordsRes.rows[0]?.count || 0,
    });
  } catch (err) { next(err); }
});

publicLandingRoutes.get('/alumni-stats', authenticate, async (req, res, next) => {
  try {
    const userCin = req.user!.cin;
    const [surveysRes, dashboardsRes] = await Promise.all([
      query('SELECT COUNT(*)::int AS count FROM surveys WHERE status = $1', ['published']),
      query('SELECT COUNT(*)::int AS count FROM dashboards WHERE is_published = true'),
    ]);

    let myRecordsCount = 0;
    if (userCin) {
      const tablesRes = await query('SELECT name FROM dynamic_tables WHERE is_user_linked = true');
      for (const table of tablesRes.rows) {
        assertValidIdentifier(table.name);
        const countRes = await query(`SELECT COUNT(*)::int AS count FROM ${table.name} WHERE cin = $1`, [userCin]);
        myRecordsCount += countRes.rows[0]?.count || 0;
      }
    }

    sendSuccess(res, {
      availableSurveys: surveysRes.rows[0]?.count || 0,
      publishedDashboards: dashboardsRes.rows[0]?.count || 0,
      myRecords: myRecordsCount,
    });
  } catch (err) { next(err); }
});

publicLandingRoutes.get('/observatoire-stats', authenticate, async (req, res, next) => {
  try {
    const [studentsRes, alumniRes, surveysRes, dashboardsRes, tablesRes, reportsRes] = await Promise.all([
      query("SELECT COUNT(*)::int AS count FROM users WHERE role = 'etudiant'"),
      query("SELECT COUNT(*)::int AS count FROM users WHERE role = 'alumni'"),
      query('SELECT COUNT(*)::int AS count FROM surveys'),
      query('SELECT COUNT(*)::int AS count FROM dashboards WHERE is_published = true'),
      query('SELECT COUNT(*)::int AS count FROM dynamic_tables WHERE is_user_linked = true'),
      query('SELECT COUNT(*)::int AS count FROM report_templates'),
    ]);

    sendSuccess(res, {
      students: studentsRes.rows[0]?.count || 0,
      alumni: alumniRes.rows[0]?.count || 0,
      surveys: surveysRes.rows[0]?.count || 0,
      dashboards: dashboardsRes.rows[0]?.count || 0,
      dataTables: tablesRes.rows[0]?.count || 0,
      reports: reportsRes.rows[0]?.count || 0,
    });
  } catch (err) { next(err); }
});
