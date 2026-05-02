import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../../config/database.js';
import { config } from '../../config/env.js';
import { HttpError } from '../../middleware/auth.js';



export interface AuthUser {
  id: string;
  cin: string | null;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  mustChangePassword: boolean;
}

function generateToken(user: AuthUser): string {
  return jwt.sign(
    { id: user.id, cin: user.cin, email: user.email, role: user.role },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  );
}

function mapDbUser(row: any): AuthUser {
  return {
    id: row.id,
    cin: row.cin,
    email: row.email,
    role: row.role,
    firstName: row.first_name,
    lastName: row.last_name,
    isActive: row.is_active,
    mustChangePassword: row.must_change_password,
  };
}

export async function login(identifier: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const result = await query<any>('SELECT * FROM users WHERE (cin = $1 OR role = $2) LIMIT 2', [identifier, 'super_admin']);

  for (const row of result.rows) {
    if ((row.role === 'super_admin' && identifier === config.SUPER_ADMIN_USERNAME) || row.cin === identifier) {
      if (!row.is_active) {
        throw new HttpError(401, 'ACCOUNT_DISABLED', 'Account has been deactivated');
      }
      const isMatch = await bcrypt.compare(password, row.password_hash);
      if (isMatch) {
        const user = mapDbUser(row);
        const token = generateToken(user);
        await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
        return { token, user };
      }
    }
  }

  throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid CIN or password');
}

export async function getMe(userId: string): Promise<AuthUser> {
  const result = await query<any>('SELECT * FROM users WHERE id = $1 LIMIT 1', [userId]);
  if (result.rows.length === 0) {
    throw new HttpError(404, 'USER_NOT_FOUND', 'User not found');
  }
  return mapDbUser(result.rows[0]);
}

export async function resetUserPassword(userId: string): Promise<string> {
  const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).toUpperCase().slice(-2);
  const passwordHash = await bcrypt.hash(tempPassword, config.BCRYPT_ROUNDS);
  await query(
    'UPDATE users SET password_hash = $1, must_change_password = true WHERE id = $2',
    [passwordHash, userId]
  );
  return tempPassword;
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const result = await query<any>('SELECT password_hash FROM users WHERE id = $1', [userId]);
  if (result.rows.length === 0) {
    throw new HttpError(404, 'USER_NOT_FOUND', 'User not found');
  }
  const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
  if (!valid) {
    throw new HttpError(400, 'INVALID_PASSWORD', 'Current password is incorrect');
  }
  const passwordHash = await bcrypt.hash(newPassword, config.BCRYPT_ROUNDS);
  await query('UPDATE users SET password_hash = $1, must_change_password = false WHERE id = $2', [passwordHash, userId]);
}

export async function updateProfile(userId: string, data: { firstName?: string; lastName?: string; email?: string }): Promise<AuthUser> {
  const sets: string[] = [];
  const values: any[] = [];
  let i = 1;

  if (data.firstName !== undefined) { sets.push(`first_name = $${i++}`); values.push(data.firstName); }
  if (data.lastName !== undefined) { sets.push(`last_name = $${i++}`); values.push(data.lastName); }
  if (data.email !== undefined) { sets.push(`email = $${i++}`); values.push(data.email); }

  if (sets.length === 0) return getMe(userId);

  values.push(userId);
  const result = await query<any>(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return mapDbUser(result.rows[0]);
}