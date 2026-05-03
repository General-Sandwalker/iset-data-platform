import { query, getClient } from '../config/database.js';
import { HttpError } from '../middleware/auth.js';
import { getTableById, listFields, assertValidIdentifier } from '../schema-engine/service.js';
import { Parser } from 'node-sql-parser';

const MAX_CHART_LIMIT = 10000;

const parser = new Parser();

function astValidateSql(sql: string): void {
  let ast;
  try {
    ast = parser.astify(sql);
  } catch {
    throw new HttpError(400, 'INVALID_SQL', 'Query could not be parsed. Check syntax.');
  }

  const statements = Array.isArray(ast) ? ast : [ast];
  if (statements.length !== 1) {
    throw new HttpError(400, 'INVALID_SQL', 'Only single statements are allowed');
  }

  const stmt = statements[0];
  if (stmt.type !== 'select') {
    throw new HttpError(400, 'INVALID_SQL', 'Only SELECT queries are allowed');
  }
}

export const chartTypes = ['bar', 'line', 'pie', 'donut', 'area', 'scatter', 'table', 'metric', 'horizontal_bar', 'radar'] as const;
export type ChartType = typeof chartTypes[number];

export interface Chart {
  id: string;
  title: string;
  description: string | null;
  chart_type: ChartType;
  table_id: string;
  sql_query: string;
  config_json: object;
  is_public: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChartWithTableName extends Chart {
  table_name: string;
  table_display_name: string;
}

export async function createChart(data: {
  title: string;
  description?: string;
  chartType: ChartType;
  tableId: string;
  sqlQuery: string;
  configJson?: object;
  isPublic?: boolean;
  createdBy: string;
}): Promise<Chart> {
  await getTableById(data.tableId);

  const validChartTypes = new Set<string>(chartTypes);
  if (!validChartTypes.has(data.chartType)) {
    throw new HttpError(400, 'INVALID_CHART_TYPE', `Chart type must be one of: ${chartTypes.join(', ')}`);
  }

  await validateSqlQuery(data.tableId, data.sqlQuery);

  const result = await query<Chart>(
    `INSERT INTO charts (title, description, chart_type, table_id, sql_query, config_json, is_public, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [data.title, data.description || null, data.chartType, data.tableId, data.sqlQuery, JSON.stringify(data.configJson || {}), data.isPublic || false, data.createdBy]
  );
  return result.rows[0];
}

export async function listCharts(filters?: { tableId?: string; isPublic?: boolean; createdBy?: string }, params?: { page?: number; limit?: number }): Promise<{ data: ChartWithTableName[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, params?.page || 1);
  const limit = Math.min(100, Math.max(1, params?.limit || 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const values: any[] = [];
  let i = 1;

  if (filters?.tableId) {
    conditions.push(`c.table_id = $${i++}`);
    values.push(filters.tableId);
  }
  if (filters?.isPublic !== undefined) {
    conditions.push(`c.is_public = $${i++}`);
    values.push(filters.isPublic);
  }
  if (filters?.createdBy) {
    conditions.push(`c.created_by = $${i++}`);
    values.push(filters.createdBy);
  }

  const whereSQL = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM charts c ${whereSQL}`,
    values
  );
  const total = parseInt(countResult.rows[0].count);

  const result = await query<ChartWithTableName>(
    `SELECT c.*, dt.name as table_name, dt.display_name as table_display_name
    FROM charts c
    JOIN dynamic_tables dt ON c.table_id = dt.id
    ${whereSQL}
    ORDER BY c.created_at DESC LIMIT $${i++} OFFSET $${i++}`,
    [...values, limit, offset]
  );
  return { data: result.rows, total, page, limit };
}

export async function getChartById(id: string): Promise<ChartWithTableName> {
  const result = await query<ChartWithTableName>(
    `SELECT c.*, dt.name as table_name, dt.display_name as table_display_name
     FROM charts c
     JOIN dynamic_tables dt ON c.table_id = dt.id
     WHERE c.id = $1`,
    [id]
  );
  if (result.rows.length === 0) {
    throw new HttpError(404, 'CHART_NOT_FOUND', 'Chart not found');
  }
  return result.rows[0];
}

export async function updateChart(id: string, data: {
  title?: string;
  description?: string;
  chartType?: ChartType;
  sqlQuery?: string;
  configJson?: object;
  isPublic?: boolean;
}): Promise<Chart> {
  const chart = await getChartById(id);

  const updates: string[] = [];
  const values: any[] = [];
  let i = 1;

  if (data.title !== undefined) { updates.push(`title = $${i++}`); values.push(data.title); }
  if (data.description !== undefined) { updates.push(`description = $${i++}`); values.push(data.description); }
  if (data.chartType !== undefined) {
    const validChartTypes = new Set<string>(chartTypes);
    if (!validChartTypes.has(data.chartType)) {
      throw new HttpError(400, 'INVALID_CHART_TYPE', `Chart type must be one of: ${chartTypes.join(', ')}`);
    }
    updates.push(`chart_type = $${i++}`); values.push(data.chartType);
  }
  if (data.sqlQuery !== undefined) {
    await validateSqlQuery(chart.table_id, data.sqlQuery);
    updates.push(`sql_query = $${i++}`); values.push(data.sqlQuery);
  }
  if (data.configJson !== undefined) { updates.push(`config_json = $${i++}`); values.push(JSON.stringify(data.configJson)); }
  if (data.isPublic !== undefined) { updates.push(`is_public = $${i++}`); values.push(data.isPublic); }

  if (updates.length === 0) {
    const base = await query<Chart>('SELECT * FROM charts WHERE id = $1', [id]);
    return base.rows[0];
  }

  updates.push(`updated_at = NOW()`);
  values.push(id);
  const result = await query<Chart>(
    `UPDATE charts SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return result.rows[0];
}

export async function deleteChart(id: string): Promise<void> {
  const result = await query('DELETE FROM charts WHERE id = $1', [id]);
  if (result.rowCount === 0) {
    throw new HttpError(404, 'CHART_NOT_FOUND', 'Chart not found');
  }
}

async function validateSqlQuery(tableId: string, sqlQuery: string): Promise<void> {
  const table = await getTableById(tableId);
  assertValidIdentifier(table.name);

  astValidateSql(sqlQuery);

  if (!sqlQuery.toLowerCase().includes(table.name.toLowerCase())) {
    throw new HttpError(400, 'INVALID_SQL', `Query must reference the table: ${table.name}`);
  }
}

export async function executeChartQuery(chartId: string, limit: number = 500): Promise<{ rows: Record<string, unknown>[]; totalCount: number }> {
  const chart = await getChartById(chartId);
  assertValidIdentifier(chart.table_name);

  astValidateSql(chart.sql_query);

  const safeLimit = Math.min(Math.max(1, limit), MAX_CHART_LIMIT);
  const client = await getClient();
  try {
    await client.query('BEGIN READ ONLY');
    await client.query('SET LOCAL statement_timeout = 10000');

    const countSQL = `SELECT COUNT(*) as cnt FROM (${chart.sql_query}) as subq`;
    const countResult = await client.query<{ cnt: string }>(countSQL);
    const totalCount = parseInt(countResult.rows[0].cnt);

    const limitedSQL = `${chart.sql_query} LIMIT $1`;
    const result = await client.query(limitedSQL, [safeLimit]);

    await client.query('COMMIT');
    return { rows: result.rows, totalCount };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function executeRawQuery(tableId: string, sqlQuery: string, limit: number = 100): Promise<{ rows: Record<string, unknown>[]; totalCount: number }> {
  await validateSqlQuery(tableId, sqlQuery);

  const safeLimit = Math.min(Math.max(1, limit), 1000);
  const client = await getClient();
  try {
    await client.query('BEGIN READ ONLY');
    await client.query('SET LOCAL statement_timeout = 10000');

    const countSQL = `SELECT COUNT(*) as cnt FROM (${sqlQuery}) as subq`;
    const countResult = await client.query<{ cnt: string }>(countSQL);
    const totalCount = parseInt(countResult.rows[0].cnt);

    const limitedSQL = `${sqlQuery} LIMIT $1`;
    const result = await client.query(limitedSQL, [safeLimit]);

    await client.query('COMMIT');
    return { rows: result.rows, totalCount };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export interface Dashboard {
  id: string;
  title: string;
  description: string | null;
  layout_json: object;
  is_public: boolean;
  published_slug: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardChart {
  id: string;
  dashboard_id: string;
  chart_id: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  config_json: object;
  created_at: string;
  chart?: ChartWithTableName;
}

export interface DashboardWithCharts extends Dashboard {
  charts: DashboardChart[];
}

export async function createDashboard(data: {
  title: string;
  description?: string;
  layoutJson?: object;
  isPublic?: boolean;
  createdBy: string;
}): Promise<Dashboard> {
  const result = await query<Dashboard>(
    `INSERT INTO dashboards (title, description, layout_json, is_public, created_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [data.title, data.description || null, JSON.stringify(data.layoutJson || []), data.isPublic || false, data.createdBy]
  );
  return result.rows[0];
}

export async function listDashboards(filters?: { isPublic?: boolean; createdBy?: string }, params?: { page?: number; limit?: number }): Promise<{ data: Dashboard[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, params?.page || 1);
  const limit = Math.min(100, Math.max(1, params?.limit || 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const values: any[] = [];
  let i = 1;

  if (filters?.isPublic !== undefined) {
    conditions.push(`is_public = $${i++}`);
    values.push(filters.isPublic);
  }
  if (filters?.createdBy) {
    conditions.push(`created_by = $${i++}`);
    values.push(filters.createdBy);
  }

  const whereSQL = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM dashboards ${whereSQL}`,
    values
  );
  const total = parseInt(countResult.rows[0].count);

  const result = await query<Dashboard>(
    `SELECT * FROM dashboards ${whereSQL} ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i++}`,
    [...values, limit, offset]
  );
  return { data: result.rows, total, page, limit };
}

export async function getDashboardById(id: string): Promise<Dashboard> {
  const result = await query<Dashboard>('SELECT * FROM dashboards WHERE id = $1', [id]);
  if (result.rows.length === 0) {
    throw new HttpError(404, 'DASHBOARD_NOT_FOUND', 'Dashboard not found');
  }
  return result.rows[0];
}

export async function getDashboardWithCharts(id: string): Promise<DashboardWithCharts> {
  const dashboard = await getDashboardById(id);

  const chartsResult = await query<DashboardChart & { chart_title: string; chart_type: string; chart_config: object; chart_sql: string; table_id: string; table_name: string; table_display_name: string; chart_is_public: boolean; chart_created_at: string }>(
    `SELECT dc.*, c.title as chart_title, c.chart_type, c.config_json as chart_config,
            c.sql_query as chart_sql, c.table_id, dt.name as table_name,
            dt.display_name as table_display_name, c.is_public as chart_is_public,
            c.created_at as chart_created_at
     FROM dashboard_charts dc
     JOIN charts c ON dc.chart_id = c.id
     JOIN dynamic_tables dt ON c.table_id = dt.id
     WHERE dc.dashboard_id = $1
     ORDER BY dc.position_y, dc.position_x`,
    [id]
  );

  const charts: DashboardChart[] = chartsResult.rows.map(row => ({
    id: row.id,
    dashboard_id: row.dashboard_id,
    chart_id: row.chart_id,
    position_x: row.position_x,
    position_y: row.position_y,
    width: row.width,
    height: row.height,
    config_json: row.config_json,
    created_at: row.created_at,
    chart: {
      id: row.chart_id,
      title: row.chart_title,
      description: null,
      chart_type: row.chart_type as ChartType,
      table_id: row.table_id,
      sql_query: row.chart_sql,
      config_json: row.chart_config,
      is_public: row.chart_is_public,
      created_by: null,
      created_at: row.chart_created_at,
      updated_at: row.chart_created_at,
      table_name: row.table_name,
      table_display_name: row.table_display_name,
    },
  }));

  return { ...dashboard, charts };
}

export async function updateDashboard(id: string, data: {
  title?: string;
  description?: string;
  layoutJson?: object;
  isPublic?: boolean;
}): Promise<Dashboard> {
  await getDashboardById(id);

  const updates: string[] = [];
  const values: any[] = [];
  let i = 1;

  if (data.title !== undefined) { updates.push(`title = $${i++}`); values.push(data.title); }
  if (data.description !== undefined) { updates.push(`description = $${i++}`); values.push(data.description); }
  if (data.layoutJson !== undefined) { updates.push(`layout_json = $${i++}`); values.push(JSON.stringify(data.layoutJson)); }
  if (data.isPublic !== undefined) { updates.push(`is_public = $${i++}`); values.push(data.isPublic); }

  if (updates.length === 0) {
    return getDashboardById(id);
  }

  updates.push(`updated_at = NOW()`);
  values.push(id);
  const result = await query<Dashboard>(
    `UPDATE dashboards SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return result.rows[0];
}

export async function deleteDashboard(id: string): Promise<void> {
  const result = await query('DELETE FROM dashboards WHERE id = $1', [id]);
  if (result.rowCount === 0) {
    throw new HttpError(404, 'DASHBOARD_NOT_FOUND', 'Dashboard not found');
  }
}

export async function addChartToDashboard(data: {
  dashboardId: string;
  chartId: string;
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
  configJson?: object;
}): Promise<DashboardChart> {
  await getDashboardById(data.dashboardId);
  await getChartById(data.chartId);

  const existing = await query(
    'SELECT id FROM dashboard_charts WHERE dashboard_id = $1 AND chart_id = $2',
    [data.dashboardId, data.chartId]
  );
  if (existing.rows.length > 0) {
    throw new HttpError(400, 'CHART_ALREADY_IN_DASHBOARD', 'This chart is already in the dashboard');
  }

  const result = await query<DashboardChart>(
    `INSERT INTO dashboard_charts (dashboard_id, chart_id, position_x, position_y, width, height, config_json)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [data.dashboardId, data.chartId, data.positionX || 0, data.positionY || 0, data.width || 6, data.height || 4, JSON.stringify(data.configJson || {})]
  );
  return result.rows[0];
}

export async function updateDashboardChart(id: string, data: {
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
  configJson?: object;
}): Promise<DashboardChart> {
  const updates: string[] = [];
  const values: any[] = [];
  let i = 1;

  if (data.positionX !== undefined) { updates.push(`position_x = $${i++}`); values.push(data.positionX); }
  if (data.positionY !== undefined) { updates.push(`position_y = $${i++}`); values.push(data.positionY); }
  if (data.width !== undefined) { updates.push(`width = $${i++}`); values.push(data.width); }
  if (data.height !== undefined) { updates.push(`height = $${i++}`); values.push(data.height); }
  if (data.configJson !== undefined) { updates.push(`config_json = $${i++}`); values.push(JSON.stringify(data.configJson)); }

  if (updates.length === 0) {
    const base = await query<DashboardChart>('SELECT * FROM dashboard_charts WHERE id = $1', [id]);
    return base.rows[0];
  }

  values.push(id);
  const result = await query<DashboardChart>(
    `UPDATE dashboard_charts SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return result.rows[0];
}

export async function removeChartFromDashboard(id: string): Promise<void> {
  const result = await query('DELETE FROM dashboard_charts WHERE id = $1', [id]);
  if (result.rowCount === 0) {
    throw new HttpError(404, 'DASHBOARD_CHART_NOT_FOUND', 'Dashboard chart not found');
  }
}

export async function publishDashboard(id: string): Promise<Dashboard> {
  const dashboard = await getDashboardById(id);
  if (!dashboard.published_slug) {
    const { v4: uuidv4 } = await import('uuid');
    await query('UPDATE dashboards SET published_slug = $1, is_public = true, updated_at = NOW() WHERE id = $2', [uuidv4(), id]);
  } else {
    await query('UPDATE dashboards SET is_public = true, updated_at = NOW() WHERE id = $1', [id]);
  }
  return getDashboardById(id);
}

export async function unpublishDashboard(id: string): Promise<Dashboard> {
  await query('UPDATE dashboards SET is_public = false, updated_at = NOW() WHERE id = $1', [id]);
  return getDashboardById(id);
}

export async function getDashboardBySlug(slug: string): Promise<DashboardWithCharts> {
  const result = await query<Dashboard>('SELECT * FROM dashboards WHERE published_slug = $1 AND is_public = true', [slug]);
  if (result.rows.length === 0) {
    throw new HttpError(404, 'DASHBOARD_NOT_FOUND', 'Public dashboard not found');
  }
  return getDashboardWithCharts(result.rows[0].id);
}
