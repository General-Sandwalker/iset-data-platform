import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { ADMIN_AUTH, MANAGER_AUTH, TEACHER_AUTH, STUDENT_AUTH, UUID_V4, UUID_V4_2, INVALID_UUID } from './helpers.js';
import { mockDbQuery as mockQuery } from './setup.js';

vi.mock('../src/middleware/activity-logger.js', () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
  activityLogger: vi.fn().mockImplementation(() => (req: any, _res: any, next: any) => next()),
}));

const mockCompany = {
  id: UUID_V4,
  name: 'Test Corp',
  sector: 'Tech',
  address: 'Tunis',
  contact_name: 'John',
  contact_email: 'john@test.com',
  contact_phone: '99999999',
  partnership_start_date: null,
  is_active: true,
  created_at: new Date().toISOString(),
};

const mockOffer = {
  id: UUID_V4_2,
  company_id: UUID_V4,
  type: 'stage',
  title: 'Internship',
  description: 'A great opportunity',
  requirements: null,
  publish_date: null,
  expiry_date: null,
  is_active: true,
  created_at: new Date().toISOString(),
};

describe('Partnerships Endpoints', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
    vi.resetAllMocks();
  });

  describe('Companies', () => {
    describe('GET /api/v1/partnerships/companies', () => {
      it('should return 401 without token', async () => {
        const res = await request(app).get('/api/v1/partnerships/companies');
        expect(res.status).toBe(401);
      });

      it('should list companies for any authenticated user', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [mockCompany], rowCount: 1 });
        const res = await request(app)
          .get('/api/v1/partnerships/companies')
          .set(STUDENT_AUTH);
        expect(res.status).toBe(200);
      });
    });

    describe('POST /api/v1/partnerships/companies', () => {
      const validCompany = {
        name: 'New Corp',
        sector: 'Tech',
        contactEmail: 'new@corp.com',
      };

      it('should return 403 for student', async () => {
        const res = await request(app)
          .post('/api/v1/partnerships/companies')
          .set(STUDENT_AUTH)
          .send(validCompany);
        expect(res.status).toBe(403);
      });

      it('should return 403 for teacher', async () => {
        const res = await request(app)
          .post('/api/v1/partnerships/companies')
          .set(TEACHER_AUTH)
          .send(validCompany);
        expect(res.status).toBe(403);
      });

      it('should return 400 for missing name', async () => {
        const res = await request(app)
          .post('/api/v1/partnerships/companies')
          .set(MANAGER_AUTH)
          .send({ sector: 'Tech' });
        expect(res.status).toBe(400);
      });

      it('should return 400 for invalid email', async () => {
        const res = await request(app)
          .post('/api/v1/partnerships/companies')
          .set(MANAGER_AUTH)
          .send({ name: 'Corp', contactEmail: 'not-an-email' });
        expect(res.status).toBe(400);
      });

      it('should return 400 for name exceeding 255 chars', async () => {
        const res = await request(app)
          .post('/api/v1/partnerships/companies')
          .set(MANAGER_AUTH)
          .send({ name: 'x'.repeat(256) });
        expect(res.status).toBe(400);
      });

      it('should create company for manager', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [mockCompany], rowCount: 1 });
        const res = await request(app)
          .post('/api/v1/partnerships/companies')
          .set(MANAGER_AUTH)
          .send(validCompany);
        expect(res.status).toBe(201);
      });

      it('should create company for admin', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [mockCompany], rowCount: 1 });
        const res = await request(app)
          .post('/api/v1/partnerships/companies')
          .set(ADMIN_AUTH)
          .send(validCompany);
        expect(res.status).toBe(201);
      });
    });

    describe('DELETE /api/v1/partnerships/companies/:id', () => {
      it('should return 403 for student', async () => {
        const res = await request(app)
          .delete(`/api/v1/partnerships/companies/${UUID_V4}`)
          .set(STUDENT_AUTH);
        expect(res.status).toBe(403);
      });

      it('should return 400 for invalid UUID', async () => {
        const res = await request(app)
          .delete(`/api/v1/partnerships/companies/${INVALID_UUID}`)
          .set(MANAGER_AUTH);
        expect(res.status).toBe(400);
      });
    });
  });

  describe('Offers', () => {
    describe('GET /api/v1/partnerships/offers', () => {
      it('should list offers for any authenticated user', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [mockOffer], rowCount: 1 });
        const res = await request(app)
          .get('/api/v1/partnerships/offers')
          .set(STUDENT_AUTH);
        expect(res.status).toBe(200);
      });
    });

    describe('POST /api/v1/partnerships/offers', () => {
      const validOffer = {
        companyId: UUID_V4,
        type: 'stage',
        title: 'Internship',
      };

      it('should return 403 for student', async () => {
        const res = await request(app)
          .post('/api/v1/partnerships/offers')
          .set(STUDENT_AUTH)
          .send(validOffer);
        expect(res.status).toBe(403);
      });

      it('should return 400 for invalid offer type', async () => {
        const res = await request(app)
          .post('/api/v1/partnerships/offers')
          .set(MANAGER_AUTH)
          .send({ ...validOffer, type: 'invalid_type' });
        expect(res.status).toBe(400);
      });

      it('should return 400 for missing companyId', async () => {
        const res = await request(app)
          .post('/api/v1/partnerships/offers')
          .set(MANAGER_AUTH)
          .send({ type: 'stage', title: 'Test' });
        expect(res.status).toBe(400);
      });

      it('should return 400 for invalid companyId', async () => {
        const res = await request(app)
          .post('/api/v1/partnerships/offers')
          .set(MANAGER_AUTH)
          .send({ companyId: INVALID_UUID, type: 'stage', title: 'Test' });
        expect(res.status).toBe(400);
      });
    });
  });

  describe('Collaborations', () => {
    describe('GET /api/v1/partnerships/collaborations', () => {
      it('should list collaborations for any authenticated user', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
        const res = await request(app)
          .get('/api/v1/partnerships/collaborations')
          .set(STUDENT_AUTH);
        expect(res.status).toBe(200);
      });
    });

    describe('POST /api/v1/partnerships/collaborations', () => {
      const validCollab = {
        companyId: UUID_V4,
        type: 'conference',
        description: 'A conference',
      };

      it('should return 403 for student', async () => {
        const res = await request(app)
          .post('/api/v1/partnerships/collaborations')
          .set(STUDENT_AUTH)
          .send(validCollab);
        expect(res.status).toBe(403);
      });

      it('should return 400 for missing companyId', async () => {
        const res = await request(app)
          .post('/api/v1/partnerships/collaborations')
          .set(MANAGER_AUTH)
          .send({ type: 'conference' });
        expect(res.status).toBe(400);
      });

      it('should return 400 for type exceeding 255 chars', async () => {
        const res = await request(app)
          .post('/api/v1/partnerships/collaborations')
          .set(MANAGER_AUTH)
          .send({ companyId: UUID_V4, type: 'x'.repeat(256) });
        expect(res.status).toBe(400);
      });
    });

    describe('DELETE /api/v1/partnerships/collaborations/:id', () => {
      it('should return 403 for student', async () => {
        const res = await request(app)
          .delete(`/api/v1/partnerships/collaborations/${UUID_V4}`)
          .set(STUDENT_AUTH);
        expect(res.status).toBe(403);
      });
    });
  });
});
