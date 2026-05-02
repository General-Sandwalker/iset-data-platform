import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { ADMIN_AUTH, SUPER_ADMIN_AUTH, MANAGER_AUTH, TEACHER_AUTH, STUDENT_AUTH, UUID_V4, UUID_V4_2, INVALID_UUID } from './helpers.js';
import { mockDbQuery as mockQuery, mockDbGetClient as mockGetClient } from './setup.js';

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
  phone: null,
};

describe('User CRUD Endpoints', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
    vi.resetAllMocks();
  });

  describe('POST /api/v1/users', () => {
    const validUser = {
      cin: '12345679',
      email: 'new@iset.tn',
      firstName: 'New',
      lastName: 'User',
      role: 'enseignant',
      phone: '99999999',
    };

    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .send(validUser);
      expect(res.status).toBe(401);
    });

    it('should return 403 for student role', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .set(STUDENT_AUTH)
        .send(validUser);
      expect(res.status).toBe(403);
    });

    it('should return 403 for teacher role', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .set(TEACHER_AUTH)
        .send(validUser);
      expect(res.status).toBe(403);
    });

    it('should return 403 for manager role (responsable_observatoire)', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .set(MANAGER_AUTH)
        .send(validUser);
      expect(res.status).toBe(403);
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .set(ADMIN_AUTH)
        .send({ firstName: 'Only' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid email', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .set(ADMIN_AUTH)
        .send({ ...validUser, email: 'bad-email' });
      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid role', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .set(ADMIN_AUTH)
        .send({ ...validUser, role: 'hacker' });
      expect(res.status).toBe(400);
    });

    it('should create user for admin', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ ...mockUser, id: UUID_V4_2, cin: '12345679', email: 'new@iset.tn', temp_password: expect.any(String) }], rowCount: 1 });
      const res = await request(app)
        .post('/api/v1/users')
        .set(ADMIN_AUTH)
        .send(validUser);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should create user for super_admin', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ ...mockUser, id: UUID_V4_2 }], rowCount: 1 });
      const res = await request(app)
        .post('/api/v1/users')
        .set(SUPER_ADMIN_AUTH)
        .send(validUser);
      expect(res.status).toBe(201);
    });
  });

  describe('GET /api/v1/users', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/v1/users');
      expect(res.status).toBe(401);
    });

    it('should return 403 for student', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set(STUDENT_AUTH);
      expect(res.status).toBe(403);
    });

    it('should return users for admin', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 });
      const res = await request(app)
        .get('/api/v1/users')
        .set(ADMIN_AUTH);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should accept query params', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 });
      const res = await request(app)
        .get('/api/v1/users?role=admin&search=test&page=1&limit=10')
        .set(ADMIN_AUTH);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get(`/api/v1/users/${UUID_V4}`);
      expect(res.status).toBe(401);
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app)
        .get(`/api/v1/users/${INVALID_UUID}`)
        .set(ADMIN_AUTH);
      expect(res.status).toBe(400);
    });

    it('should return user for admin', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 });
      const res = await request(app)
        .get(`/api/v1/users/${UUID_V4}`)
        .set(ADMIN_AUTH);
      expect(res.status).toBe(200);
    });

    it('should return 404 for nonexistent user', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      const res = await request(app)
        .get(`/api/v1/users/${UUID_V4}`)
        .set(ADMIN_AUTH);
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/users/:id', () => {
    it('should return 403 for student', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${UUID_V4}`)
        .set(STUDENT_AUTH)
        .send({ firstName: 'Hacked' });
      expect(res.status).toBe(403);
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${INVALID_UUID}`)
        .set(ADMIN_AUTH)
        .send({ firstName: 'New' });
      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid email in body', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${UUID_V4}`)
        .set(ADMIN_AUTH)
        .send({ email: 'not-an-email' });
      expect(res.status).toBe(400);
    });

    it('should update user for admin', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ ...mockUser, first_name: 'Updated' }], rowCount: 1 });
      const res = await request(app)
        .patch(`/api/v1/users/${UUID_V4}`)
        .set(ADMIN_AUTH)
        .send({ firstName: 'Updated' });
      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/v1/users/:id', () => {
    it('should return 403 for student', async () => {
      const res = await request(app)
        .delete(`/api/v1/users/${UUID_V4}`)
        .set(STUDENT_AUTH);
      expect(res.status).toBe(403);
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app)
        .delete(`/api/v1/users/${INVALID_UUID}`)
        .set(ADMIN_AUTH);
      expect(res.status).toBe(400);
    });

    it('should delete user for admin', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });
      const res = await request(app)
        .delete(`/api/v1/users/${UUID_V4}`)
        .set(ADMIN_AUTH);
      expect(res.status).toBe(200);
    });
  });
});
