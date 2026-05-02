import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { ADMIN_AUTH, SUPER_ADMIN_AUTH, MANAGER_AUTH, TEACHER_AUTH, STUDENT_AUTH, ALUMNI_AUTH, UUID_V4, INVALID_UUID } from './helpers.js';
import { mockDbQuery as mockQuery } from './setup.js';

vi.mock('../src/middleware/activity-logger.js', () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
  activityLogger: vi.fn().mockImplementation(() => (req: any, _res: any, next: any) => next()),
}));

const mockUser = {
  id: UUID_V4,
  cin: '12345678',
  email: 'test@iset.tn',
  first_name: 'Test',
  last_name: 'User',
  role: 'admin',
  is_active: true,
  must_change_password: false,
  password_hash: '$2a$12$hashedpassword',
};

describe('Auth Endpoints', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
    vi.resetAllMocks();
  });

  describe('POST /api/v1/auth/login', () => {
    it('should return 400 if identifier is missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ password: 'test' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 if password is missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ identifier: 'admin' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 if password is empty string', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ identifier: 'admin', password: '' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 for invalid credentials', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ identifier: 'wronguser', password: 'wrongpass' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return token and user on successful login', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ identifier: 'admin', password: 'change-me' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe('test@iset.tn');
    });

    it('should return 401 for deactivated account', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ ...mockUser, is_active: false }], rowCount: 1 });
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ identifier: '12345678', password: 'somepassword' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('ACCOUNT_DISABLED');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return user data with valid token', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 });
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set(ADMIN_AUTH);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('test@iset.tn');
    });

    it('should return 404 for nonexistent user', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set(ADMIN_AUTH);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/auth/change-password', () => {
    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .send({ currentPassword: 'old', newPassword: 'newpassword' });
      expect(res.status).toBe(401);
    });

    it('should return 400 if newPassword is less than 8 chars', async () => {
      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .set(ADMIN_AUTH)
        .send({ currentPassword: 'oldpass', newPassword: 'short' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 if currentPassword is missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .set(ADMIN_AUTH)
        .send({ newPassword: 'newpassword123' });
      expect(res.status).toBe(400);
    });

    it('should return 400 if current password is incorrect', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ password_hash: '$2a$12$wronghash' }], rowCount: 1 });
      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .set(ADMIN_AUTH)
        .send({ currentPassword: 'wrongcurrent', newPassword: 'newpassword123' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_PASSWORD');
    });
  });

  describe('PATCH /api/v1/auth/me', () => {
    it('should return 401 without token', async () => {
      const res = await request(app)
        .patch('/api/v1/auth/me')
        .send({ firstName: 'New' });
      expect(res.status).toBe(401);
    });

    it('should return 400 for invalid email', async () => {
      const res = await request(app)
        .patch('/api/v1/auth/me')
        .set(ADMIN_AUTH)
        .send({ email: 'invalid-email' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should update profile with valid data', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ ...mockUser, first_name: 'NewName' }], rowCount: 1 });
      const res = await request(app)
        .patch('/api/v1/auth/me')
        .set(ADMIN_AUTH)
        .send({ firstName: 'NewName' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/v1/admin/users/:id/reset-password (admin)', () => {
    it('should return 401 without token', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/users/${UUID_V4}/reset-password`);
      expect(res.status).toBe(401);
    });

    it('should return 403 for non-admin role (student)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/users/${UUID_V4}/reset-password`)
        .set(STUDENT_AUTH);
      expect(res.status).toBe(403);
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/users/${INVALID_UUID}/reset-password`)
        .set(ADMIN_AUTH);
      expect(res.status).toBe(400);
    });

    it('should reset password for admin', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      const res = await request(app)
        .post(`/api/v1/admin/users/${UUID_V4}/reset-password`)
        .set(ADMIN_AUTH);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tempPassword).toBeDefined();
    });
  });
});
