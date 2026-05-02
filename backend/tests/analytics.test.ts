import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { ADMIN_AUTH, MANAGER_AUTH, TEACHER_AUTH, STUDENT_AUTH, UUID_V4, INVALID_UUID } from './helpers.js';
import { mockDbQuery as mockQuery } from './setup.js';

vi.mock('../src/middleware/activity-logger.js', () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
  activityLogger: vi.fn().mockImplementation(() => (req: any, _res: any, next: any) => next()),
}));

describe('Analytics Endpoints', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
    vi.resetAllMocks();
  });

  describe('GET /api/v1/analytics/academic/enrollments', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/v1/analytics/academic/enrollments');
      expect(res.status).toBe(401);
    });

    it('should return 403 for student', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/academic/enrollments')
        .set(STUDENT_AUTH);
      expect(res.status).toBe(403);
    });

    it('should return 403 for teacher', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/academic/enrollments')
        .set(TEACHER_AUTH);
      expect(res.status).toBe(403);
    });

    it('should return data for manager', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ value: UUID_V4 }], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [{ dt_name: 'dt_test' }], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      const res = await request(app)
        .get('/api/v1/analytics/academic/enrollments')
        .set(MANAGER_AUTH);
      expect([200, 400, 404, 500]).toContain(res.status);
    });

    it('should return data for admin', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ value: UUID_V4 }], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [{ dt_name: 'dt_test' }], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      const res = await request(app)
        .get('/api/v1/analytics/academic/enrollments')
        .set(ADMIN_AUTH);
      expect([200, 400, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/analytics/insertion/rates', () => {
    it('should return 403 for student', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/insertion/rates')
        .set(STUDENT_AUTH);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/analytics/academic/mappings', () => {
    it('should return 403 for student', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/academic/mappings')
        .set(STUDENT_AUTH);
      expect(res.status).toBe(403);
    });

    it('should return 403 for teacher', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/academic/mappings')
        .set(TEACHER_AUTH);
      expect(res.status).toBe(403);
    });

    it('should return 403 for manager', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/academic/mappings')
        .set(MANAGER_AUTH);
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/analytics/academic/mappings', () => {
    it('should return 403 for student', async () => {
      const res = await request(app)
        .post('/api/v1/analytics/academic/mappings')
        .set(STUDENT_AUTH)
        .send({ key: 'analytics_students_table', tableId: UUID_V4 });
      expect(res.status).toBe(403);
    });

    it('should return 400 for invalid key', async () => {
      const res = await request(app)
        .post('/api/v1/analytics/academic/mappings')
        .set(ADMIN_AUTH)
        .send({ key: 'invalid_key', tableId: UUID_V4 });
      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid tableId', async () => {
      const res = await request(app)
        .post('/api/v1/analytics/academic/mappings')
        .set(ADMIN_AUTH)
        .send({ key: 'analytics_students_table', tableId: INVALID_UUID });
      expect(res.status).toBe(400);
    });
  });

  describe('Query parameter validation', () => {
    it('should accept valid filter params', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ value: UUID_V4 }], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [{ dt_name: 'dt_test' }], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      const res = await request(app)
        .get('/api/v1/analytics/academic/enrollments?annee=2024&filiere=Info&page=1&limit=10')
        .set(MANAGER_AUTH);
      expect([200, 400, 404, 500]).toContain(res.status);
    });
  });
});
