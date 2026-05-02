import { query, getClient } from '../config/database.js';
import { HttpError } from '../middleware/auth.js';

export interface SystemSetting {
  key: string;
  value: any;
  updated_at: string;
  updated_by: string | null;
}

export interface AcademicYear {
  id: string;
  year: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: any;
  created_at: string;
  user_first_name?: string | null;
  user_last_name?: string | null;
}

export async function getAllSettings(): Promise<SystemSetting[]> {
  const result = await query<SystemSetting>('SELECT * FROM system_settings ORDER BY key ASC');
  return result.rows;
}

export async function getSettingByKey(key: string): Promise<SystemSetting> {
  const result = await query<SystemSetting>('SELECT * FROM system_settings WHERE key = $1', [key]);
  if (result.rows.length === 0) throw new HttpError(404, 'SETTING_NOT_FOUND', 'Setting not found');
  return result.rows[0];
}

export async function upsertSetting(key: string, value: any, userId?: string): Promise<SystemSetting> {
  const result = await query<SystemSetting>(
    `INSERT INTO system_settings (key, value, updated_at, updated_by) VALUES ($1, $2, NOW(), $3)
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW(), updated_by = $3
     RETURNING *`,
    [key, JSON.stringify(value), userId || null]
  );
  return result.rows[0];
}

export async function deleteSetting(key: string): Promise<void> {
  const result = await query('DELETE FROM system_settings WHERE key = $1', [key]);
  if (result.rowCount === 0) throw new HttpError(404, 'SETTING_NOT_FOUND', 'Setting not found');
}

export async function listAcademicYears(): Promise<AcademicYear[]> {
  const result = await query<AcademicYear>('SELECT * FROM academic_years ORDER BY start_date DESC');
  return result.rows;
}

export async function getAcademicYearById(id: string): Promise<AcademicYear> {
  const result = await query<AcademicYear>('SELECT * FROM academic_years WHERE id = $1', [id]);
  if (result.rows.length === 0) throw new HttpError(404, 'ACADEMIC_YEAR_NOT_FOUND', 'Academic year not found');
  return result.rows[0];
}

export async function createAcademicYear(data: {
  year: string;
  startDate: string;
  endDate: string;
  isCurrent?: boolean;
}): Promise<AcademicYear> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    if (data.isCurrent) {
      await client.query('UPDATE academic_years SET is_current = false WHERE is_current = true');
    }
    const result = await client.query<AcademicYear>(
      `INSERT INTO academic_years (year, start_date, end_date, is_current) VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.year, data.startDate, data.endDate, data.isCurrent || false]
    );
    await client.query('COMMIT');
    return result.rows[0];
  } catch (err: any) {
    await client.query('ROLLBACK');
    if (err.code === '23505') throw new HttpError(409, 'DUPLICATE_YEAR', 'Academic year already exists');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateAcademicYear(id: string, data: {
  year?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
}): Promise<AcademicYear> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const existing = await client.query<AcademicYear>('SELECT * FROM academic_years WHERE id = $1', [id]);
    if (existing.rows.length === 0) throw new HttpError(404, 'ACADEMIC_YEAR_NOT_FOUND', 'Academic year not found');

    if (data.isCurrent) {
      await client.query('UPDATE academic_years SET is_current = false WHERE is_current = true');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;
    const map: Record<string, any> = {
      year: data.year,
      start_date: data.startDate,
      end_date: data.endDate,
      is_current: data.isCurrent,
    };
    for (const [col, val] of Object.entries(map)) {
      if (val !== undefined) {
        fields.push(`${col} = $${i++}`);
        values.push(val);
      }
    }
    if (fields.length === 0) throw new HttpError(400, 'NO_FIELDS', 'No fields to update');
    values.push(id);
    const result = await client.query<AcademicYear>(
      `UPDATE academic_years SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    await client.query('COMMIT');
    return result.rows[0];
  } catch (err: any) {
    await client.query('ROLLBACK');
    if (err.code === '23505') throw new HttpError(409, 'DUPLICATE_YEAR', 'Academic year already exists');
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteAcademicYear(id: string): Promise<void> {
  const result = await query('DELETE FROM academic_years WHERE id = $1', [id]);
  if (result.rowCount === 0) throw new HttpError(404, 'ACADEMIC_YEAR_NOT_FOUND', 'Academic year not found');
}

export async function listActivityLogs(options?: {
  userId?: string;
  action?: string;
  page?: number;
  limit?: number;
}): Promise<{ logs: ActivityLog[]; total: number }> {
  const conditions: string[] = [];
  const values: any[] = [];
  let i = 1;
  if (options?.userId) {
    conditions.push(`l.user_id = $${i++}`);
    values.push(options.userId);
  }
  if (options?.action) {
    conditions.push(`l.action ILIKE $${i++}`);
    values.push(`%${options.action}%`);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const page = options?.page || 1;
  const limit = options?.limit || 50;
  const offset = (page - 1) * limit;

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM activity_logs l ${where}`,
    values
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const result = await query<ActivityLog>(
    `SELECT l.*, u.first_name as user_first_name, u.last_name as user_last_name
     FROM activity_logs l
     LEFT JOIN users u ON l.user_id = u.id
     ${where}
     ORDER BY l.created_at DESC
     LIMIT $${i++} OFFSET $${i++}`,
    [...values, limit, offset]
  );
  return { logs: result.rows, total };
}
