import { Router } from 'express';
import { z } from 'zod';
import { validate, uuidParam } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';
import { sendSuccess, sendCreated } from '../middleware/response.js';
import { logActivity } from '../middleware/activity-logger.js';
import {
  createChart, listCharts, getChartById, updateChart, deleteChart,
  executeChartQuery, executeRawQuery,
  createDashboard, listDashboards, getDashboardWithCharts, updateDashboard,
  deleteDashboard, addChartToDashboard, updateDashboardChart, removeChartFromDashboard,
  publishDashboard, unpublishDashboard, getDashboardBySlug,
  chartTypes,
  type ChartType,
} from './service.js';

const router = Router();

const createChartSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  chartType: z.enum(chartTypes as unknown as [string, ...string[]]),
  tableId: z.string().uuid(),
  sqlQuery: z.string().min(1),
  configJson: z.record(z.any()).optional(),
  isPublic: z.boolean().default(false),
});

const updateChartSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  chartType: z.enum(chartTypes as unknown as [string, ...string[]]).optional(),
  sqlQuery: z.string().min(1).optional(),
  configJson: z.record(z.any()).optional(),
  isPublic: z.boolean().optional(),
});

const executeRawSchema = z.object({
  tableId: z.string().uuid(),
  sqlQuery: z.string().min(1),
  limit: z.number().int().min(1).max(1000).default(100),
});

const createDashboardSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  layoutJson: z.record(z.any()).optional(),
  isPublic: z.boolean().default(false),
});

const updateDashboardSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  layoutJson: z.record(z.any()).optional(),
  isPublic: z.boolean().optional(),
});

const addChartSchema = z.object({
  chartId: z.string().uuid(),
  positionX: z.number().int().default(0),
  positionY: z.number().int().default(0),
  width: z.number().int().min(1).max(12).default(6),
  height: z.number().int().min(1).max(12).default(4),
  configJson: z.record(z.any()).optional(),
});

const updateDashboardChartSchema = z.object({
  positionX: z.number().int().optional(),
  positionY: z.number().int().optional(),
  width: z.number().int().min(1).max(12).optional(),
  height: z.number().int().min(1).max(12).optional(),
  configJson: z.record(z.any()).optional(),
});

router.use(authenticate);

// --- Charts ---
router.get('/charts', async (req, res, next) => {
  try {
    const charts = await listCharts({
      tableId: req.query.tableId as string | undefined,
      isPublic: req.query.isPublic === 'true' ? true : req.query.isPublic === 'false' ? false : undefined,
      createdBy: req.query.createdBy as string | undefined,
    });
    sendSuccess(res, charts);
  } catch (err) { next(err); }
});

router.post('/charts', requireAdmin, validate({ body: createChartSchema }), async (req, res, next) => {
  try {
    const chart = await createChart({
      title: req.body.title,
      description: req.body.description,
      chartType: req.body.chartType as ChartType,
      tableId: req.body.tableId,
      sqlQuery: req.body.sqlQuery,
      configJson: req.body.configJson,
      isPublic: req.body.isPublic,
      createdBy: req.user!.id,
    });
    await logActivity({ userId: req.user!.id, action: 'CREATE_CHART', entityType: 'chart', entityId: chart.id, ipAddress: req.ip });
    sendCreated(res, chart);
  } catch (err) { next(err); }
});

router.get('/charts/:id', validate({ params: uuidParam }), async (req, res, next) => {
  try {
    const chart = await getChartById(req.params.id);
    sendSuccess(res, chart);
  } catch (err) { next(err); }
});

router.patch('/charts/:id', requireAdmin, validate({ params: uuidParam, body: updateChartSchema }), async (req, res, next) => {
  try {
    const chart = await updateChart(req.params.id, {
      title: req.body.title,
      description: req.body.description,
      chartType: req.body.chartType as ChartType | undefined,
      sqlQuery: req.body.sqlQuery,
      configJson: req.body.configJson,
      isPublic: req.body.isPublic,
    });
    sendSuccess(res, chart);
  } catch (err) { next(err); }
});

router.delete('/charts/:id', requireAdmin, validate({ params: uuidParam }), async (req, res, next) => {
  try {
    await deleteChart(req.params.id);
    await logActivity({ userId: req.user!.id, action: 'DELETE_CHART', entityType: 'chart', entityId: req.params.id, ipAddress: req.ip });
    sendSuccess(res, { message: 'Chart deleted' });
  } catch (err) { next(err); }
});

router.post('/charts/:id/execute', validate({ params: uuidParam }), async (req, res, next) => {
  try {
    const limit = typeof req.query.limit === 'string' ? Math.min(parseInt(req.query.limit) || 500, 10000) : 500;
    const result = await executeChartQuery(req.params.id, limit);
    await logActivity({ userId: req.user!.id, action: 'EXECUTE_CHART', entityType: 'chart', entityId: req.params.id, ipAddress: req.ip });
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.post('/charts/execute-raw', requireAdmin, validate({ body: executeRawSchema }), async (req, res, next) => {
  try {
    const result = await executeRawQuery(req.body.tableId, req.body.sqlQuery, req.body.limit);
    await logActivity({ userId: req.user!.id, action: 'EXECUTE_RAW_SQL', entityType: 'chart', entityId: req.body.tableId, ipAddress: req.ip });
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

// --- Dashboards ---
router.get('/dashboards', async (req, res, next) => {
  try {
    const dashboards = await listDashboards({
      isPublic: req.query.isPublic === 'true' ? true : req.query.isPublic === 'false' ? false : undefined,
      createdBy: req.query.createdBy as string | undefined,
    });
    sendSuccess(res, dashboards);
  } catch (err) { next(err); }
});

router.post('/dashboards', requireAdmin, validate({ body: createDashboardSchema }), async (req, res, next) => {
  try {
    const dashboard = await createDashboard({
      title: req.body.title,
      description: req.body.description,
      layoutJson: req.body.layoutJson,
      isPublic: req.body.isPublic,
      createdBy: req.user!.id,
    });
    await logActivity({ userId: req.user!.id, action: 'CREATE_DASHBOARD', entityType: 'dashboard', entityId: dashboard.id, ipAddress: req.ip });
    sendCreated(res, dashboard);
  } catch (err) { next(err); }
});

router.get('/dashboards/:id', validate({ params: uuidParam }), async (req, res, next) => {
  try {
    const dashboard = await getDashboardWithCharts(req.params.id);
    sendSuccess(res, dashboard);
  } catch (err) { next(err); }
});

router.patch('/dashboards/:id', requireAdmin, validate({ params: uuidParam, body: updateDashboardSchema }), async (req, res, next) => {
  try {
    const dashboard = await updateDashboard(req.params.id, {
      title: req.body.title,
      description: req.body.description,
      layoutJson: req.body.layoutJson,
      isPublic: req.body.isPublic,
    });
    sendSuccess(res, dashboard);
  } catch (err) { next(err); }
});

router.delete('/dashboards/:id', requireAdmin, validate({ params: uuidParam }), async (req, res, next) => {
  try {
    await deleteDashboard(req.params.id);
    await logActivity({ userId: req.user!.id, action: 'DELETE_DASHBOARD', entityType: 'dashboard', entityId: req.params.id, ipAddress: req.ip });
    sendSuccess(res, { message: 'Dashboard deleted' });
  } catch (err) { next(err); }
});

router.post('/dashboards/:id/charts', requireAdmin, validate({ params: uuidParam, body: addChartSchema }), async (req, res, next) => {
  try {
    const dashboardChart = await addChartToDashboard({
      dashboardId: req.params.id,
      chartId: req.body.chartId,
      positionX: req.body.positionX,
      positionY: req.body.positionY,
      width: req.body.width,
      height: req.body.height,
      configJson: req.body.configJson,
    });
    sendCreated(res, dashboardChart);
  } catch (err) { next(err); }
});

router.patch('/dashboards/charts/:chartId', requireAdmin, validate({ params: z.object({ chartId: uuidParam.shape.id }), body: updateDashboardChartSchema }), async (req, res, next) => {
  try {
    const dashboardChart = await updateDashboardChart(req.params.chartId, req.body);
    sendSuccess(res, dashboardChart);
  } catch (err) { next(err); }
});

router.delete('/dashboards/charts/:chartId', requireAdmin, validate({ params: z.object({ chartId: uuidParam.shape.id }) }), async (req, res, next) => {
  try {
    await removeChartFromDashboard(req.params.chartId);
    sendSuccess(res, { message: 'Chart removed from dashboard' });
  } catch (err) { next(err); }
});

router.post('/dashboards/:id/publish', requireAdmin, validate({ params: uuidParam }), async (req, res, next) => {
  try {
    const dashboard = await publishDashboard(req.params.id);
    await logActivity({ userId: req.user!.id, action: 'PUBLISH_DASHBOARD', entityType: 'dashboard', entityId: req.params.id, ipAddress: req.ip });
    sendSuccess(res, dashboard);
  } catch (err) { next(err); }
});

router.post('/dashboards/:id/unpublish', requireAdmin, validate({ params: uuidParam }), async (req, res, next) => {
  try {
    const dashboard = await unpublishDashboard(req.params.id);
    sendSuccess(res, dashboard);
  } catch (err) { next(err); }
});

export { router as vizRoutes };

export const publicVizRoutes = Router();

publicVizRoutes.get('/dashboards/:slug', async (req, res, next) => {
  try {
    const dashboard = await getDashboardBySlug(req.params.slug);
    const chartsWithResults = await Promise.all(
      dashboard.charts.map(async (dc) => {
        try {
          const result = await executeChartQuery(dc.chart_id, 100);
          return { ...dc, data: result.rows, totalCount: result.totalCount };
        } catch {
          return { ...dc, data: [], totalCount: 0, error: 'Failed to execute query' };
        }
      })
    );
    sendSuccess(res, { ...dashboard, charts: chartsWithResults });
  } catch (err) { next(err); }
});
