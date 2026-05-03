import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { ADMIN_AUTH, SUPER_ADMIN_AUTH, MANAGER_AUTH, TEACHER_AUTH, STUDENT_AUTH, UUID_V4, UUID_V4_2, INVALID_UUID } from './helpers.js';
import { mockDbQuery as mockQuery, mockDbGetClient as mockGetClient } from './setup.js';

vi.mock('../src/middleware/activity-logger.js', () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
  activityLogger: vi.fn().mockImplementation(() => (req: any, _res: any, next: any) => next()),
}));

const mockTable = {
  id: UUID_V4,
  name: 'dt_students',
  display_name: 'Students',
  description: 'Student data',
  is_user_linked: false,
  created_by: UUID_V4,
  created_at: new Date().toISOString(),
};

const mockField = {
  id: UUID_V4_2,
  table_id: UUID_V4,
  name: 'first_name',
  display_name: 'First Name',
  field_type: 'text',
  config_json: null,
  is_required: true,
  order_index: 0,
};

describe('Schema Engine Endpoints', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
    vi.resetAllMocks();
  });

  describe('GET /api/v1/schema/tables', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/v1/schema/tables');
      expect(res.status).toBe(401);
    });

    it('should return tables for any authenticated user', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [mockTable], rowCount: 1 });
      const res = await request(app)
        .get('/api/v1/schema/tables')
        .set(STUDENT_AUTH);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/v1/schema/tables', () => {
    const validTable = {
      name: 'newtable',
      displayName: 'New Table',
      description: 'A test table',
      isUserLinked: false,
    };

    it('should return 403 for student', async () => {
      const res = await request(app)
        .post('/api/v1/schema/tables')
        .set(STUDENT_AUTH)
        .send(validTable);
      expect(res.status).toBe(403);
    });

    it('should return 403 for teacher', async () => {
      const res = await request(app)
        .post('/api/v1/schema/tables')
        .set(TEACHER_AUTH)
        .send(validTable);
      expect(res.status).toBe(403);
    });

    it('should return 403 for manager', async () => {
      const res = await request(app)
        .post('/api/v1/schema/tables')
        .set(MANAGER_AUTH)
        .send(validTable);
      expect(res.status).toBe(403);
    });

    it('should return 400 for invalid table name (starts with number)', async () => {
      const res = await request(app)
        .post('/api/v1/schema/tables')
        .set(ADMIN_AUTH)
        .send({ ...validTable, name: '123table' });
      expect(res.status).toBe(400);
    });

    it('should return 400 for name exceeding 100 chars', async () => {
      const res = await request(app)
        .post('/api/v1/schema/tables')
        .set(ADMIN_AUTH)
        .send({ ...validTable, name: 'a'.repeat(101) });
      expect(res.status).toBe(400);
    });

    it('should return 400 for missing displayName', async () => {
      const res = await request(app)
        .post('/api/v1/schema/tables')
        .set(ADMIN_AUTH)
        .send({ name: 'test' });
      expect(res.status).toBe(400);
    });

    it('should create table for admin', async () => {
      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [], rowCount: 0 })
          .mockResolvedValueOnce({ rows: [], rowCount: 0 })
          .mockResolvedValueOnce({ rows: [{ ...mockTable, id: UUID_V4_2, name: 'dt_newtable' }], rowCount: 1 })
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }),
        release: vi.fn(),
      };
      mockGetClient.mockResolvedValueOnce(mockClient as any);
      const res = await request(app)
        .post('/api/v1/schema/tables')
        .set(ADMIN_AUTH)
        .send(validTable);
      expect(res.status).toBe(201);
    });
  });

  describe('DELETE /api/v1/schema/tables/:id', () => {
    it('should return 403 for admin (only super_admin)', async () => {
      const res = await request(app)
        .delete(`/api/v1/schema/tables/${UUID_V4}`)
        .set(ADMIN_AUTH);
      expect(res.status).toBe(403);
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app)
        .delete(`/api/v1/schema/tables/${INVALID_UUID}`)
        .set(SUPER_ADMIN_AUTH);
      expect(res.status).toBe(400);
    });

    it('should delete table for super_admin', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockTable], rowCount: 1 });
      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [], rowCount: 0 })
          .mockResolvedValueOnce({ rows: [], rowCount: 0 })
          .mockResolvedValueOnce({ rows: [], rowCount: 0 })
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }),
        release: vi.fn(),
      };
      mockGetClient.mockResolvedValueOnce(mockClient as any);
      const res = await request(app)
        .delete(`/api/v1/schema/tables/${UUID_V4}`)
        .set(SUPER_ADMIN_AUTH);
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/v1/schema/tables/:id/fields', () => {
    const validField = {
      name: 'age',
      displayName: 'Age',
      fieldType: 'number',
      isRequired: false,
      orderIndex: 1,
    };

    it('should return 403 for student', async () => {
      const res = await request(app)
        .post(`/api/v1/schema/tables/${UUID_V4}/fields`)
        .set(STUDENT_AUTH)
        .send(validField);
      expect(res.status).toBe(403);
    });

    it('should return 400 for invalid fieldType', async () => {
      const res = await request(app)
        .post(`/api/v1/schema/tables/${UUID_V4}/fields`)
        .set(ADMIN_AUTH)
        .send({ ...validField, fieldType: 'hacker_type' });
      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid field name', async () => {
      const res = await request(app)
        .post(`/api/v1/schema/tables/${UUID_V4}/fields`)
        .set(ADMIN_AUTH)
        .send({ ...validField, name: '123invalid' });
      expect(res.status).toBe(400);
    });

    it('should add field for admin', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockTable], rowCount: 1 });
      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [], rowCount: 0 })
          .mockResolvedValueOnce({ rows: [], rowCount: 0 })
          .mockResolvedValueOnce({ rows: [mockField], rowCount: 1 })
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }),
        release: vi.fn(),
      };
      mockGetClient.mockResolvedValueOnce(mockClient as any);
      const res = await request(app)
        .post(`/api/v1/schema/tables/${UUID_V4}/fields`)
        .set(ADMIN_AUTH)
        .send(validField);
      expect(res.status).toBe(201);
    });
  });

  describe('PATCH /api/v1/schema/tables/:id', () => {
    it('should return 403 for manager', async () => {
      const res = await request(app)
        .patch(`/api/v1/schema/tables/${UUID_V4}`)
        .set(MANAGER_AUTH)
        .send({ displayName: 'Hacked' });
      expect(res.status).toBe(403);
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app)
        .patch(`/api/v1/schema/tables/${INVALID_UUID}`)
        .set(ADMIN_AUTH)
        .send({ displayName: 'New Name' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/schema/tables/:id', () => {
    it('should return table details for authenticated user', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [mockTable], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [mockTable], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [mockField], rowCount: 1 });
      const res = await request(app)
        .get(`/api/v1/schema/tables/${UUID_V4}`)
        .set(TEACHER_AUTH);
      expect(res.status).toBe(200);
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app)
        .get(`/api/v1/schema/tables/${INVALID_UUID}`)
        .set(TEACHER_AUTH);
      expect(res.status).toBe(400);
    });
  });

  describe('Relationships', () => {
    it('should list relationships for authenticated user', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      const res = await request(app)
        .get('/api/v1/schema/relationships')
        .set(TEACHER_AUTH);
      expect(res.status).toBe(200);
    });

    it('should return 403 for student creating relationship', async () => {
      const res = await request(app)
        .post('/api/v1/schema/relationships')
        .set(STUDENT_AUTH)
        .send({ sourceTableId: UUID_V4, sourceFieldId: UUID_V4_2, targetTableId: UUID_V4, relationshipType: 'one_to_many' });
      expect(res.status).toBe(403);
    });
  });

  describe('Data endpoints', () => {
    it('should allow authenticated user to list data', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [mockTable], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [mockTable], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [mockField], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });
      const res = await request(app)
        .get(`/api/v1/schema/tables/${UUID_V4}/data`)
        .set(STUDENT_AUTH);
      expect(res.status).toBe(200);
    });

    it('should return 404 for nonexistent table UUID in data route', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      const res = await request(app)
        .get(`/api/v1/schema/tables/${UUID_V4}/data`)
        .set(STUDENT_AUTH);
      expect(res.status).toBe(404);
    });
  });
});
