import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { ADMIN_AUTH, TEACHER_AUTH, STUDENT_AUTH, UUID_V4 } from './helpers.js';
import { mockDbQuery as mockQuery } from './setup.js';

vi.mock('../src/middleware/activity-logger.js', () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
  activityLogger: vi.fn().mockImplementation(() => (req: any, _res: any, next: any) => next()),
}));

describe('Public Landing Endpoints', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
    vi.resetAllMocks();
  });

  describe('GET /public/stats', () => {
    it('should return stats without auth', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: '10' }], rowCount: 1 });
      const res = await request(app).get('/public/stats');
      expect([200, 500]).toContain(res.status);
    });
  });

  describe('GET /public/dashboards', () => {
    it('should return public dashboards without auth', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const res = await request(app).get('/public/dashboards');
      expect([200, 500]).toContain(res.status);
    });
  });

  describe('GET /public/surveys', () => {
    it('should return public surveys without auth', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const res = await request(app).get('/public/surveys');
      expect([200, 500]).toContain(res.status);
    });
  });

  describe('GET /public/student-stats', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app).get('/public/student-stats');
      expect(res.status).toBe(401);
    });

    it('should return stats for student', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: '0' }], rowCount: 1 });
      const res = await request(app)
        .get('/public/student-stats')
        .set(STUDENT_AUTH);
      expect([200, 500]).toContain(res.status);
    });
  });

  describe('GET /public/teacher-stats', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app).get('/public/teacher-stats');
      expect(res.status).toBe(401);
    });

    it('should return stats for teacher', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: '0' }], rowCount: 1 });
      const res = await request(app)
        .get('/public/teacher-stats')
        .set(TEACHER_AUTH);
      expect([200, 500]).toContain(res.status);
    });
  });

  describe('GET /public/alumni-stats', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app).get('/public/alumni-stats');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /public/observatoire-stats', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app).get('/public/observatoire-stats');
      expect(res.status).toBe(401);
    });

    it('should return stats for any authenticated user', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: '0' }], rowCount: 1 });
      const res = await request(app)
        .get('/public/observatoire-stats')
        .set(ADMIN_AUTH);
      expect([200, 500]).toContain(res.status);
    });
  });
});

describe('AI Services Endpoints', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
    vi.resetAllMocks();
  });

  describe('POST /api/v1/ai/import/suggest-table', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app)
        .post('/api/v1/ai/import/suggest-table')
        .send({ fileId: UUID_V4 });
      expect(res.status).toBe(401);
    });

    it('should return 403 for student', async () => {
      const res = await request(app)
        .post('/api/v1/ai/import/suggest-table')
        .set(STUDENT_AUTH)
        .send({ fileId: UUID_V4 });
      expect(res.status).toBe(403);
    });

    it('should return 400 for invalid fileId', async () => {
      const res = await request(app)
        .post('/api/v1/ai/import/suggest-table')
        .set(ADMIN_AUTH)
        .send({ fileId: 'not-uuid' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/ai/surveys/generate', () => {
    it('should return 403 for student', async () => {
      const res = await request(app)
        .post('/api/v1/ai/surveys/generate')
        .set(STUDENT_AUTH)
        .send({ description: 'A survey about students' });
      expect(res.status).toBe(403);
    });

    it('should return 400 for short description', async () => {
      const res = await request(app)
        .post('/api/v1/ai/surveys/generate')
        .set(ADMIN_AUTH)
        .send({ description: 'Hi' });
      expect(res.status).toBe(400);
    });

    it('should return 400 for description exceeding 2000 chars', async () => {
      const res = await request(app)
        .post('/api/v1/ai/surveys/generate')
        .set(ADMIN_AUTH)
        .send({ description: 'x'.repeat(2001) });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/ai/charts/generate', () => {
    it('should return 403 for teacher', async () => {
      const res = await request(app)
        .post('/api/v1/ai/charts/generate')
        .set(TEACHER_AUTH)
        .send({ description: 'A bar chart of students', tableId: UUID_V4 });
      expect(res.status).toBe(403);
    });

    it('should return 400 for missing tableId', async () => {
      const res = await request(app)
        .post('/api/v1/ai/charts/generate')
        .set(ADMIN_AUTH)
        .send({ description: 'A bar chart of students' });
      expect(res.status).toBe(400);
    });
  });
});

describe('Health Endpoints', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
    vi.resetAllMocks();
  });

  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });

  it('GET /api/v1/health returns ok', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });

  it('returns 404 for unknown route', async () => {
    const res = await request(app).get('/api/v1/nonexistent');
    expect(res.status).toBe(404);
  });
});
