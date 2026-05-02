import { query } from '../config/database.js';
import { HttpError } from '../middleware/auth.js';
import { assertValidIdentifier } from '../schema-engine/service.js';

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
  const name = await getDynamicTableName(tableId);
  assertValidIdentifier(name);
  return name;
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

interface InsertionFilters {
  promotion?: string;
  filiere?: string;
  anneeDebut?: string;
  anneeFin?: string;
  page?: number;
  limit?: number;
}

function buildInsertionWhereClause(
  filters: InsertionFilters,
  paramIndex: { value: number }
): { clauses: string[]; values: any[] } {
  const clauses: string[] = [];
  const values: any[] = [];

  if (filters.promotion) {
    clauses.push(`promotion = $${paramIndex.value++}`);
    values.push(filters.promotion);
  }
  if (filters.filiere) {
    clauses.push(`filiere = $${paramIndex.value++}`);
    values.push(filters.filiere);
  }
  if (filters.anneeDebut) {
    clauses.push(`annee_universitaire >= $${paramIndex.value++}`);
    values.push(filters.anneeDebut);
  }
  if (filters.anneeFin) {
    clauses.push(`annee_universitaire <= $${paramIndex.value++}`);
    values.push(filters.anneeFin);
  }

  return { clauses, values };
}

export async function getInsertionRates(filters: InsertionFilters): Promise<any> {
  const alumniTable = await resolveTableName('analytics_alumni_table');
  if (!alumniTable) {
    throw new HttpError(400, 'ANALYTICS_NOT_CONFIGURED', 'Alumni table not configured in system settings. Set analytics_alumni_table key.');
  }

  const paramIndex = { value: 1 };
  const { clauses, values } = buildInsertionWhereClause(filters, paramIndex);
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  const totalResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM ${alumniTable} ${where}`,
    values
  );
  const total = parseInt(totalResult.rows[0].count);

  const inserted6mResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM ${alumniTable} ${where} ${clauses.length > 0 ? 'AND' : 'WHERE'} insertion_6_mois = true`,
    values
  );
  const inserted6m = parseInt(inserted6mResult.rows[0].count);

  const inserted12mResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM ${alumniTable} ${where} ${clauses.length > 0 ? 'AND' : 'WHERE'} insertion_12_mois = true`,
    values
  );
  const inserted12m = parseInt(inserted12mResult.rows[0].count);

  const rate6m = total > 0 ? parseFloat(((inserted6m / total) * 100).toFixed(2)) : 0;
  const rate12m = total > 0 ? parseFloat(((inserted12m / total) * 100).toFixed(2)) : 0;

  const byPromotion = await query(
    `SELECT promotion,
       COUNT(*) as total,
       SUM(CASE WHEN insertion_6_mois = true THEN 1 ELSE 0 END) as inserted_6m,
       SUM(CASE WHEN insertion_12_mois = true THEN 1 ELSE 0 END) as inserted_12m
     FROM ${alumniTable}
     WHERE promotion IS NOT NULL
     GROUP BY promotion
     ORDER BY promotion DESC`,
  );

  const byFiliere = await query(
    `SELECT filiere,
       COUNT(*) as total,
       SUM(CASE WHEN insertion_6_mois = true THEN 1 ELSE 0 END) as inserted_6m,
       SUM(CASE WHEN insertion_12_mois = true THEN 1 ELSE 0 END) as inserted_12m
     FROM ${alumniTable} ${where} ${clauses.length > 0 ? 'AND' : 'WHERE'} filiere IS NOT NULL
     GROUP BY filiere
     ORDER BY total DESC`,
    values
  );

  const byYear = await query(
    `SELECT annee_universitaire,
       COUNT(*) as total,
       SUM(CASE WHEN insertion_6_mois = true THEN 1 ELSE 0 END) as inserted_6m,
       SUM(CASE WHEN insertion_12_mois = true THEN 1 ELSE 0 END) as inserted_12m
     FROM ${alumniTable}
     WHERE annee_universitaire IS NOT NULL
     GROUP BY annee_universitaire
     ORDER BY annee_universitaire DESC`,
  );

  return {
    total,
    inserted6m,
    inserted12m,
    rate6m,
    rate12m,
    byPromotion: byPromotion.rows.map((r: any) => ({
      ...r,
      total: parseInt(r.total),
      inserted_6m: parseInt(r.inserted_6m),
      inserted_12m: parseInt(r.inserted_12m),
      rate_6m: parseInt(r.total) > 0 ? parseFloat(((parseInt(r.inserted_6m) / parseInt(r.total)) * 100).toFixed(2)) : 0,
      rate_12m: parseInt(r.total) > 0 ? parseFloat(((parseInt(r.inserted_12m) / parseInt(r.total)) * 100).toFixed(2)) : 0,
    })),
    byFiliere: byFiliere.rows.map((r: any) => ({
      ...r,
      total: parseInt(r.total),
      inserted_6m: parseInt(r.inserted_6m),
      inserted_12m: parseInt(r.inserted_12m),
      rate_6m: parseInt(r.total) > 0 ? parseFloat(((parseInt(r.inserted_6m) / parseInt(r.total)) * 100).toFixed(2)) : 0,
      rate_12m: parseInt(r.total) > 0 ? parseFloat(((parseInt(r.inserted_12m) / parseInt(r.total)) * 100).toFixed(2)) : 0,
    })),
    byYear: byYear.rows.map((r: any) => ({
      ...r,
      total: parseInt(r.total),
      inserted_6m: parseInt(r.inserted_6m),
      inserted_12m: parseInt(r.inserted_12m),
      rate_6m: parseInt(r.total) > 0 ? parseFloat(((parseInt(r.inserted_6m) / parseInt(r.total)) * 100).toFixed(2)) : 0,
      rate_12m: parseInt(r.total) > 0 ? parseFloat(((parseInt(r.inserted_12m) / parseInt(r.total)) * 100).toFixed(2)) : 0,
    })),
  };
}

export async function getInsertionDelays(filters: InsertionFilters): Promise<any> {
  const alumniTable = await resolveTableName('analytics_alumni_table');
  if (!alumniTable) {
    throw new HttpError(400, 'ANALYTICS_NOT_CONFIGURED', 'Alumni table not configured in system settings. Set analytics_alumni_table key.');
  }

  const paramIndex = { value: 1 };
  const { clauses, values } = buildInsertionWhereClause(filters, paramIndex);
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  const overallResult = await query<{ avg_delay: string | null; min_delay: string | null; max_delay: string | null; count: string }>(
    `SELECT AVG(delai_emploi) as avg_delay, MIN(delai_emploi) as min_delay, MAX(delai_emploi) as max_delay, COUNT(delai_emploi) as count
     FROM ${alumniTable} ${where} ${clauses.length > 0 ? 'AND' : 'WHERE'} delai_emploi IS NOT NULL`,
    values
  );

  const overall = overallResult.rows[0];

  const distribution = await query(
    `SELECT delai_emploi, COUNT(*) as count
     FROM ${alumniTable} ${where} ${clauses.length > 0 ? 'AND' : 'WHERE'} delai_emploi IS NOT NULL
     GROUP BY delai_emploi
     ORDER BY delai_emploi`,
    values
  );

  const byFiliere = await query(
    `SELECT filiere,
       AVG(delai_emploi) as avg_delay,
       MIN(delai_emploi) as min_delay,
       MAX(delai_emploi) as max_delay,
       COUNT(delai_emploi) as count
     FROM ${alumniTable} ${where} ${clauses.length > 0 ? 'AND' : 'WHERE'} delai_emploi IS NOT NULL AND filiere IS NOT NULL
     GROUP BY filiere
     ORDER BY avg_delay ASC`,
    values
  );

  const byPromotion = await query(
    `SELECT promotion,
       AVG(delai_emploi) as avg_delay,
       MIN(delai_emploi) as min_delay,
       MAX(delai_emploi) as max_delay,
       COUNT(delai_emploi) as count
     FROM ${alumniTable}
     WHERE delai_emploi IS NOT NULL AND promotion IS NOT NULL
     GROUP BY promotion
     ORDER BY promotion DESC`,
  );

  return {
    overall: {
      avgDelay: overall.avg_delay ? parseFloat(parseFloat(overall.avg_delay).toFixed(2)) : null,
      minDelay: overall.min_delay ? parseFloat(overall.min_delay) : null,
      maxDelay: overall.max_delay ? parseFloat(overall.max_delay) : null,
      count: parseInt(overall.count),
    },
    distribution: distribution.rows.map((r: any) => ({
      delai: parseFloat(r.delai_emploi),
      count: parseInt(r.count),
    })),
    byFiliere: byFiliere.rows.map((r: any) => ({
      filiere: r.filiere,
      avgDelay: r.avg_delay ? parseFloat(parseFloat(r.avg_delay).toFixed(2)) : null,
      minDelay: r.min_delay ? parseFloat(r.min_delay) : null,
      maxDelay: r.max_delay ? parseFloat(r.max_delay) : null,
      count: parseInt(r.count),
    })),
    byPromotion: byPromotion.rows.map((r: any) => ({
      promotion: r.promotion,
      avgDelay: r.avg_delay ? parseFloat(parseFloat(r.avg_delay).toFixed(2)) : null,
      minDelay: r.min_delay ? parseFloat(r.min_delay) : null,
      maxDelay: r.max_delay ? parseFloat(r.max_delay) : null,
      count: parseInt(r.count),
    })),
  };
}

export async function getInsertionSectors(filters: InsertionFilters): Promise<any> {
  const alumniTable = await resolveTableName('analytics_alumni_table');
  if (!alumniTable) {
    throw new HttpError(400, 'ANALYTICS_NOT_CONFIGURED', 'Alumni table not configured in system settings. Set analytics_alumni_table key.');
  }

  const paramIndex = { value: 1 };
  const { clauses, values } = buildInsertionWhereClause(filters, paramIndex);
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  const totalResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM ${alumniTable} ${where} ${clauses.length > 0 ? 'AND' : 'WHERE'} secteur_activite IS NOT NULL`,
    values
  );
  const total = parseInt(totalResult.rows[0].count);

  const bySector = await query(
    `SELECT secteur_activite, COUNT(*) as count
     FROM ${alumniTable} ${where} ${clauses.length > 0 ? 'AND' : 'WHERE'} secteur_activite IS NOT NULL
     GROUP BY secteur_activite
     ORDER BY count DESC`,
    values
  );

  const byFiliere = await query(
    `SELECT filiere, secteur_activite, COUNT(*) as count
     FROM ${alumniTable} ${where} ${clauses.length > 0 ? 'AND' : 'WHERE'} secteur_activite IS NOT NULL AND filiere IS NOT NULL
     GROUP BY filiere, secteur_activite
     ORDER BY filiere, count DESC`,
    values
  );

  const byPromotion = await query(
    `SELECT promotion, secteur_activite, COUNT(*) as count
     FROM ${alumniTable}
     WHERE secteur_activite IS NOT NULL AND promotion IS NOT NULL
     GROUP BY promotion, secteur_activite
     ORDER BY promotion DESC, count DESC`,
  );

  const sectorsWithRate = bySector.rows.map((r: any) => ({
    secteur: r.secteur_activite,
    count: parseInt(r.count),
    rate: total > 0 ? parseFloat(((parseInt(r.count) / total) * 100).toFixed(2)) : 0,
  }));

  return {
    total,
    bySector: sectorsWithRate,
    byFiliere: byFiliere.rows.map((r: any) => ({
      filiere: r.filiere,
      secteur: r.secteur_activite,
      count: parseInt(r.count),
    })),
    byPromotion: byPromotion.rows.map((r: any) => ({
      promotion: r.promotion,
      secteur: r.secteur_activite,
      count: parseInt(r.count),
    })),
  };
}

export async function getInsertionContracts(filters: InsertionFilters): Promise<any> {
  const alumniTable = await resolveTableName('analytics_alumni_table');
  if (!alumniTable) {
    throw new HttpError(400, 'ANALYTICS_NOT_CONFIGURED', 'Alumni table not configured in system settings. Set analytics_alumni_table key.');
  }

  const paramIndex = { value: 1 };
  const { clauses, values } = buildInsertionWhereClause(filters, paramIndex);
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  const totalResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM ${alumniTable} ${where} ${clauses.length > 0 ? 'AND' : 'WHERE'} type_contrat IS NOT NULL`,
    values
  );
  const total = parseInt(totalResult.rows[0].count);

  const byContract = await query(
    `SELECT type_contrat, COUNT(*) as count
     FROM ${alumniTable} ${where} ${clauses.length > 0 ? 'AND' : 'WHERE'} type_contrat IS NOT NULL
     GROUP BY type_contrat
     ORDER BY count DESC`,
    values
  );

  const byFiliere = await query(
    `SELECT filiere, type_contrat, COUNT(*) as count
     FROM ${alumniTable} ${where} ${clauses.length > 0 ? 'AND' : 'WHERE'} type_contrat IS NOT NULL AND filiere IS NOT NULL
     GROUP BY filiere, type_contrat
     ORDER BY filiere, count DESC`,
    values
  );

  const byPromotion = await query(
    `SELECT promotion, type_contrat, COUNT(*) as count
     FROM ${alumniTable}
     WHERE type_contrat IS NOT NULL AND promotion IS NOT NULL
     GROUP BY promotion, type_contrat
     ORDER BY promotion DESC, count DESC`,
  );

  const contractsWithRate = byContract.rows.map((r: any) => ({
    typeContrat: r.type_contrat,
    count: parseInt(r.count),
    rate: total > 0 ? parseFloat(((parseInt(r.count) / total) * 100).toFixed(2)) : 0,
  }));

  return {
    total,
    byContract: contractsWithRate,
    byFiliere: byFiliere.rows.map((r: any) => ({
      filiere: r.filiere,
      typeContrat: r.type_contrat,
      count: parseInt(r.count),
    })),
    byPromotion: byPromotion.rows.map((r: any) => ({
      promotion: r.promotion,
      typeContrat: r.type_contrat,
      count: parseInt(r.count),
    })),
  };
}

export async function getAcademicTableMappings(): Promise<Record<string, string | null>> {
  const keys = [
    'analytics_students_table',
    'analytics_teachers_table',
    'analytics_formations_table',
    'analytics_events_table',
    'analytics_alumni_table',
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
    'analytics_alumni_table',
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
