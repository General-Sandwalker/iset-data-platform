import { query, getClient } from '../config/database.js';
import { HttpError } from '../middleware/auth.js';
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

export const relationshipTypes = ['one_to_many', 'many_to_one'] as const;
export type RelationshipType = typeof relationshipTypes[number];

export interface DynamicRelationship {
  id: string;
  source_table_id: string;
  source_field_id: string;
  target_table_id: string;
  target_field_id: string | null;
  relationship_type: RelationshipType;
  created_at: string;
}

interface RelationshipInfo extends DynamicRelationship {
  source_table_name: string;
  source_field_name: string;
  target_table_name: string;
  target_field_name: string | null;
}

async function detectCircularRelationship(
  sourceTableId: string,
  targetTableId: string,
  excludeRelationshipId?: string
): Promise<boolean> {
  if (sourceTableId === targetTableId) return false;

  const visited = new Set<string>();
  const queue = [targetTableId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === sourceTableId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    const rels = await query<{ target_table_id: string }>(
      `SELECT target_table_id FROM dynamic_relationships WHERE source_table_id = $1 AND id != $2`,
      [current, excludeRelationshipId || '00000000-0000-0000-0000-000000000000']
    );
    for (const row of rels.rows) {
      queue.push(row.target_table_id);
    }
  }

  return false;
}

export async function createRelationship(data: {
  sourceTableId: string;
  sourceFieldId: string;
  targetTableId: string;
  targetFieldId?: string;
  relationshipType: RelationshipType;
}): Promise<DynamicRelationship> {
  const sourceTable = await getTableById(data.sourceTableId);
  const sourceField = await getFieldById(data.sourceFieldId);
  if (sourceField.table_id !== data.sourceTableId) {
    throw new HttpError(400, 'FIELD_MISMATCH', 'Source field does not belong to source table');
  }

  const targetTable = await getTableById(data.targetTableId);

  let targetField: DynamicField | null = null;
  if (data.targetFieldId) {
    targetField = await getFieldById(data.targetFieldId);
    if (targetField.table_id !== data.targetTableId) {
      throw new HttpError(400, 'FIELD_MISMATCH', 'Target field does not belong to target table');
    }
  }

  if (sourceField.field_type === 'user_link') {
    if (data.relationshipType !== 'many_to_one') {
      throw new HttpError(400, 'INVALID_RELATIONSHIP', 'user_link fields must use many_to_one relationship type');
    }
    if (targetTable.name !== 'users' && !targetTable.is_user_linked) {
      throw new HttpError(400, 'INVALID_TARGET', 'user_link relationship target must be users table or a user-linked table');
    }
  }

  const existing = await query(
    `SELECT id FROM dynamic_relationships WHERE source_table_id = $1 AND source_field_id = $2`,
    [data.sourceTableId, data.sourceFieldId]
  );
  if (existing.rows.length > 0) {
    throw new HttpError(400, 'RELATIONSHIP_EXISTS', 'A relationship already exists for this source field');
  }

  if (await detectCircularRelationship(data.sourceTableId, data.targetTableId)) {
    throw new HttpError(400, 'CIRCULAR_RELATIONSHIP', 'This relationship would create a circular dependency');
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const result = await client.query<DynamicRelationship>(
      `INSERT INTO dynamic_relationships (source_table_id, source_field_id, target_table_id, target_field_id, relationship_type)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.sourceTableId, data.sourceFieldId, data.targetTableId, data.targetFieldId || null, data.relationshipType]
    );

    if (sourceField.field_type !== 'user_link') {
      const fkName = `fk_rel_${result.rows[0].id.replace(/-/g, '_')}`;
      const targetColumn = targetField
        ? targetField.name
        : 'id';

      try {
        await client.query(
          `ALTER TABLE ${sourceTable.name} ADD CONSTRAINT ${fkName}
           FOREIGN KEY (${sourceField.name}) REFERENCES ${targetTable.name}(${targetColumn}) ON DELETE SET NULL`
        );
      } catch (fkErr: any) {
        if (!fkErr.message?.includes('already exists') && !fkErr.message?.includes('cannot reference')) {
          console.warn(`Could not create FK constraint ${fkName}: ${fkErr.message}`);
        }
      }
    }

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function listRelationships(tableId?: string): Promise<RelationshipInfo[]> {
  let sql = `
    SELECT r.*,
      st.name as source_table_name,
      sf.name as source_field_name,
      tt.name as target_table_name,
      tf.name as target_field_name
    FROM dynamic_relationships r
    JOIN dynamic_tables st ON r.source_table_id = st.id
    JOIN dynamic_fields sf ON r.source_field_id = sf.id
    JOIN dynamic_tables tt ON r.target_table_id = tt.id
    LEFT JOIN dynamic_fields tf ON r.target_field_id = tf.id
  `;
  const params: any[] = [];

  if (tableId) {
    sql += ` WHERE r.source_table_id = $1 OR r.target_table_id = $1`;
    params.push(tableId);
  }

  sql += ` ORDER BY r.created_at DESC`;
  const result = await query<RelationshipInfo>(sql, params);
  return result.rows;
}

export async function getRelationshipById(id: string): Promise<RelationshipInfo> {
  const result = await query<RelationshipInfo>(
    `SELECT r.*,
      st.name as source_table_name,
      sf.name as source_field_name,
      tt.name as target_table_name,
      tf.name as target_field_name
    FROM dynamic_relationships r
    JOIN dynamic_tables st ON r.source_table_id = st.id
    JOIN dynamic_fields sf ON r.source_field_id = sf.id
    JOIN dynamic_tables tt ON r.target_table_id = tt.id
    LEFT JOIN dynamic_fields tf ON r.target_field_id = tf.id
    WHERE r.id = $1`,
    [id]
  );
  if (result.rows.length === 0) {
    throw new HttpError(404, 'RELATIONSHIP_NOT_FOUND', 'Relationship not found');
  }
  return result.rows[0];
}

export async function updateRelationship(id: string, data: {
  relationshipType?: RelationshipType;
  targetFieldId?: string;
}): Promise<DynamicRelationship> {
  const existing = await getRelationshipById(id);
  const updates: string[] = [];
  const values: any[] = [];
  let i = 1;

  if (data.relationshipType !== undefined) {
    updates.push(`relationship_type = $${i++}`);
    values.push(data.relationshipType);
  }

  if (data.targetFieldId !== undefined) {
    const targetField = await getFieldById(data.targetFieldId);
    if (targetField.table_id !== existing.target_table_id) {
      throw new HttpError(400, 'FIELD_MISMATCH', 'Target field does not belong to target table');
    }
    updates.push(`target_field_id = $${i++}`);
    values.push(data.targetFieldId);
  }

  if (updates.length === 0) {
    const base = await query<DynamicRelationship>('SELECT * FROM dynamic_relationships WHERE id = $1', [id]);
    return base.rows[0];
  }

  values.push(id);
  const result = await query<DynamicRelationship>(
    `UPDATE dynamic_relationships SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return result.rows[0];
}

export async function deleteRelationship(id: string): Promise<void> {
  const relationship = await getRelationshipById(id);
  const sourceTable = await getTableById(relationship.source_table_id);
  const sourceField = await getFieldById(relationship.source_field_id);

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const fkName = `fk_rel_${id.replace(/-/g, '_')}`;
    try {
      await client.query(`ALTER TABLE ${sourceTable.name} DROP CONSTRAINT IF EXISTS ${fkName}`);
    } catch {}

    await client.query('DELETE FROM dynamic_relationships WHERE id = $1', [id]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}