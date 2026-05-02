import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { ADMIN_AUTH, MANAGER_AUTH, TEACHER_AUTH, STUDENT_AUTH, UUID_V4, UUID_V4_2, INVALID_UUID } from './helpers.js';
import { mockDbQuery as mockQuery } from './setup.js';

vi.mock('../src/middleware/activity-logger.js', () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
  activityLogger: vi.fn().mockImplementation(() => (req: any, _res: any, next: any) => next()),
}));

const mockTemplate = {
  id: UUID_V4,
  name: 'Test Template',
  description: 'A template',
  prompt_template: 'Hello {{name}}',
  target_table_id: null,
  config_json: null,
  created_by: UUID_V4,
  created_at: new Date().toISOString(),
};

describe('Report Endpoints', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
    vi.resetAllMocks();
  });

  describe('GET /api/v1/reports/templates', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/v1/reports/templates');
      expect(res.status).toBe(401);
    });

    it('should return 403 for student', async () => {
      const res = await request(app)
        .get('/api/v1/reports/templates')
        .set(STUDENT_AUTH);
      expect(res.status).toBe(403);
    });

    it('should return 403 for teacher', async () => {
      const res = await request(app)
        .get('/api/v1/reports/templates')
        .set(TEACHER_AUTH);
      expect(res.status).toBe(403);
    });

    it('should list templates for manager', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockTemplate], rowCount: 1 });
      const res = await request(app)
        .get('/api/v1/reports/templates')
        .set(MANAGER_AUTH);
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/v1/reports/templates', () => {
    const validTemplate = {
      name: 'New Template',
      promptTemplate: 'Hello {{name}}',
    };

    it('should return 403 for student', async () => {
      const res = await request(app)
        .post('/api/v1/reports/templates')
        .set(STUDENT_AUTH)
        .send(validTemplate);
      expect(res.status).toBe(403);
    });

    it('should return 403 for manager (only admin+)', async () => {
      const res = await request(app)
        .post('/api/v1/reports/templates')
        .set(MANAGER_AUTH)
        .send(validTemplate);
      expect(res.status).toBe(403);
    });

    it('should return 400 for missing name', async () => {
      const res = await request(app)
        .post('/api/v1/reports/templates')
        .set(ADMIN_AUTH)
        .send({ promptTemplate: 'test' });
      expect(res.status).toBe(400);
    });

    it('should return 400 for missing promptTemplate', async () => {
      const res = await request(app)
        .post('/api/v1/reports/templates')
        .set(ADMIN_AUTH)
        .send({ name: 'test' });
      expect(res.status).toBe(400);
    });

    it('should create template for admin', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockTemplate], rowCount: 1 });
      const res = await request(app)
        .post('/api/v1/reports/templates')
        .set(ADMIN_AUTH)
        .send(validTemplate);
      expect(res.status).toBe(201);
    });
  });

  describe('DELETE /api/v1/reports/templates/:id', () => {
    it('should return 403 for manager', async () => {
      const res = await request(app)
        .delete(`/api/v1/reports/templates/${UUID_V4}`)
        .set(MANAGER_AUTH);
      expect(res.status).toBe(403);
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app)
        .delete(`/api/v1/reports/templates/${INVALID_UUID}`)
        .set(ADMIN_AUTH);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/reports/templates/:id/preview', () => {
    it('should return 400 for invalid UUID', async () => {
      const res = await request(app)
        .post(`/api/v1/reports/templates/${INVALID_UUID}/preview`)
        .set(MANAGER_AUTH)
        .send({ sampleData: { name: 'Test' } });
      expect(res.status).toBe(400);
    });
  });

  describe('Generated Reports', () => {
    describe('GET /api/v1/reports/reports', () => {
      it('should return 403 for student', async () => {
        const res = await request(app)
          .get('/api/v1/reports/reports')
          .set(STUDENT_AUTH);
        expect(res.status).toBe(403);
      });

      it('should list reports for manager', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
        mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 });
        const res = await request(app)
          .get('/api/v1/reports/reports')
          .set(MANAGER_AUTH);
        expect(res.status).toBe(200);
      });
    });

    describe('POST /api/v1/reports/reports', () => {
      it('should return 400 for missing templateId', async () => {
        const res = await request(app)
          .post('/api/v1/reports/reports')
          .set(MANAGER_AUTH)
          .send({ status: 'generated' });
        expect(res.status).toBe(400);
      });

      it('should return 400 for invalid templateId', async () => {
        const res = await request(app)
          .post('/api/v1/reports/reports')
          .set(MANAGER_AUTH)
          .send({ templateId: INVALID_UUID, status: 'generated' });
        expect(res.status).toBe(400);
      });
    });

  describe('POST /api/v1/reports/reports/generate', () => {
    it('should return 403 for student', async () => {
      const res = await request(app)
        .post('/api/v1/reports/reports/generate')
        .set(STUDENT_AUTH)
        .send({ templateId: UUID_V4, cin: '12345678' });
      expect(res.status).toBe(403);
    });

    it('should return 400 for missing cin', async () => {
      const res = await request(app)
        .post('/api/v1/reports/reports/generate')
        .set(MANAGER_AUTH)
        .send({ templateId: UUID_V4 });
      expect(res.status).toBe(400);
    });

    it('should return 400 for cin exceeding 50 chars', async () => {
      const res = await request(app)
        .post('/api/v1/reports/reports/generate')
        .set(MANAGER_AUTH)
        .send({ templateId: UUID_V4, cin: 'x'.repeat(51) });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/reports/reports/batch-generate', () => {
    it('should return 403 for manager (admin only)', async () => {
      const res = await request(app)
        .post('/api/v1/reports/reports/batch-generate')
        .set(MANAGER_AUTH)
        .send({ templateId: UUID_V4, cins: ['12345678'] });
      expect(res.status).toBe(403);
    });

    it('should return 400 for empty cins array', async () => {
      const res = await request(app)
        .post('/api/v1/reports/reports/batch-generate')
        .set(ADMIN_AUTH)
        .send({ templateId: UUID_V4, cins: [] });
      expect(res.status).toBe(400);
    });

    it('should return 400 for cins exceeding 50', async () => {
      const res = await request(app)
        .post('/api/v1/reports/reports/batch-generate')
        .set(ADMIN_AUTH)
        .send({ templateId: UUID_V4, cins: Array(51).fill('12345678') });
      expect(res.status).toBe(400);
    });
  });
  });
});
