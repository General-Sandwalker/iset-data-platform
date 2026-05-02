import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { ADMIN_AUTH, STUDENT_AUTH, UUID_V4, INVALID_UUID } from './helpers.js';
import { mockDbQuery as mockQuery } from './setup.js';

vi.mock('../src/middleware/activity-logger.js', () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
  activityLogger: vi.fn().mockImplementation(() => (req: any, _res: any, next: any) => next()),
}));

const mockImport = {
  id: UUID_V4,
  original_name: 'test.csv',
  stored_filename: 'abc123.csv',
  file_type: 'csv',
  file_size: 1024,
  status: 'pending',
  columns: null,
  total_rows: null,
  created_at: new Date().toISOString(),
};

describe('Data Import Endpoints', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
    vi.resetAllMocks();
  });

  describe('GET /api/v1/import', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/v1/import');
      expect(res.status).toBe(401);
    });

    it('should return 403 for student', async () => {
      const res = await request(app)
        .get('/api/v1/import')
        .set(STUDENT_AUTH);
      expect(res.status).toBe(403);
    });

    it('should list imports for admin', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockImport], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 });
      const res = await request(app)
        .get('/api/v1/import')
        .set(ADMIN_AUTH);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/v1/import/:id', () => {
    it('should return 400 for invalid UUID', async () => {
      const res = await request(app)
        .get(`/api/v1/import/${INVALID_UUID}`)
        .set(ADMIN_AUTH);
      expect(res.status).toBe(400);
    });

    it('should return import for admin', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockImport], rowCount: 1 });
      const res = await request(app)
        .get(`/api/v1/import/${UUID_V4}`)
        .set(ADMIN_AUTH);
      expect(res.status).toBe(200);
    });

    it('should return 404 for nonexistent import', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      const res = await request(app)
        .get(`/api/v1/import/${UUID_V4}`)
        .set(ADMIN_AUTH);
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/import/:id', () => {
    it('should return 403 for student', async () => {
      const res = await request(app)
        .delete(`/api/v1/import/${UUID_V4}`)
        .set(STUDENT_AUTH);
      expect(res.status).toBe(403);
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app)
        .delete(`/api/v1/import/${INVALID_UUID}`)
        .set(ADMIN_AUTH);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/import/preview', () => {
    it('should return 403 for student', async () => {
      const res = await request(app)
        .post('/api/v1/import/preview')
        .set(STUDENT_AUTH)
        .send({ fileId: UUID_V4, tableId: UUID_V4, mappings: [] });
      expect(res.status).toBe(403);
    });

    it('should return 400 for invalid fileId', async () => {
      const res = await request(app)
        .post('/api/v1/import/preview')
        .set(ADMIN_AUTH)
        .send({ fileId: INVALID_UUID, tableId: UUID_V4, mappings: [] });
      expect(res.status).toBe(400);
    });

    it('should return 400 for missing mappings', async () => {
      const res = await request(app)
        .post('/api/v1/import/preview')
        .set(ADMIN_AUTH)
        .send({ fileId: UUID_V4, tableId: UUID_V4 });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/import/execute', () => {
    it('should return 400 for invalid fileId', async () => {
      const res = await request(app)
        .post('/api/v1/import/execute')
        .set(ADMIN_AUTH)
        .send({ fileId: 'not-uuid', tableId: UUID_V4, mappings: [], skipDuplicates: false });
      expect(res.status).toBe(400);
    });

    it('should return 400 for missing tableId', async () => {
      const res = await request(app)
        .post('/api/v1/import/execute')
        .set(ADMIN_AUTH)
        .send({ fileId: UUID_V4, mappings: [] });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/import/create-table-and-import', () => {
    it('should return 400 for invalid tableName regex', async () => {
      const res = await request(app)
        .post('/api/v1/import/create-table-and-import')
        .set(ADMIN_AUTH)
        .send({
          fileId: UUID_V4,
          tableName: '123invalid',
          displayName: 'Bad Table',
          mappings: [],
        });
      expect(res.status).toBe(400);
    });
  });
});
