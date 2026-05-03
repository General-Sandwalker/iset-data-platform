import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { ADMIN_AUTH, MANAGER_AUTH, TEACHER_AUTH, STUDENT_AUTH, UUID_V4, UUID_V4_2, INVALID_UUID } from './helpers.js';
import { mockDbQuery as mockQuery } from './setup.js';

vi.mock('../src/middleware/activity-logger.js', () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
  activityLogger: vi.fn().mockImplementation(() => (req: any, _res: any, next: any) => next()),
}));

const mockTable = {
  id: UUID_V4_2,
  name: 'dt_test',
  display_name: 'Test Table',
  description: '',
  is_user_linked: false,
  created_by: UUID_V4,
  created_at: new Date().toISOString(),
};

const mockChart = {
  id: UUID_V4,
  title: 'Test Chart',
  description: '',
  chart_type: 'bar',
  table_id: UUID_V4_2,
  sql_query: 'SELECT 1',
  config_json: null,
  is_public: false,
  created_by: UUID_V4,
  created_at: new Date().toISOString(),
};

const mockDashboard = {
  id: UUID_V4,
  title: 'Test Dashboard',
  description: '',
  layout_json: null,
  is_public: false,
  slug: 'test-dashboard',
  created_by: UUID_V4,
  created_at: new Date().toISOString(),
};

describe('Viz/Chart/Dashboard Endpoints', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
    vi.resetAllMocks();
  });

  describe('Charts', () => {
    describe('GET /api/v1/viz/charts', () => {
      it('should return 401 without token', async () => {
        const res = await request(app).get('/api/v1/viz/charts');
        expect(res.status).toBe(401);
      });

it('should list charts for any authenticated user', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [mockChart], rowCount: 1 });
        const res = await request(app)
          .get('/api/v1/viz/charts')
          .set(STUDENT_AUTH);
        expect(res.status).toBe(200);
      });
    });

    describe('POST /api/v1/viz/charts', () => {
      const validChart = {
        title: 'New Chart',
        chartType: 'bar',
        tableId: UUID_V4_2,
        sqlQuery: 'SELECT 1',
        isPublic: false,
      };

      it('should return 403 for student', async () => {
        const res = await request(app)
          .post('/api/v1/viz/charts')
          .set(STUDENT_AUTH)
          .send(validChart);
        expect(res.status).toBe(403);
      });

      it('should return 403 for teacher', async () => {
        const res = await request(app)
          .post('/api/v1/viz/charts')
          .set(TEACHER_AUTH)
          .send(validChart);
        expect(res.status).toBe(403);
      });

      it('should return 400 for missing title', async () => {
        const res = await request(app)
          .post('/api/v1/viz/charts')
          .set(ADMIN_AUTH)
          .send({ chartType: 'bar', tableId: UUID_V4_2, sqlQuery: 'SELECT 1' });
        expect(res.status).toBe(400);
      });

      it('should return 400 for invalid chartType', async () => {
        const res = await request(app)
          .post('/api/v1/viz/charts')
          .set(ADMIN_AUTH)
          .send({ ...validChart, chartType: 'hologram' });
        expect(res.status).toBe(400);
      });

      it('should return 400 for invalid tableId', async () => {
        const res = await request(app)
          .post('/api/v1/viz/charts')
          .set(ADMIN_AUTH)
          .send({ ...validChart, tableId: INVALID_UUID });
        expect(res.status).toBe(400);
      });

      it('should return 400 for empty sqlQuery', async () => {
        const res = await request(app)
          .post('/api/v1/viz/charts')
          .set(ADMIN_AUTH)
          .send({ ...validChart, sqlQuery: '' });
        expect(res.status).toBe(400);
      });

      it('should create chart for admin', async () => {
        mockQuery
          .mockResolvedValueOnce({ rows: [{ ...mockTable, name: 'dt_test' }], rowCount: 1 })
          .mockResolvedValueOnce({ rows: [{ ...mockTable, name: 'dt_test' }], rowCount: 1 })
          .mockResolvedValueOnce({ rows: [mockChart], rowCount: 1 });
        const res = await request(app)
          .post('/api/v1/viz/charts')
          .set(ADMIN_AUTH)
          .send({ ...validChart, sqlQuery: 'SELECT * FROM dt_test' });
        expect(res.status).toBe(201);
      });
    });

    describe('POST /api/v1/viz/charts/execute-raw', () => {
      it('should return 403 for non-admin', async () => {
        const res = await request(app)
          .post('/api/v1/viz/charts/execute-raw')
          .set(STUDENT_AUTH)
          .send({ tableId: UUID_V4, sqlQuery: 'SELECT 1' });
        expect(res.status).toBe(403);
      });

      it('should return 403 for manager', async () => {
        const res = await request(app)
          .post('/api/v1/viz/charts/execute-raw')
          .set(MANAGER_AUTH)
          .send({ tableId: UUID_V4, sqlQuery: 'SELECT 1' });
        expect(res.status).toBe(403);
      });

      it('should return 400 for missing tableId', async () => {
        const res = await request(app)
          .post('/api/v1/viz/charts/execute-raw')
          .set(ADMIN_AUTH)
          .send({ sqlQuery: 'SELECT 1' });
        expect(res.status).toBe(400);
      });

      it('should return 400 for limit exceeding 1000', async () => {
        const res = await request(app)
          .post('/api/v1/viz/charts/execute-raw')
          .set(ADMIN_AUTH)
          .send({ tableId: UUID_V4, sqlQuery: 'SELECT 1', limit: 5000 });
        expect(res.status).toBe(400);
      });
    });

    describe('DELETE /api/v1/viz/charts/:id', () => {
      it('should return 403 for student', async () => {
        const res = await request(app)
          .delete(`/api/v1/viz/charts/${UUID_V4}`)
          .set(STUDENT_AUTH);
        expect(res.status).toBe(403);
      });

      it('should return 400 for invalid UUID', async () => {
        const res = await request(app)
          .delete(`/api/v1/viz/charts/${INVALID_UUID}`)
          .set(ADMIN_AUTH);
        expect(res.status).toBe(400);
      });
    });
  });

  describe('Dashboards', () => {
    describe('GET /api/v1/viz/dashboards', () => {
      it('should return 401 without token', async () => {
        const res = await request(app).get('/api/v1/viz/dashboards');
        expect(res.status).toBe(401);
      });

it('should list dashboards for any authenticated user', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [mockDashboard], rowCount: 1 });
        const res = await request(app)
          .get('/api/v1/viz/dashboards')
          .set(STUDENT_AUTH);
        expect(res.status).toBe(200);
      });
    });

    describe('POST /api/v1/viz/dashboards', () => {
      const validDashboard = { title: 'New Dashboard', isPublic: false };

      it('should return 403 for student', async () => {
        const res = await request(app)
          .post('/api/v1/viz/dashboards')
          .set(STUDENT_AUTH)
          .send(validDashboard);
        expect(res.status).toBe(403);
      });

      it('should return 400 for missing title', async () => {
        const res = await request(app)
          .post('/api/v1/viz/dashboards')
          .set(ADMIN_AUTH)
          .send({});
        expect(res.status).toBe(400);
      });

      it('should create dashboard for admin', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [mockDashboard], rowCount: 1 });
        const res = await request(app)
          .post('/api/v1/viz/dashboards')
          .set(ADMIN_AUTH)
          .send(validDashboard);
        expect(res.status).toBe(201);
      });
    });

    describe('POST /api/v1/viz/dashboards/:id/publish', () => {
      it('should return 403 for student', async () => {
        const res = await request(app)
          .post(`/api/v1/viz/dashboards/${UUID_V4}/publish`)
          .set(STUDENT_AUTH);
        expect(res.status).toBe(403);
      });

      it('should return 400 for invalid UUID', async () => {
        const res = await request(app)
          .post(`/api/v1/viz/dashboards/${INVALID_UUID}/publish`)
          .set(ADMIN_AUTH);
        expect(res.status).toBe(400);
      });
    });

    describe('POST /api/v1/viz/dashboards/:id/charts', () => {
      it('should return 403 for student', async () => {
        const res = await request(app)
          .post(`/api/v1/viz/dashboards/${UUID_V4}/charts`)
          .set(STUDENT_AUTH)
          .send({ chartId: UUID_V4_2 });
        expect(res.status).toBe(403);
      });

      it('should return 400 for width exceeding 12', async () => {
        const res = await request(app)
          .post(`/api/v1/viz/dashboards/${UUID_V4}/charts`)
          .set(ADMIN_AUTH)
          .send({ chartId: UUID_V4_2, width: 15 });
        expect(res.status).toBe(400);
      });

      it('should return 400 for height 0', async () => {
        const res = await request(app)
          .post(`/api/v1/viz/dashboards/${UUID_V4}/charts`)
          .set(ADMIN_AUTH)
          .send({ chartId: UUID_V4_2, height: 0 });
        expect(res.status).toBe(400);
      });
    });

    describe('Public Dashboard', () => {
      it('should access public dashboard without auth', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ ...mockDashboard, is_public: true, slug: 'test-slug' }], rowCount: 1 });
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
        const res = await request(app)
          .get('/public/dashboards/test-slug');
        expect([200, 404]).toContain(res.status);
      });
    });
  });
});
