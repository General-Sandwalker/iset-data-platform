import bcrypt from 'bcrypt';
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
    { expiresIn: config.JWT_EXPIRES_IN }
  );
}

function sanitizeUser(user: AuthUser): Omit<AuthUser, 'passwordHash'> {
  const { passwordHash: _, ...result } = user as any;
  return result;
}

export async function login(identifier: string, password: string): Promise<{ token: string; user: Omit<AuthUser, 'passwordHash'> }> {
  if (identifier === config.SUPER_ADMIN_USERNAME && password === config.SUPER_ADMIN_PASSWORD) {
    const result = await query<AuthUser & { password_hash: string }>(
      "SELECT * FROM users WHERE role = 'super_admin' LIMIT 1"
    );
    const user = result.rows[0];
    if (!user) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
    }
    const token = generateToken({ ...user, firstName: user.first_name, lastName: user.last_name });
    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
    return { token, user: sanitizeUser({ ...user, firstName: user.first_name, lastName: user.last_name }) };
  }

  const result = await query<AuthUser & { password_hash: string }>(
    'SELECT * FROM users WHERE cin = $1 LIMIT 1',
    [identifier]
  );

  if (result.rows.length === 0) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid CIN or password');
  }

  const user = result.rows[0];

  if (!user.is_active) {
    throw new HttpError(401, 'ACCOUNT_DISABLED', 'Your account has been deactivated');
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid CIN or password');
  }

  const token = generateToken({ ...user, firstName: user.first_name, lastName: user.last_name });
  await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

  return { token, user: sanitizeUser({ ...user, firstName: user.first_name, lastName: user.last_name }) };
}

export async function getMe(userId: string): Promise<Omit<AuthUser, 'passwordHash'>> {
  const result = await query<AuthUser & { password_hash: string }>(
    'SELECT * FROM users WHERE id = $1 LIMIT 1',
    [userId]
  );
  if (result.rows.length === 0) {
    throw new HttpError(404, 'USER_NOT_FOUND', 'User not found');
  }
  const user = result.rows[0];
  return sanitizeUser({ ...user, firstName: user.first_name, lastName: user.last_name });
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
  const result = await query<{ password_hash: string }>(
    'SELECT password_hash FROM users WHERE id = $1',
    [userId]
  );
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