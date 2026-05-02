import { vi } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/iset_test';
process.env.PORT = '0';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.SUPER_ADMIN_USERNAME = 'admin';
process.env.SUPER_ADMIN_PASSWORD = 'test-admin-password';

export const mockDbQuery = vi.fn();
export const mockDbGetClient = vi.fn();

vi.mock('../src/config/database.js', () => ({
  pool: { query: mockDbQuery, connect: mockDbGetClient, end: vi.fn(), on: vi.fn() },
  query: mockDbQuery,
  getClient: mockDbGetClient,
}));
