import bcrypt from 'bcryptjs';
import { query } from '../../config/database.js';
import { HttpError } from '../../middleware/auth.js';
import type { Request } from 'express';

const BCRYPT_ROUNDS = 12;

export interface User {
  id: string;
  cin: string | null;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  is_active: boolean;
  must_change_password: boolean;
  created_at: Date;
  updated_at: Date;
  last_login: Date | null;
}

export interface CreateUserInput {
  cin?: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string;
  password?: string;
}

export interface UpdateUserInput {
  cin?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  phone?: string;
  isActive?: boolean;
}

function generateTempPassword(): string {
  return Math.random().toString(36).slice(-8) + Math.random().toString(36).toUpperCase().slice(-2);
}

export async function createUser(input: CreateUserInput, createdBy: string): Promise<User & { tempPassword?: string }> {
  if (input.cin) {
    const existing = await query('SELECT id FROM users WHERE cin = $1', [input.cin]);
    if (existing.rows.length > 0) {
      throw new HttpError(400, 'CIN_EXISTS', 'A user with this CIN already exists');
    }
  }

  const existingEmail = await query('SELECT id FROM users WHERE email = $1', [input.email]);
  if (existingEmail.rows.length > 0) {
    throw new HttpError(400, 'EMAIL_EXISTS', 'A user with this email already exists');
  }

  const tempPassword = input.password || generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);

  const result = await query<User>(
    `INSERT INTO users (cin, email, password_hash, role, first_name, last_name, phone, is_active, must_change_password, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true, true, $8)
     RETURNING *`,
    [input.cin || null, input.email, passwordHash, input.role, input.firstName, input.lastName, input.phone || null, createdBy]
  );

  return { ...result.rows[0], tempPassword };
}

export async function listUsers(params: {
  page?: number;
  limit?: number;
  role?: string;
  search?: string;
}): Promise<{ users: User[]; total: number }> {
  const page = params.page || 1;
  const limit = Math.min(params.limit || 20, 100);
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE 1=1';
  const values: any[] = [];
  let paramIndex = 1;

  if (params.role) {
    whereClause += ` AND role = $${paramIndex++}`;
    values.push(params.role);
  }

  if (params.search) {
    whereClause += ` AND (cin ILIKE $${paramIndex} OR first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
    values.push(`%${params.search}%`);
    paramIndex++;
  }

  const countResult = await query<{ count: string }>(`SELECT COUNT(*) as count FROM users ${whereClause}`, values);
  const total = parseInt(countResult.rows[0].count);

  const result = await query<User>(
    `SELECT * FROM users ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...values, limit, offset]
  );

  return { users: result.rows, total };
}

export async function getUserById(id: string): Promise<User> {
  const result = await query<User>('SELECT * FROM users WHERE id = $1', [id]);
  if (result.rows.length === 0) {
    throw new HttpError(404, 'USER_NOT_FOUND', 'User not found');
  }
  return result.rows[0];
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<User> {
  const existing = await getUserById(id);

  const updates: string[] = [];
  const values: any[] = [];
  let i = 1;

  if (input.email !== undefined && input.email !== existing.email) {
    const emailExists = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [input.email, id]);
    if (emailExists.rows.length > 0) {
      throw new HttpError(400, 'EMAIL_EXISTS', 'Email already in use');
    }
    updates.push(`email = $${i++}`);
    values.push(input.email);
  }

  if (input.cin !== undefined) {
    const cinExists = await query('SELECT id FROM users WHERE cin = $1 AND id != $2', [input.cin, id]);
    if (cinExists.rows.length > 0) {
      throw new HttpError(400, 'CIN_EXISTS', 'CIN already in use');
    }
    updates.push(`cin = $${i++}`);
    values.push(input.cin);
  }

  if (input.firstName !== undefined) { updates.push(`first_name = $${i++}`); values.push(input.firstName); }
  if (input.lastName !== undefined) { updates.push(`last_name = $${i++}`); values.push(input.lastName); }
  if (input.role !== undefined) { updates.push(`role = $${i++}`); values.push(input.role); }
  if (input.phone !== undefined) { updates.push(`phone = $${i++}`); values.push(input.phone); }
  if (input.isActive !== undefined) { updates.push(`is_active = $${i++}`); values.push(input.isActive); }

  if (updates.length === 0) {
    return existing;
  }

  updates.push(`updated_at = NOW()`);
  values.push(id);

  const result = await query<User>(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );

  return result.rows[0];
}

export async function deleteUser(id: string): Promise<void> {
  const user = await getUserById(id);
  if (user.role === 'super_admin') {
    throw new HttpError(403, 'FORBIDDEN', 'Cannot delete super admin');
  }
  await query('DELETE FROM users WHERE id = $1', [id]);
}