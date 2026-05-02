import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { ADMIN_AUTH, MANAGER_AUTH, TEACHER_AUTH, STUDENT_AUTH, UUID_V4, UUID_V4_2, INVALID_UUID } from './helpers.js';
import { mockDbQuery as mockQuery } from './setup.js';

vi.mock('../src/middleware/activity-logger.js', () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
  activityLogger: vi.fn().mockImplementation(() => (req: any, _res: any, next: any) => next()),
}));

const mockSurvey = {
  id: UUID_V4,
  title: 'Test Survey',
  description: 'A test',
  slug: UUID_V4,
  status: 'draft',
  access_type: 'public',
  allow_multiple_responses: false,
  target_table_id: null,
  created_by: UUID_V4,
  created_at: new Date().toISOString(),
};

const mockQuestion = {
  id: UUID_V4_2,
  survey_id: UUID_V4,
  type: 'text',
  label: 'Your name',
  config_json: null,
  is_required: true,
  order_index: 0,
  target_field_id: null,
};

describe('Survey Endpoints', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
    vi.resetAllMocks();
  });

  describe('GET /api/v1/surveys', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/v1/surveys');
      expect(res.status).toBe(401);
    });

    it('should list surveys for any authenticated user', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockSurvey], rowCount: 1 });
      const res = await request(app)
        .get('/api/v1/surveys')
        .set(STUDENT_AUTH);
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/v1/surveys', () => {
    const validSurvey = {
      title: 'New Survey',
      description: 'Desc',
      accessType: 'public',
      allowMultipleResponses: false,
    };

    it('should return 403 for student', async () => {
      const res = await request(app)
        .post('/api/v1/surveys')
        .set(STUDENT_AUTH)
        .send(validSurvey);
      expect(res.status).toBe(403);
    });

    it('should return 403 for teacher', async () => {
      const res = await request(app)
        .post('/api/v1/surveys')
        .set(TEACHER_AUTH)
        .send(validSurvey);
      expect(res.status).toBe(403);
    });

    it('should return 400 for missing title', async () => {
      const res = await request(app)
        .post('/api/v1/surveys')
        .set(ADMIN_AUTH)
        .send({ description: 'No title' });
      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid accessType', async () => {
      const res = await request(app)
        .post('/api/v1/surveys')
        .set(ADMIN_AUTH)
        .send({ ...validSurvey, accessType: 'invalid' });
      expect(res.status).toBe(400);
    });

    it('should create survey for admin', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ ...mockSurvey, title: 'New Survey' }], rowCount: 1 });
      const res = await request(app)
        .post('/api/v1/surveys')
        .set(ADMIN_AUTH)
        .send(validSurvey);
      expect(res.status).toBe(201);
    });
  });

  describe('PATCH /api/v1/surveys/:id', () => {
    it('should return 403 for student', async () => {
      const res = await request(app)
        .patch(`/api/v1/surveys/${UUID_V4}`)
        .set(STUDENT_AUTH)
        .send({ title: 'Hacked' });
      expect(res.status).toBe(403);
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app)
        .patch(`/api/v1/surveys/${INVALID_UUID}`)
        .set(ADMIN_AUTH)
        .send({ title: 'Updated' });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/v1/surveys/:id', () => {
    it('should return 403 for student', async () => {
      const res = await request(app)
        .delete(`/api/v1/surveys/${UUID_V4}`)
        .set(STUDENT_AUTH);
      expect(res.status).toBe(403);
    });

    it('should return 403 for manager', async () => {
      const res = await request(app)
        .delete(`/api/v1/surveys/${UUID_V4}`)
        .set(MANAGER_AUTH);
      expect(res.status).toBe(403);
    });
  });

  describe('Survey Questions', () => {
    it('should return 403 for student adding question', async () => {
      const res = await request(app)
        .post(`/api/v1/surveys/${UUID_V4}/questions`)
        .set(STUDENT_AUTH)
        .send({ type: 'text', label: 'Q1', isRequired: true });
      expect(res.status).toBe(403);
    });

    it('should return 400 for invalid question type', async () => {
      const res = await request(app)
        .post(`/api/v1/surveys/${UUID_V4}/questions`)
        .set(ADMIN_AUTH)
        .send({ type: 'invalid_type', label: 'Q1', isRequired: true });
      expect(res.status).toBe(400);
    });

    it('should add question for admin', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ ...mockSurvey, status: 'draft' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ max_order: '0' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [mockQuestion], rowCount: 1 });
      const res = await request(app)
        .post(`/api/v1/surveys/${UUID_V4}/questions`)
        .set(ADMIN_AUTH)
        .send({ type: 'text', label: 'Q1', isRequired: true });
      expect(res.status).toBe(201);
    });
  });

  describe('Survey Publishing', () => {
    it('should return 403 for student publishing', async () => {
      const res = await request(app)
        .post(`/api/v1/surveys/${UUID_V4}/publish`)
        .set(STUDENT_AUTH);
      expect(res.status).toBe(403);
    });

    it('should return 400 for invalid UUID on publish', async () => {
      const res = await request(app)
        .post(`/api/v1/surveys/${INVALID_UUID}/publish`)
        .set(ADMIN_AUTH);
      expect(res.status).toBe(400);
    });
  });

  describe('Survey Stats', () => {
    it('should return 403 for student', async () => {
      const res = await request(app)
        .get(`/api/v1/surveys/${UUID_V4}/stats`)
        .set(STUDENT_AUTH);
      expect(res.status).toBe(403);
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app)
        .get(`/api/v1/surveys/${INVALID_UUID}/stats`)
        .set(ADMIN_AUTH);
      expect(res.status).toBe(400);
    });
  });

  describe('Public Survey Routes', () => {
    it('should get public survey without auth', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ ...mockSurvey, access_type: 'public', published_slug: UUID_V4 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ ...mockSurvey, access_type: 'public' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });
      const res = await request(app)
        .get(`/public/surveys/${UUID_V4}`);
      expect(res.status).toBe(200);
    });

    it('should return 404 for nonexistent survey slug', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      const res = await request(app)
        .get(`/public/surveys/${UUID_V4}`);
      expect(res.status).toBe(404);
    });

    it('should return 401 for authenticated survey without token', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ ...mockSurvey, access_type: 'authenticated', published_slug: UUID_V4 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ ...mockSurvey, access_type: 'authenticated' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });
      const res = await request(app)
        .get(`/public/surveys/${UUID_V4}`);
      expect(res.status).toBe(401);
    });
  });
});
