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

  const result = await query<any>(
    `WITH filtered AS (
      SELECT * FROM ${studentsTable} ${where}
    ),
    total_q AS (
      SELECT COUNT(*) as total FROM filtered
    ),
    by_filiere AS (
      SELECT filiere, COUNT(*) as effectif FROM filtered GROUP BY filiere ORDER BY effectif DESC
    ),
    by_niveau AS (
      SELECT niveau, COUNT(*) as effectif FROM filtered GROUP BY niveau ORDER BY effectif DESC
    ),
    by_genre AS (
      SELECT genre, COUNT(*) as effectif FROM filtered GROUP BY genre ORDER BY effectif DESC
    ),
    by_year AS (
      SELECT annee_universitaire, COUNT(*) as effectif FROM filtered GROUP BY annee_universitaire ORDER BY annee_universitaire DESC
    )
    SELECT
      (SELECT total FROM total_q) as total,
      (SELECT COALESCE(json_agg(row_to_json(by_filiere)), '[]') FROM by_filiere) as by_filiere,
      (SELECT COALESCE(json_agg(row_to_json(by_niveau)), '[]') FROM by_niveau) as by_niveau,
      (SELECT COALESCE(json_agg(row_to_json(by_genre)), '[]') FROM by_genre) as by_genre,
      (SELECT COALESCE(json_agg(row_to_json(by_year)), '[]') FROM by_year) as by_year`,
    values
  );

  const row = result.rows[0];
  return {
    total: parseInt(row.total),
    byFiliere: row.by_filiere,
    byNiveau: row.by_niveau,
    byGenre: row.by_genre,
    byYear: row.by_year,
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
  const statutCondition = clauses.length > 0 ? 'AND statut IS NOT NULL' : 'WHERE statut IS NOT NULL';

  const result = await query<any>(
    `WITH filtered AS (
      SELECT * FROM ${studentsTable} ${where}
    ),
    status_q AS (
      SELECT statut, COUNT(*) as count
      FROM filtered WHERE statut IS NOT NULL GROUP BY statut
    ),
    total_q AS (
      SELECT COUNT(*) as total FROM filtered WHERE statut IS NOT NULL
    ),
    by_filiere AS (
      SELECT filiere, statut, COUNT(*) as count
      FROM filtered WHERE statut IS NOT NULL GROUP BY filiere, statut ORDER BY filiere, statut
    ),
    by_year AS (
      SELECT annee_universitaire, statut, COUNT(*) as count
      FROM filtered WHERE statut IS NOT NULL GROUP BY annee_universitaire, statut ORDER BY annee_universitaire DESC, statut
    )
    SELECT
      (SELECT total FROM total_q) as total,
      (SELECT COALESCE(json_agg(row_to_json(status_q)), '[]') FROM status_q) as status_counts,
      (SELECT COALESCE(json_agg(row_to_json(by_filiere)), '[]') FROM by_filiere) as by_filiere,
      (SELECT COALESCE(json_agg(row_to_json(by_year)), '[]') FROM by_year) as by_year`,
    values
  );

  const row = result.rows[0];
  const total = parseInt(row.total);
  const statusMap: Record<string, number> = {};
  for (const s of row.status_counts) {
    statusMap[s.statut] = parseInt(s.count);
  }

  const rates: Record<string, number> = {};
  if (total > 0) {
    for (const [status, count] of Object.entries(statusMap)) {
      rates[status] = parseFloat(((count / total) * 100).toFixed(2));
    }
  }

  return {
    total,
    statusCounts: statusMap,
    rates,
    byFiliere: row.by_filiere,
    byYear: row.by_year,
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

  const result = await query<any>(
    `WITH filtered AS (
      SELECT * FROM ${teachersTable} ${where}
    ),
    total_q AS (
      SELECT COUNT(*) as total FROM filtered
    ),
    by_specialty AS (
      SELECT specialite, COUNT(*) as count FROM filtered WHERE specialite IS NOT NULL GROUP BY specialite ORDER BY count DESC
    ),
    by_genre AS (
      SELECT genre, COUNT(*) as count FROM filtered WHERE genre IS NOT NULL GROUP BY genre ORDER BY genre
    ),
    by_grade AS (
      SELECT grade, COUNT(*) as count FROM filtered WHERE grade IS NOT NULL GROUP BY grade ORDER BY count DESC
    ),
    evolution AS (
      SELECT annee_universitaire, genre, COUNT(*) as count
      FROM ${teachersTable} WHERE annee_universitaire IS NOT NULL
      GROUP BY annee_universitaire, genre ORDER BY annee_universitaire, genre
    )
    SELECT
      (SELECT total FROM total_q) as total,
      (SELECT COALESCE(json_agg(row_to_json(by_specialty)), '[]') FROM by_specialty) as by_specialty,
      (SELECT COALESCE(json_agg(row_to_json(by_genre)), '[]') FROM by_genre) as by_genre,
      (SELECT COALESCE(json_agg(row_to_json(by_grade)), '[]') FROM by_grade) as by_grade,
      (SELECT COALESCE(json_agg(row_to_json(evolution)), '[]') FROM evolution) as evolution`,
    values
  );

  const row = result.rows[0];
  return {
    total: parseInt(row.total),
    bySpecialty: row.by_specialty,
    byGenre: row.by_genre,
    evolution: row.evolution,
    byGrade: row.by_grade,
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

  const result = await query<any>(
    `WITH filtered AS (
      SELECT * FROM ${formationsTable} ${where}
    ),
    total_q AS (
      SELECT COUNT(*) as total FROM filtered
    ),
    by_type AS (
      SELECT type_formation, COUNT(*) as count FROM filtered WHERE type_formation IS NOT NULL GROUP BY type_formation ORDER BY count DESC
    ),
    by_certifiant AS (
      SELECT certifiant, COUNT(*) as count FROM filtered WHERE certifiant IS NOT NULL GROUP BY certifiant ORDER BY certifiant
    ),
    by_public AS (
      SELECT public_cible, COUNT(*) as count FROM filtered WHERE public_cible IS NOT NULL GROUP BY public_cible ORDER BY count DESC
    ),
    by_year AS (
      SELECT annee_universitaire, type_formation, COUNT(*) as count
      FROM ${formationsTable} WHERE annee_universitaire IS NOT NULL
      GROUP BY annee_universitaire, type_formation ORDER BY annee_universitaire DESC, type_formation
    )
    SELECT
      (SELECT total FROM total_q) as total,
      (SELECT COALESCE(json_agg(row_to_json(by_type)), '[]') FROM by_type) as by_type,
      (SELECT COALESCE(json_agg(row_to_json(by_certifiant)), '[]') FROM by_certifiant) as by_certifiant,
      (SELECT COALESCE(json_agg(row_to_json(by_public)), '[]') FROM by_public) as by_public,
      (SELECT COALESCE(json_agg(row_to_json(by_year)), '[]') FROM by_year) as by_year`,
    values
  );

  const row = result.rows[0];
  return {
    total: parseInt(row.total),
    byType: row.by_type,
    byCertifiant: row.by_certifiant,
    byPublicCible: row.by_public,
    byYear: row.by_year,
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

  const result = await query<any>(
    `WITH filtered AS (
      SELECT * FROM ${eventsTable} ${where}
    ),
    total_q AS (
      SELECT COUNT(*) as total FROM filtered
    ),
    total_participants_q AS (
      SELECT COALESCE(SUM(nb_participants), 0) as total FROM filtered WHERE nb_participants IS NOT NULL
    ),
    by_type AS (
      SELECT type_evenement, COUNT(*) as count FROM filtered WHERE type_evenement IS NOT NULL GROUP BY type_evenement ORDER BY count DESC
    ),
    participation AS (
      SELECT type_evenement, SUM(nb_participants) as total_participants, AVG(nb_participants) as avg_participants
      FROM filtered WHERE nb_participants IS NOT NULL GROUP BY type_evenement ORDER BY total_participants DESC
    ),
    by_year AS (
      SELECT annee_universitaire, type_evenement, COUNT(*) as count, SUM(nb_participants) as total_participants
      FROM ${eventsTable} WHERE annee_universitaire IS NOT NULL
      GROUP BY annee_universitaire, type_evenement ORDER BY annee_universitaire DESC, type_evenement
    )
    SELECT
      (SELECT total FROM total_q) as total,
      (SELECT total FROM total_participants_q) as total_participants,
      (SELECT COALESCE(json_agg(row_to_json(by_type)), '[]') FROM by_type) as by_type,
      (SELECT COALESCE(json_agg(row_to_json(participation)), '[]') FROM participation) as participation,
      (SELECT COALESCE(json_agg(row_to_json(by_year)), '[]') FROM by_year) as by_year`,
    values
  );

  const row = result.rows[0];
  return {
    total: parseInt(row.total),
    totalParticipants: parseInt(row.total_participants),
    byType: row.by_type,
    participationStats: (row.participation as any[]).map(r => ({
      ...r,
      total_participants: r.total_participants ? parseInt(r.total_participants) : 0,
      avg_participants: r.avg_participants ? parseFloat(parseFloat(r.avg_participants).toFixed(2)) : 0,
    })),
    byYear: (row.by_year as any[]).map(r => ({
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

  const result = await query<any>(
    `WITH filtered AS (
      SELECT * FROM ${alumniTable} ${where}
    ),
    total_q AS (
      SELECT COUNT(*) as total FROM filtered
    ),
    inserted_6m_q AS (
      SELECT COUNT(*) as count FROM filtered WHERE insertion_6_mois = true
    ),
    inserted_12m_q AS (
      SELECT COUNT(*) as count FROM filtered WHERE insertion_12_mois = true
    ),
    by_filiere AS (
      SELECT filiere,
        COUNT(*) as total,
        SUM(CASE WHEN insertion_6_mois = true THEN 1 ELSE 0 END) as inserted_6m,
        SUM(CASE WHEN insertion_12_mois = true THEN 1 ELSE 0 END) as inserted_12m
      FROM filtered WHERE filiere IS NOT NULL GROUP BY filiere ORDER BY total DESC
    ),
    by_promotion AS (
      SELECT promotion,
        COUNT(*) as total,
        SUM(CASE WHEN insertion_6_mois = true THEN 1 ELSE 0 END) as inserted_6m,
        SUM(CASE WHEN insertion_12_mois = true THEN 1 ELSE 0 END) as inserted_12m
      FROM ${alumniTable} WHERE promotion IS NOT NULL GROUP BY promotion ORDER BY promotion DESC
    ),
    by_year AS (
      SELECT annee_universitaire,
        COUNT(*) as total,
        SUM(CASE WHEN insertion_6_mois = true THEN 1 ELSE 0 END) as inserted_6m,
        SUM(CASE WHEN insertion_12_mois = true THEN 1 ELSE 0 END) as inserted_12m
      FROM ${alumniTable} WHERE annee_universitaire IS NOT NULL GROUP BY annee_universitaire ORDER BY annee_universitaire DESC
    )
    SELECT
      (SELECT total FROM total_q) as total,
      (SELECT count FROM inserted_6m_q) as inserted_6m,
      (SELECT count FROM inserted_12m_q) as inserted_12m,
      (SELECT COALESCE(json_agg(row_to_json(by_filiere)), '[]') FROM by_filiere) as by_filiere,
      (SELECT COALESCE(json_agg(row_to_json(by_promotion)), '[]') FROM by_promotion) as by_promotion,
      (SELECT COALESCE(json_agg(row_to_json(by_year)), '[]') FROM by_year) as by_year`,
    values
  );

  const row = result.rows[0];
  const total = parseInt(row.total);
  const inserted6m = parseInt(row.inserted_6m);
  const inserted12m = parseInt(row.inserted_12m);
  const rate6m = total > 0 ? parseFloat(((inserted6m / total) * 100).toFixed(2)) : 0;
  const rate12m = total > 0 ? parseFloat(((inserted12m / total) * 100).toFixed(2)) : 0;

  const mapBreakdown = (items: any[]) => items.map((r: any) => ({
    ...r,
    total: parseInt(r.total),
    inserted_6m: parseInt(r.inserted_6m),
    inserted_12m: parseInt(r.inserted_12m),
    rate_6m: parseInt(r.total) > 0 ? parseFloat(((parseInt(r.inserted_6m) / parseInt(r.total)) * 100).toFixed(2)) : 0,
    rate_12m: parseInt(r.total) > 0 ? parseFloat(((parseInt(r.inserted_12m) / parseInt(r.total)) * 100).toFixed(2)) : 0,
  }));

  return {
    total,
    inserted6m,
    inserted12m,
    rate6m,
    rate12m,
    byPromotion: mapBreakdown(row.by_promotion),
    byFiliere: mapBreakdown(row.by_filiere),
    byYear: mapBreakdown(row.by_year),
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

  const result = await query<any>(
    `WITH filtered AS (
      SELECT * FROM ${alumniTable} ${where}
    ),
    overall_q AS (
      SELECT AVG(delai_emploi) as avg_delay, MIN(delai_emploi) as min_delay, MAX(delai_emploi) as max_delay, COUNT(delai_emploi) as count
      FROM filtered WHERE delai_emploi IS NOT NULL
    ),
    distribution AS (
      SELECT delai_emploi, COUNT(*) as count FROM filtered WHERE delai_emploi IS NOT NULL GROUP BY delai_emploi ORDER BY delai_emploi
    ),
    by_filiere AS (
      SELECT filiere, AVG(delai_emploi) as avg_delay, MIN(delai_emploi) as min_delay, MAX(delai_emploi) as max_delay, COUNT(delai_emploi) as count
      FROM filtered WHERE delai_emploi IS NOT NULL AND filiere IS NOT NULL GROUP BY filiere ORDER BY avg_delay ASC
    ),
    by_promotion AS (
      SELECT promotion, AVG(delai_emploi) as avg_delay, MIN(delai_emploi) as min_delay, MAX(delai_emploi) as max_delay, COUNT(delai_emploi) as count
      FROM ${alumniTable} WHERE delai_emploi IS NOT NULL AND promotion IS NOT NULL GROUP BY promotion ORDER BY promotion DESC
    )
    SELECT
      (SELECT row_to_json(overall_q) FROM overall_q) as overall,
      (SELECT COALESCE(json_agg(row_to_json(distribution)), '[]') FROM distribution) as distribution,
      (SELECT COALESCE(json_agg(row_to_json(by_filiere)), '[]') FROM by_filiere) as by_filiere,
      (SELECT COALESCE(json_agg(row_to_json(by_promotion)), '[]') FROM by_promotion) as by_promotion`,
    values
  );

  const row = result.rows[0];
  const overall = row.overall;

  return {
    overall: {
      avgDelay: overall.avg_delay ? parseFloat(parseFloat(overall.avg_delay).toFixed(2)) : null,
      minDelay: overall.min_delay ? parseFloat(overall.min_delay) : null,
      maxDelay: overall.max_delay ? parseFloat(overall.max_delay) : null,
      count: parseInt(overall.count),
    },
    distribution: (row.distribution as any[]).map((r: any) => ({
      delai: parseFloat(r.delai_emploi),
      count: parseInt(r.count),
    })),
    byFiliere: (row.by_filiere as any[]).map((r: any) => ({
      filiere: r.filiere,
      avgDelay: r.avg_delay ? parseFloat(parseFloat(r.avg_delay).toFixed(2)) : null,
      minDelay: r.min_delay ? parseFloat(r.min_delay) : null,
      maxDelay: r.max_delay ? parseFloat(r.max_delay) : null,
      count: parseInt(r.count),
    })),
    byPromotion: (row.by_promotion as any[]).map((r: any) => ({
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

  const result = await query<any>(
    `WITH filtered AS (
      SELECT * FROM ${alumniTable} ${where}
    ),
    total_q AS (
      SELECT COUNT(*) as total FROM filtered WHERE secteur_activite IS NOT NULL
    ),
    by_sector AS (
      SELECT secteur_activite, COUNT(*) as count FROM filtered WHERE secteur_activite IS NOT NULL GROUP BY secteur_activite ORDER BY count DESC
    ),
    by_filiere AS (
      SELECT filiere, secteur_activite, COUNT(*) as count FROM filtered WHERE secteur_activite IS NOT NULL AND filiere IS NOT NULL GROUP BY filiere, secteur_activite ORDER BY filiere, count DESC
    ),
    by_promotion AS (
      SELECT promotion, secteur_activite, COUNT(*) as count FROM ${alumniTable} WHERE secteur_activite IS NOT NULL AND promotion IS NOT NULL GROUP BY promotion, secteur_activite ORDER BY promotion DESC, count DESC
    )
    SELECT
      (SELECT total FROM total_q) as total,
      (SELECT COALESCE(json_agg(row_to_json(by_sector)), '[]') FROM by_sector) as by_sector,
      (SELECT COALESCE(json_agg(row_to_json(by_filiere)), '[]') FROM by_filiere) as by_filiere,
      (SELECT COALESCE(json_agg(row_to_json(by_promotion)), '[]') FROM by_promotion) as by_promotion`,
    values
  );

  const row = result.rows[0];
  const total = parseInt(row.total);

  const sectorsWithRate = (row.by_sector as any[]).map((r: any) => ({
    secteur: r.secteur_activite,
    count: parseInt(r.count),
    rate: total > 0 ? parseFloat(((parseInt(r.count) / total) * 100).toFixed(2)) : 0,
  }));

  return {
    total,
    bySector: sectorsWithRate,
    byFiliere: (row.by_filiere as any[]).map((r: any) => ({
      filiere: r.filiere,
      secteur: r.secteur_activite,
      count: parseInt(r.count),
    })),
    byPromotion: (row.by_promotion as any[]).map((r: any) => ({
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

  const result = await query<any>(
    `WITH filtered AS (
      SELECT * FROM ${alumniTable} ${where}
    ),
    total_q AS (
      SELECT COUNT(*) as total FROM filtered WHERE type_contrat IS NOT NULL
    ),
    by_contract AS (
      SELECT type_contrat, COUNT(*) as count FROM filtered WHERE type_contrat IS NOT NULL GROUP BY type_contrat ORDER BY count DESC
    ),
    by_filiere AS (
      SELECT filiere, type_contrat, COUNT(*) as count FROM filtered WHERE type_contrat IS NOT NULL AND filiere IS NOT NULL GROUP BY filiere, type_contrat ORDER BY filiere, count DESC
    ),
    by_promotion AS (
      SELECT promotion, type_contrat, COUNT(*) as count FROM ${alumniTable} WHERE type_contrat IS NOT NULL AND promotion IS NOT NULL GROUP BY promotion, type_contrat ORDER BY promotion DESC, count DESC
    )
    SELECT
      (SELECT total FROM total_q) as total,
      (SELECT COALESCE(json_agg(row_to_json(by_contract)), '[]') FROM by_contract) as by_contract,
      (SELECT COALESCE(json_agg(row_to_json(by_filiere)), '[]') FROM by_filiere) as by_filiere,
      (SELECT COALESCE(json_agg(row_to_json(by_promotion)), '[]') FROM by_promotion) as by_promotion`,
    values
  );

  const row = result.rows[0];
  const total = parseInt(row.total);

  const contractsWithRate = (row.by_contract as any[]).map((r: any) => ({
    typeContrat: r.type_contrat,
    count: parseInt(r.count),
    rate: total > 0 ? parseFloat(((parseInt(r.count) / total) * 100).toFixed(2)) : 0,
  }));

  return {
    total,
    byContract: contractsWithRate,
    byFiliere: (row.by_filiere as any[]).map((r: any) => ({
      filiere: r.filiere,
      typeContrat: r.type_contrat,
      count: parseInt(r.count),
    })),
    byPromotion: (row.by_promotion as any[]).map((r: any) => ({
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
