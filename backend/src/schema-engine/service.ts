import { query, getClient } from '../../config/database.js';
import { HttpError } from '../../middleware/auth.js';
import { z } from 'zod';

export const fieldTypes = ['text', 'number', 'decimal', 'date', 'datetime', 'boolean', 'select', 'multiselect', 'email', 'phone', 'file', 'user_link'] as const;
export type FieldType = typeof fieldTypes[number];

const identifierRegex = /^[a-z0-9_]+$/;

function sanitizeIdentifier(name: string): string {
  if (!identifierRegex.test(name)) {
    throw new HttpError(400, 'INVALID_IDENTIFIER', 'Identifier must contain only lowercase letters, numbers, and underscores');
  }
  return name;
}

function sqlTypeForFieldType(type: FieldType): string {
  switch (type) {
    case 'text':
    case 'email':
    case 'phone':
      return 'VARCHAR(500)';
    case 'number':
      return 'INTEGER';
    case 'decimal':
      return 'DECIMAL(15,2)';
    case 'date':
      return 'DATE';
    case 'datetime':
      return 'TIMESTAMPTZ';
    case 'boolean':
      return 'BOOLEAN';
    case 'select':
    case 'multiselect':
      return 'VARCHAR(255)';
    case 'file':
      return 'VARCHAR(500)';
    case 'user_link':
      return 'VARCHAR(20)';
    default:
      throw new HttpError(400, 'UNKNOWN_TYPE', `Unknown field type: ${type}`);
  }
}

export interface DynamicTable {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  is_user_linked: boolean;
  created_by: string | null;
  created_at: string;
}

export interface DynamicField {
  id: string;
  table_id: string;
  name: string;
  display_name: string;
  field_type: FieldType;
  config_json: object;
  is_required: boolean;
  order_index: number;
}

export async function createTable(data: {
  name: string;
  displayName: string;
  description?: string;
  isUserLinked: boolean;
  createdBy: string;
}): Promise<DynamicTable> {
  const sanitizedName = sanitizeIdentifier(data.name.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
  const tableName = `dt_${sanitizedName}`;

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT id FROM dynamic_tables WHERE name = $1', [tableName]);
    if (existing.rows.length > 0) {
      throw new HttpError(400, 'TABLE_EXISTS', 'A table with this name already exists');
    }

    const createTableSQL = `
      CREATE TABLE ${tableName} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ${data.isUserLinked ? 'cin VARCHAR(20),' : ''}
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by UUID
      )
    `;
    await client.query(createTableSQL);

    const result = await client.query<DynamicTable>(
      `INSERT INTO dynamic_tables (name, display_name, description, is_user_linked, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [tableName, data.displayName, data.description || null, data.isUserLinked, data.createdBy]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    try { await client.query(`DROP TABLE IF EXISTS ${tableName}`); } catch {}
    throw err;
  } finally {
    client.release();
  }
}

export async function listTables(): Promise<DynamicTable[]> {
  const result = await query<DynamicTable>('SELECT * FROM dynamic_tables ORDER BY created_at DESC');
  return result.rows;
}

export async function getTableById(id: string): Promise<DynamicTable> {
  const result = await query<DynamicTable>('SELECT * FROM dynamic_tables WHERE id = $1', [id]);
  if (result.rows.length === 0) {
    throw new HttpError(404, 'TABLE_NOT_FOUND', 'Table not found');
  }
  return result.rows[0];
}

export async function updateTable(id: string, data: { displayName?: string; description?: string }): Promise<DynamicTable> {
  const updates: string[] = [];
  const values: any[] = [];
  let i = 1;

  if (data.displayName !== undefined) { updates.push(`display_name = $${i++}`); values.push(data.displayName); }
  if (data.description !== undefined) { updates.push(`description = $${i++}`); values.push(data.description); }

  if (updates.length === 0) {
    return getTableById(id);
  }

  values.push(id);
  const result = await query<DynamicTable>(
    `UPDATE dynamic_tables SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return result.rows[0];
}

export async function deleteTable(id: string): Promise<void> {
  const table = await getTableById(id);
  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query(`DROP TABLE IF EXISTS ${table.name}`);
    await client.query('DELETE FROM dynamic_tables WHERE id = $1', [id]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function addField(data: {
  tableId: string;
  name: string;
  displayName: string;
  fieldType: FieldType;
  configJson?: object;
  isRequired?: boolean;
  orderIndex?: number;
}): Promise<DynamicField> {
  const table = await getTableById(data.tableId);
  const sanitizedName = sanitizeIdentifier(data.name.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
  const columnType = sqlTypeForFieldType(data.fieldType);
  const defaultClause = data.isRequired ? '' : ' DEFAULT NULL';

  const client = await getClient();
  try {
    await client.query('BEGIN');

    await client.query(`ALTER TABLE ${table.name} ADD COLUMN ${sanitizedName} ${columnType}${defaultClause}`);

    const result = await client.query<DynamicField>(
      `INSERT INTO dynamic_fields (table_id, name, display_name, field_type, config_json, is_required, order_index)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [data.tableId, sanitizedName, data.displayName, data.fieldType, JSON.stringify(data.configJson || {}), data.isRequired || false, data.orderIndex || 0]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    try { await client.query(`ALTER TABLE ${table.name} DROP COLUMN IF EXISTS ${sanitizedName}`); } catch {}
    throw err;
  } finally {
    client.release();
  }
}

export async function listFields(tableId: string): Promise<DynamicField[]> {
  await getTableById(tableId);
  const result = await query<DynamicField>('SELECT * FROM dynamic_fields WHERE table_id = $1 ORDER BY order_index', [tableId]);
  return result.rows;
}

export async function getFieldById(id: string): Promise<DynamicField> {
  const result = await query<DynamicField>('SELECT * FROM dynamic_fields WHERE id = $1', [id]);
  if (result.rows.length === 0) {
    throw new HttpError(404, 'FIELD_NOT_FOUND', 'Field not found');
  }
  return result.rows[0];
}

export async function updateField(id: string, data: {
  displayName?: string;
  configJson?: object;
  isRequired?: boolean;
  orderIndex?: number;
}): Promise<DynamicField> {
  const field = await getFieldById(id);
  const updates: string[] = [];
  const values: any[] = [];
  let i = 1;

  if (data.displayName !== undefined) { updates.push(`display_name = $${i++}`); values.push(data.displayName); }
  if (data.configJson !== undefined) { updates.push(`config_json = $${i++}`); values.push(JSON.stringify(data.configJson)); }
  if (data.isRequired !== undefined) { updates.push(`is_required = $${i++}`); values.push(data.isRequired); }
  if (data.orderIndex !== undefined) { updates.push(`order_index = $${i++}`); values.push(data.orderIndex); }

  if (updates.length === 0) return field;

  values.push(id);
  const result = await query<DynamicField>(`UPDATE dynamic_fields SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`, values);
  return result.rows[0];
}

export async function deleteField(id: string): Promise<void> {
  const field = await getFieldById(id);
  const table = await getTableById(field.table_id);
  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query(`ALTER TABLE ${table.name} DROP COLUMN IF EXISTS ${field.name}`);
    await client.query('DELETE FROM dynamic_fields WHERE id = $1', [id]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}