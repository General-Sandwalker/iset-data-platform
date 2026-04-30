import { query } from '../config/database.js';
import { HttpError } from '../middleware/auth.js';

export interface SystemSetting {
  key: string;
  value: any;
  updated_at: string;
}

async function getSetting(key: string): Promise<string | null> {
  const result = await query<SystemSetting>(
    'SELECT * FROM system_settings WHERE key = $1',
    [key]
  );
  if (result.rows.length === 0) return null;
  const val = result.rows[0].value;
  return typeof val === 'string' ? val : val?.tableId ?? val?.tableName ?? null;
}

async function getDynamicTableName(tableId: string): Promise<string> {
  const result = await query<{ name: string }>(
    'SELECT name FROM dynamic_tables WHERE id = $1',
    [tableId]
  );
  if (result.rows.length === 0) {
    throw new HttpError(400, 'TABLE_NOT_FOUND', `Dynamic table with id ${tableId} not found`);
  }
  return result.rows[0].name;
}

async function resolveTableName(settingKey: string): Promise<string | null> {
  const tableId = await getSetting(settingKey);
  if (!tableId) return null;
  return getDynamicTableName(tableId);
}

interface AcademicFilters {
  annee?: string;
  filiere?: string;
  niveau?: string;
  genre?: string;
  page?: number;
  limit?: number;
}

function buildWhereClause(
  filters: AcademicFilters,
  paramIndex: { value: number }
): { clauses: string[]; values: any[] } {
  const clauses: string[] = [];
  const values: any[] = [];

  if (filters.annee) {
    clauses.push(`annee_universitaire = $${paramIndex.value++}`);
    values.push(filters.annee);
  }
  if (filters.filiere) {
    clauses.push(`filiere = $${paramIndex.value++}`);
    values.push(filters.filiere);
  }
  if (filters.niveau) {
    clauses.push(`niveau = $${paramIndex.value++}`);
    values.push(filters.niveau);
  }
  if (filters.genre) {
    clauses.push(`genre = $${paramIndex.value++}`);
    values.push(filters.genre);
  }

  return { clauses, values };
}

export async function getEnrollments(filters: AcademicFilters): Promise<any> {
  const studentsTable = await resolveTableName('analytics_students_table');
  if (!studentsTable) {
    throw new HttpError(400, 'ANALYTICS_NOT_CONFIGURED', 'Students table not configured in system settings. Set analytics_students_table key.');
  }

  const paramIndex = { value: 1 };
  const { clauses, values } = buildWhereClause(filters, paramIndex);
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM ${studentsTable} ${where}`,
    values
  );
  const total = parseInt(countResult.rows[0].count);

  const page = filters.page || 1;
  const limit = Math.min(filters.limit || 50, 100);
  const offset = (page - 1) * limit;

  const result = await query(
    `SELECT filiere, niveau, genre, annee_universitaire, COUNT(*) as effectif
     FROM ${studentsTable} ${where}
     GROUP BY filiere, niveau, genre, annee_universitaire
     ORDER BY annee_universitaire DESC, filiere, niveau, genre
     LIMIT $${paramIndex.value++} OFFSET $${paramIndex.value++}`,
    [...values, limit, offset]
  );

  return {
    data: result.rows,
    meta: { page, limit, total: result.rows.length },
    totalRecords: total,
  };
}

export async function getEnrollmentsSummary(filters: AcademicFilters): Promise<any> {
  const studentsTable = await resolveTableName('analytics_students_table');
  if (!studentsTable) {
    throw new HttpError(400, 'ANALYTICS_NOT_CONFIGURED', 'Students table not configured in system settings. Set analytics_students_table key.');
  }

  const paramIndex = { value: 1 };
  const { clauses, values } = buildWhereClause(filters, paramIndex);
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  const byFiliere = await query(
    `SELECT filiere, COUNT(*) as effectif FROM ${studentsTable} ${where} GROUP BY filiere ORDER BY effectif DESC`,
    values
  );

  const byNiveau = await query(
    `SELECT niveau, COUNT(*) as effectif FROM ${studentsTable} ${where} GROUP BY niveau ORDER BY effectif DESC`,
    values
  );

  const byGenre = await query(
    `SELECT genre, COUNT(*) as effectif FROM ${studentsTable} ${where} GROUP BY genre ORDER BY effectif DESC`,
    values
  );

  const byYear = await query(
    `SELECT annee_universitaire, COUNT(*) as effectif FROM ${studentsTable} ${where} GROUP BY annee_universitaire ORDER BY annee_universitaire DESC`,
    values
  );

  const totalResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM ${studentsTable} ${where}`,
    values
  );

  return {
    total: parseInt(totalResult.rows[0].count),
    byFiliere: byFiliere.rows,
    byNiveau: byNiveau.rows,
    byGenre: byGenre.rows,
    byYear: byYear.rows,
  };
}

export async function getSuccessRates(filters: AcademicFilters): Promise<any> {
  const studentsTable = await resolveTableName('analytics_students_table');
  if (!studentsTable) {
    throw new HttpError(400, 'ANALYTICS_NOT_CONFIGURED', 'Students table not configured in system settings. Set analytics_students_table key.');
  }

  const paramIndex = { value: 1 };
  const { clauses, values } = buildWhereClause(filters, paramIndex);
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  const statusResult = await query(
    `SELECT statut, COUNT(*) as count FROM ${studentsTable} ${where} ${clauses.length > 0 ? 'AND' : 'WHERE'} statut IS NOT NULL GROUP BY statut`,
    values
  );

  const totalResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM ${studentsTable} ${where} ${clauses.length > 0 ? 'AND' : 'WHERE'} statut IS NOT NULL`,
    values
  );
  const total = parseInt(totalResult.rows[0].count);

  const statusMap: Record<string, number> = {};
  for (const row of statusResult.rows) {
    statusMap[row.statut] = parseInt(row.count);
  }

  const rates: Record<string, number> = {};
  if (total > 0) {
    for (const [status, count] of Object.entries(statusMap)) {
      rates[status] = parseFloat(((count / total) * 100).toFixed(2));
    }
  }

  const byFiliere = await query(
    `SELECT filiere, statut, COUNT(*) as count
     FROM ${studentsTable} ${where} ${clauses.length > 0 ? 'AND' : 'WHERE'} statut IS NOT NULL
     GROUP BY filiere, statut
     ORDER BY filiere, statut`,
    values
  );

  const byYear = await query(
    `SELECT annee_universitaire, statut, COUNT(*) as count
     FROM ${studentsTable} ${where} ${clauses.length > 0 ? 'AND' : 'WHERE'} statut IS NOT NULL
     GROUP BY annee_universitaire, statut
     ORDER BY annee_universitaire DESC, statut`,
    values
  );

  return {
    total,
    statusCounts: statusMap,
    rates,
    byFiliere: byFiliere.rows,
    byYear: byYear.rows,
  };
}

export async function getTeacherStats(filters: {
  annee?: string;
  genre?: string;
}): Promise<any> {
  const teachersTable = await resolveTableName('analytics_teachers_table');
  if (!teachersTable) {
    throw new HttpError(400, 'ANALYTICS_NOT_CONFIGURED', 'Teachers table not configured in system settings. Set analytics_teachers_table key.');
  }

  const conditions: string[] = [];
  const values: any[] = [];
  let i = 1;

  if (filters.annee) {
    conditions.push(`annee_universitaire = $${i++}`);
    values.push(filters.annee);
  }
  if (filters.genre) {
    conditions.push(`genre = $${i++}`);
    values.push(filters.genre);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const totalResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM ${teachersTable} ${where}`,
    values
  );

  const bySpecialty = await query(
    `SELECT specialite, COUNT(*) as count FROM ${teachersTable} ${where} ${conditions.length > 0 ? 'AND' : 'WHERE'} specialite IS NOT NULL GROUP BY specialite ORDER BY count DESC`,
    values
  );

  const byGenre = await query(
    `SELECT genre, COUNT(*) as count FROM ${teachersTable} ${where} ${conditions.length > 0 ? 'AND' : 'WHERE'} genre IS NOT NULL GROUP BY genre ORDER BY genre`,
    values
  );

  const evolution = await query(
    `SELECT annee_universitaire, genre, COUNT(*) as count
     FROM ${teachersTable}
     WHERE annee_universitaire IS NOT NULL
     GROUP BY annee_universitaire, genre
     ORDER BY annee_universitaire, genre`
  );

  const byGrade = await query(
    `SELECT grade, COUNT(*) as count FROM ${teachersTable} ${where} ${conditions.length > 0 ? 'AND' : 'WHERE'} grade IS NOT NULL GROUP BY grade ORDER BY count DESC`,
    values
  );

  return {
    total: parseInt(totalResult.rows[0].count),
    bySpecialty: bySpecialty.rows,
    byGenre: byGenre.rows,
    evolution: evolution.rows,
    byGrade: byGrade.rows,
  };
}

export async function getFormationStats(filters: {
  annee?: string;
}): Promise<any> {
  const formationsTable = await resolveTableName('analytics_formations_table');
  if (!formationsTable) {
    throw new HttpError(400, 'ANALYTICS_NOT_CONFIGURED', 'Formations table not configured in system settings. Set analytics_formations_table key.');
  }

  const conditions: string[] = [];
  const values: any[] = [];
  let i = 1;

  if (filters.annee) {
    conditions.push(`annee_universitaire = $${i++}`);
    values.push(filters.annee);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const totalResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM ${formationsTable} ${where}`,
    values
  );

  const byType = await query(
    `SELECT type_formation, COUNT(*) as count FROM ${formationsTable} ${where} ${conditions.length > 0 ? 'AND' : 'WHERE'} type_formation IS NOT NULL GROUP BY type_formation ORDER BY count DESC`,
    values
  );

  const byCertifiant = await query(
    `SELECT certifiant, COUNT(*) as count FROM ${formationsTable} ${where} ${conditions.length > 0 ? 'AND' : 'WHERE'} certifiant IS NOT NULL GROUP BY certifiant ORDER BY certifiant`,
    values
  );

  const byPublicCible = await query(
    `SELECT public_cible, COUNT(*) as count FROM ${formationsTable} ${where} ${conditions.length > 0 ? 'AND' : 'WHERE'} public_cible IS NOT NULL GROUP BY public_cible ORDER BY count DESC`,
    values
  );

  const byYear = await query(
    `SELECT annee_universitaire, type_formation, COUNT(*) as count
     FROM ${formationsTable}
     WHERE annee_universitaire IS NOT NULL
     GROUP BY annee_universitaire, type_formation
     ORDER BY annee_universitaire DESC, type_formation`
  );

  return {
    total: parseInt(totalResult.rows[0].count),
    byType: byType.rows,
    byCertifiant: byCertifiant.rows,
    byPublicCible: byPublicCible.rows,
    byYear: byYear.rows,
  };
}

export async function getEventStats(filters: {
  annee?: string;
}): Promise<any> {
  const eventsTable = await resolveTableName('analytics_events_table');
  if (!eventsTable) {
    throw new HttpError(400, 'ANALYTICS_NOT_CONFIGURED', 'Events table not configured in system settings. Set analytics_events_table key.');
  }

  const conditions: string[] = [];
  const values: any[] = [];
  let i = 1;

  if (filters.annee) {
    conditions.push(`annee_universitaire = $${i++}`);
    values.push(filters.annee);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const totalResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM ${eventsTable} ${where}`,
    values
  );

  const byType = await query(
    `SELECT type_evenement, COUNT(*) as count FROM ${eventsTable} ${where} ${conditions.length > 0 ? 'AND' : 'WHERE'} type_evenement IS NOT NULL GROUP BY type_evenement ORDER BY count DESC`,
    values
  );

  const participationStats = await query(
    `SELECT type_evenement, SUM(nb_participants) as total_participants, AVG(nb_participants) as avg_participants
     FROM ${eventsTable} ${where} ${conditions.length > 0 ? 'AND' : 'WHERE'} nb_participants IS NOT NULL
     GROUP BY type_evenement
     ORDER BY total_participants DESC`,
    values
  );

  const byYear = await query(
    `SELECT annee_universitaire, type_evenement, COUNT(*) as count, SUM(nb_participants) as total_participants
     FROM ${eventsTable}
     WHERE annee_universitaire IS NOT NULL
     GROUP BY annee_universitaire, type_evenement
     ORDER BY annee_universitaire DESC, type_evenement`
  );

  const totalParticipation = await query<{ total: string | null }>(
    `SELECT SUM(nb_participants) as total FROM ${eventsTable} ${where} ${conditions.length > 0 ? 'AND' : 'WHERE'} nb_participants IS NOT NULL`,
    values
  );

  return {
    total: parseInt(totalResult.rows[0].count),
    totalParticipants: totalParticipation.rows[0].total ? parseInt(totalParticipation.rows[0].total) : 0,
    byType: byType.rows,
    participationStats: participationStats.rows.map(r => ({
      ...r,
      total_participants: r.total_participants ? parseInt(r.total_participants) : 0,
      avg_participants: r.avg_participants ? parseFloat(parseFloat(r.avg_participants).toFixed(2)) : 0,
    })),
    byYear: byYear.rows.map(r => ({
      ...r,
      total_participants: r.total_participants ? parseInt(r.total_participants) : 0,
    })),
  };
}

export async function getAcademicTableMappings(): Promise<Record<string, string | null>> {
  const keys = [
    'analytics_students_table',
    'analytics_teachers_table',
    'analytics_formations_table',
    'analytics_events_table',
  ];

  const mappings: Record<string, string | null> = {};
  for (const key of keys) {
    const val = await getSetting(key);
    mappings[key] = val;
  }

  return mappings;
}

export async function setAcademicTableMapping(key: string, tableId: string): Promise<void> {
  const allowedKeys = [
    'analytics_students_table',
    'analytics_teachers_table',
    'analytics_formations_table',
    'analytics_events_table',
  ];

  if (!allowedKeys.includes(key)) {
    throw new HttpError(400, 'INVALID_SETTING_KEY', `Setting key must be one of: ${allowedKeys.join(', ')}`);
  }

  await getDynamicTableName(tableId);

  await query(
    `INSERT INTO system_settings (key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    [key, JSON.stringify(tableId)]
  );
}
