import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import {
  ADMIN_AUTH, SUPER_ADMIN_AUTH, MANAGER_AUTH,
  TEACHER_AUTH, STUDENT_AUTH, ALUMNI_AUTH,
  UUID_V4, INVALID_UUID,
} from './helpers.js';
import { mockDbQuery as mockQuery } from './setup.js';

vi.mock('../src/middleware/activity-logger.js', () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
  activityLogger: vi.fn().mockImplementation(() => (req: any, _res: any, next: any) => next()),
}));

const roles = {
  super_admin: SUPER_ADMIN_AUTH,
  admin: ADMIN_AUTH,
  responsable_observatoire: MANAGER_AUTH,
  enseignant: TEACHER_AUTH,
  etudiant: STUDENT_AUTH,
  alumni: ALUMNI_AUTH,
};

describe('RBAC Enforcement', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
    vi.resetAllMocks();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  describe('Admin-only endpoints (super_admin, admin)', () => {
    const adminOnlyEndpoints = [
      { method: 'post' as const, path: '/api/v1/users', body: { email: 't@t.com', firstName: 'T', lastName: 'T', role: 'admin' } },
      { method: 'post' as const, path: `/api/v1/admin/users/${UUID_V4}/reset-password` },
      { method: 'post' as const, path: '/api/v1/surveys', body: { title: 'T' } },
      { method: 'post' as const, path: `/api/v1/surveys/${UUID_V4}/publish` },
      { method: 'delete' as const, path: `/api/v1/surveys/${UUID_V4}` },
      { method: 'post' as const, path: '/api/v1/reports/templates', body: { name: 'T', promptTemplate: 'T' } },
      { method: 'delete' as const, path: `/api/v1/reports/templates/${UUID_V4}` },
      { method: 'post' as const, path: '/api/v1/reports/reports/batch-generate', body: { templateId: UUID_V4, cins: ['123'] } },
      { method: 'post' as const, path: '/api/v1/schema/tables', body: { name: 'test', displayName: 'Test' } },
      { method: 'post' as const, path: `/api/v1/schema/tables/${UUID_V4}/fields`, body: { name: 'f', displayName: 'F', fieldType: 'text', isRequired: true, orderIndex: 0 } },
      { method: 'post' as const, path: '/api/v1/analytics/academic/mappings', body: { key: 'analytics_students_table', tableId: UUID_V4 } },
      { method: 'put' as const, path: '/api/v1/system/settings/test', body: { value: {} } },
      { method: 'delete' as const, path: '/api/v1/system/settings/test' },
      { method: 'post' as const, path: '/api/v1/system/academic-years', body: { year: '24-25', startDate: '2024-09-01', endDate: '2025-06-30' } },
      { method: 'delete' as const, path: `/api/v1/system/academic-years/${UUID_V4}` },
    ];

    for (const endpoint of adminOnlyEndpoints) {
      describe(`${endpoint.method.toUpperCase()} ${endpoint.path}`, () => {
        it('should allow admin', async () => {
          const res = await request(app)[endpoint.method](endpoint.path)
            .set(ADMIN_AUTH)
            .send(endpoint.body);
          expect(res.status).not.toBe(403);
        });

        it('should allow super_admin', async () => {
          const res = await request(app)[endpoint.method](endpoint.path)
            .set(SUPER_ADMIN_AUTH)
            .send(endpoint.body);
          expect(res.status).not.toBe(403);
        });

        it('should deny student', async () => {
          const res = await request(app)[endpoint.method](endpoint.path)
            .set(STUDENT_AUTH)
            .send(endpoint.body);
          expect(res.status).toBe(403);
        });

        it('should deny teacher', async () => {
          const res = await request(app)[endpoint.method](endpoint.path)
            .set(TEACHER_AUTH)
            .send(endpoint.body);
          expect(res.status).toBe(403);
        });

        it('should deny alumni', async () => {
          const res = await request(app)[endpoint.method](endpoint.path)
            .set(ALUMNI_AUTH)
            .send(endpoint.body);
          expect(res.status).toBe(403);
        });
      });
    }
  });

  describe('Manager-level endpoints (super_admin, admin, responsable_observatoire)', () => {
    const managerEndpoints = [
      { method: 'get' as const, path: '/api/v1/reports/templates' },
      { method: 'get' as const, path: '/api/v1/reports/reports' },
      { method: 'post' as const, path: '/api/v1/reports/reports/generate', body: { templateId: UUID_V4, cin: '123' } },
      { method: 'get' as const, path: '/api/v1/analytics/academic/enrollments' },
      { method: 'post' as const, path: '/api/v1/partnerships/companies', body: { name: 'Corp' } },
    ];

    for (const endpoint of managerEndpoints) {
      describe(`${endpoint.method.toUpperCase()} ${endpoint.path}`, () => {
        it('should allow manager', async () => {
          const res = await request(app)[endpoint.method](endpoint.path)
            .set(MANAGER_AUTH)
            .send(endpoint.body);
          expect(res.status).not.toBe(403);
        });

        it('should deny student', async () => {
          const res = await request(app)[endpoint.method](endpoint.path)
            .set(STUDENT_AUTH)
            .send(endpoint.body);
          expect(res.status).toBe(403);
        });

        it('should deny teacher', async () => {
          const res = await request(app)[endpoint.method](endpoint.path)
            .set(TEACHER_AUTH)
            .send(endpoint.body);
          expect(res.status).toBe(403);
        });

        it('should deny alumni', async () => {
          const res = await request(app)[endpoint.method](endpoint.path)
            .set(ALUMNI_AUTH)
            .send(endpoint.body);
          expect(res.status).toBe(403);
        });
      });
    }
  });

  describe('Super-admin-only endpoints', () => {
    it('should deny admin from DELETE /schema/tables/:id', async () => {
      const res = await request(app)
        .delete(`/api/v1/schema/tables/${UUID_V4}`)
        .set(ADMIN_AUTH);
      expect(res.status).toBe(403);
    });

    it('should allow super_admin for DELETE /schema/tables/:id', async () => {
      const res = await request(app)
        .delete(`/api/v1/schema/tables/${UUID_V4}`)
        .set(SUPER_ADMIN_AUTH);
      expect(res.status).not.toBe(403);
    });
  });

  describe('Public endpoints (no auth)', () => {
    it('should access /health without auth', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
    });

    it('should access /api/v1/health without auth', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
    });

    it('should access /public/stats without auth', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 });
      const res = await request(app).get('/public/stats');
      expect(res.status).toBe(200);
    });

    it('should access /public/student-stats with auth only', async () => {
      const res = await request(app).get('/public/student-stats');
      expect(res.status).toBe(401);
    });

    it('should access /public/teacher-stats with auth only', async () => {
      const res = await request(app).get('/public/teacher-stats');
      expect(res.status).toBe(401);
    });
  });

  describe('Auth required on all protected routes', () => {
    const protectedEndpoints = [
      { method: 'get' as const, path: '/api/v1/auth/me' },
      { method: 'get' as const, path: '/api/v1/users' },
      { method: 'get' as const, path: '/api/v1/schema/tables' },
      { method: 'get' as const, path: '/api/v1/surveys' },
      { method: 'get' as const, path: '/api/v1/viz/charts' },
      { method: 'get' as const, path: '/api/v1/viz/dashboards' },
      { method: 'get' as const, path: '/api/v1/reports/templates' },
      { method: 'get' as const, path: '/api/v1/partnerships/companies' },
      { method: 'get' as const, path: '/api/v1/system/settings' },
    ];

    for (const endpoint of protectedEndpoints) {
      it(`${endpoint.method.toUpperCase()} ${endpoint.path} returns 401 without token`, async () => {
        const res = await request(app)[endpoint.method](endpoint.path);
        expect(res.status).toBe(401);
      });
    }
  });

  describe('Invalid token handling', () => {
    it('should reject malformed token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer not-a-valid-jwt-token');
      expect(res.status).toBe(401);
    });

    it('should reject empty Bearer', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer ');
      expect(res.status).toBe(401);
    });

    it('should reject wrong scheme', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Basic dXNlcjpwYXNz');
      expect(res.status).toBe(401);
    });
  });
});
