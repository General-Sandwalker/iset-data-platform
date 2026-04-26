import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../../config/database.js';
import { config } from '../../config/env.js';
import { HttpError } from '../../middleware/auth.js';

const BCRYPT_ROUNDS = 12;

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
    { expiresIn: '24h' }
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
  if (identifier === config.SUPER_ADMIN_USERNAME && password === config.SUPER_ADMIN_PASSWORD) {
    const result = await query<any>("SELECT * FROM users WHERE role = 'super_admin' LIMIT 1");
    const user = mapDbUser(result.rows[0]);
    if (!user) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
    }
    const token = generateToken(user);
    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
    return { token, user };
  }

  const result = await query<any>('SELECT * FROM users WHERE cin = $1 LIMIT 1', [identifier]);

  if (result.rows.length === 0) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid CIN or password');
  }

  const row = result.rows[0];

  if (!row.is_active) {
    throw new HttpError(401, 'ACCOUNT_DISABLED', 'Your account has been deactivated');
  }

  const validPassword = await bcrypt.compare(password, row.password_hash);
  if (!validPassword) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid CIN or password');
  }

  const user = mapDbUser(row);
  const token = generateToken(user);
  await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

  return { token, user };
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
  const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);
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
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await query('UPDATE users SET password_hash = $1, must_change_password = false WHERE id = $2', [passwordHash, userId]);
}