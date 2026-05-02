import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

export type Role = 'super_admin' | 'admin' | 'responsable_observatoire' | 'enseignant' | 'etudiant' | 'alumni';

export function generateToken(overrides: {
  id?: string;
  cin?: string | null;
  email?: string;
  role?: Role;
} = {}): string {
  const payload = {
    id: overrides.id || '00000000-0000-0000-0000-000000000001',
    cin: overrides.cin ?? '12345678',
    email: overrides.email || 'test@iset.tn',
    role: overrides.role || 'admin',
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

export function authHeader(role?: Role, overrides?: Record<string, any>): Record<string, string> {
  const token = generateToken({ role, ...overrides });
  return { Authorization: `Bearer ${token}` };
}

export const ADMIN_TOKEN = generateToken({ role: 'admin' });
export const SUPER_ADMIN_TOKEN = generateToken({ role: 'super_admin' });
export const MANAGER_TOKEN = generateToken({ role: 'responsable_observatoire' });
export const TEACHER_TOKEN = generateToken({ role: 'enseignant' });
export const STUDENT_TOKEN = generateToken({ role: 'etudiant', cin: 'STU12345' });
export const ALUMNI_TOKEN = generateToken({ role: 'alumni', cin: 'ALU12345' });

export const ADMIN_AUTH = { Authorization: `Bearer ${ADMIN_TOKEN}` };
export const SUPER_ADMIN_AUTH = { Authorization: `Bearer ${SUPER_ADMIN_TOKEN}` };
export const MANAGER_AUTH = { Authorization: `Bearer ${MANAGER_TOKEN}` };
export const TEACHER_AUTH = { Authorization: `Bearer ${TEACHER_TOKEN}` };
export const STUDENT_AUTH = { Authorization: `Bearer ${STUDENT_TOKEN}` };
export const ALUMNI_AUTH = { Authorization: `Bearer ${ALUMNI_TOKEN}` };

export const UUID_V4 = '00000000-0000-0000-0000-000000000001';
export const UUID_V4_2 = '00000000-0000-0000-0000-000000000002';
export const UUID_V4_3 = '00000000-0000-0000-0000-000000000003';
export const INVALID_UUID = 'not-a-uuid';
