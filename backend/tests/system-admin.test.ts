import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { ADMIN_AUTH, MANAGER_AUTH, TEACHER_AUTH, STUDENT_AUTH, UUID_V4, UUID_V4_2, INVALID_UUID } from './helpers.js';
import { mockDbQuery as mockQuery, mockDbGetClient as mockGetClient } from './setup.js';

vi.mock('../src/middleware/activity-logger.js', () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
  activityLogger: vi.fn().mockImplementation(() => (req: any, _res: any, next: any) => next()),
}));

describe('System Admin Endpoints', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
    vi.resetAllMocks();
  });

  describe('Settings', () => {
    describe('GET /api/v1/system/settings', () => {
      it('should return 401 without token', async () => {
        const res = await request(app).get('/api/v1/system/settings');
        expect(res.status).toBe(401);
      });

      it('should list settings for any authenticated user', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
        const res = await request(app)
          .get('/api/v1/system/settings')
          .set(STUDENT_AUTH);
        expect(res.status).toBe(200);
      });
    });

    describe('PUT /api/v1/system/settings/:key', () => {
      it('should return 403 for student', async () => {
        const res = await request(app)
          .put('/api/v1/system/settings/test_key')
          .set(STUDENT_AUTH)
          .send({ value: { test: true } });
        expect(res.status).toBe(403);
      });

      it('should return 403 for teacher', async () => {
        const res = await request(app)
          .put('/api/v1/system/settings/test_key')
          .set(TEACHER_AUTH)
          .send({ value: { test: true } });
        expect(res.status).toBe(403);
      });

      it('should return 403 for manager', async () => {
        const res = await request(app)
          .put('/api/v1/system/settings/test_key')
          .set(MANAGER_AUTH)
          .send({ value: { test: true } });
        expect(res.status).toBe(403);
      });

      it('should upsert setting for admin', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ key: 'test_key', value: { test: true }, updated_at: new Date() }], rowCount: 1 });
        const res = await request(app)
          .put('/api/v1/system/settings/test_key')
          .set(ADMIN_AUTH)
          .send({ value: { test: true } });
        expect(res.status).toBe(200);
      });
    });

    describe('DELETE /api/v1/system/settings/:key', () => {
      it('should return 403 for student', async () => {
        const res = await request(app)
          .delete('/api/v1/system/settings/test_key')
          .set(STUDENT_AUTH);
        expect(res.status).toBe(403);
      });

      it('should delete setting for admin', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ key: 'test_key' }], rowCount: 1 });
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
        const res = await request(app)
          .delete('/api/v1/system/settings/test_key')
          .set(ADMIN_AUTH);
        expect(res.status).toBe(200);
      });

      it('should return 404 for nonexistent setting', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
        const res = await request(app)
          .delete('/api/v1/system/settings/nonexistent')
          .set(ADMIN_AUTH);
        expect(res.status).toBe(404);
      });
    });
  });

  describe('Academic Years', () => {
    describe('GET /api/v1/system/academic-years', () => {
      it('should list academic years for any authenticated user', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
        const res = await request(app)
          .get('/api/v1/system/academic-years')
          .set(STUDENT_AUTH);
        expect(res.status).toBe(200);
      });
    });

    describe('POST /api/v1/system/academic-years', () => {
      const validYear = {
        year: '2024-2025',
        startDate: '2024-09-01',
        endDate: '2025-06-30',
        isCurrent: true,
      };

      it('should return 403 for student', async () => {
        const res = await request(app)
          .post('/api/v1/system/academic-years')
          .set(STUDENT_AUTH)
          .send(validYear);
        expect(res.status).toBe(403);
      });

      it('should return 403 for manager', async () => {
        const res = await request(app)
          .post('/api/v1/system/academic-years')
          .set(MANAGER_AUTH)
          .send(validYear);
        expect(res.status).toBe(403);
      });

      it('should return 400 for missing year', async () => {
        const res = await request(app)
          .post('/api/v1/system/academic-years')
          .set(ADMIN_AUTH)
          .send({ startDate: '2024-09-01', endDate: '2025-06-30' });
        expect(res.status).toBe(400);
      });

      it('should return 400 for year exceeding 9 chars', async () => {
        const res = await request(app)
          .post('/api/v1/system/academic-years')
          .set(ADMIN_AUTH)
          .send({ ...validYear, year: '1234567890' });
        expect(res.status).toBe(400);
      });

      it('should return 400 for missing startDate', async () => {
        const res = await request(app)
          .post('/api/v1/system/academic-years')
          .set(ADMIN_AUTH)
          .send({ year: '2024-2025', endDate: '2025-06-30' });
        expect(res.status).toBe(400);
      });

      it('should create academic year for admin', async () => {
        const mockClient = {
          query: vi.fn()
            .mockResolvedValueOnce({ rows: [], rowCount: 0 })
            .mockResolvedValueOnce({ rows: [], rowCount: 0 })
            .mockResolvedValueOnce({ rows: [{ id: UUID_V4, year: '2024-2025', start_date: '2024-09-01', end_date: '2025-06-30', is_current: true, created_at: new Date() }], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [], rowCount: 0 }),
          release: vi.fn(),
        };
        mockGetClient.mockResolvedValueOnce(mockClient as any);
        const res = await request(app)
          .post('/api/v1/system/academic-years')
          .set(ADMIN_AUTH)
          .send(validYear);
        expect(res.status).toBe(201);
      });
    });

    describe('PATCH /api/v1/system/academic-years/:id', () => {
      it('should return 400 for invalid UUID', async () => {
        const res = await request(app)
          .patch(`/api/v1/system/academic-years/${INVALID_UUID}`)
          .set(ADMIN_AUTH)
          .send({ year: '2025-2026' });
        expect(res.status).toBe(400);
      });
    });

    describe('DELETE /api/v1/system/academic-years/:id', () => {
      it('should return 403 for manager', async () => {
        const res = await request(app)
          .delete(`/api/v1/system/academic-years/${UUID_V4}`)
          .set(MANAGER_AUTH);
        expect(res.status).toBe(403);
      });

      it('should return 400 for invalid UUID', async () => {
        const res = await request(app)
          .delete(`/api/v1/system/academic-years/${INVALID_UUID}`)
          .set(ADMIN_AUTH);
        expect(res.status).toBe(400);
      });
    });
  });

  describe('Activity Logs', () => {
    describe('GET /api/v1/system/activity-logs', () => {
      it('should return 401 without token', async () => {
        const res = await request(app).get('/api/v1/system/activity-logs');
        expect(res.status).toBe(401);
      });

      it('should return 403 for student', async () => {
        const res = await request(app)
          .get('/api/v1/system/activity-logs')
          .set(STUDENT_AUTH);
        expect(res.status).toBe(403);
      });

      it('should return 403 for teacher', async () => {
        const res = await request(app)
          .get('/api/v1/system/activity-logs')
          .set(TEACHER_AUTH);
        expect(res.status).toBe(403);
      });

      it('should return 403 for manager', async () => {
        const res = await request(app)
          .get('/api/v1/system/activity-logs')
          .set(MANAGER_AUTH);
        expect(res.status).toBe(403);
      });

      it('should list logs for admin', async () => {
        mockQuery.mockReset();
        mockQuery
          .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
          .mockResolvedValueOnce({ rows: [], rowCount: 0 });
        const res = await request(app)
          .get('/api/v1/system/activity-logs')
          .set(ADMIN_AUTH);
        expect(res.status).toBe(200);
      });

      it('should accept query filters', async () => {
        mockQuery
          .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
          .mockResolvedValueOnce({ rows: [], rowCount: 0 });
        const res = await request(app)
          .get(`/api/v1/system/activity-logs?userId=${UUID_V4}&action=LOGIN&page=1&limit=10`)
          .set(ADMIN_AUTH);
        expect(res.status).toBe(200);
      });

      it('should return 400 for invalid userId filter', async () => {
        const res = await request(app)
          .get('/api/v1/system/activity-logs?userId=not-uuid')
          .set(ADMIN_AUTH);
        expect(res.status).toBe(400);
      });
    });
  });
});
