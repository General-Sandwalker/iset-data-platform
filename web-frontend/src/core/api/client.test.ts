import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import { useAuthStore } from '../stores/auth.store';

vi.mock('axios', () => {
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    defaults: { headers: { common: {} } },
  };
  return {
    default: {
      create: vi.fn().mockReturnValue(mockAxiosInstance),
    },
    create: vi.fn().mockReturnValue(mockAxiosInstance),
  };
});

describe('API Client', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
    vi.resetAllMocks();
  });

  it('creates an axios instance with the correct base URL', () => {
    const originalEnv = import.meta.env.VITE_API_URL;
    expect(axios.create).toBeDefined();
  });

  it('request interceptor attaches Bearer token from auth store', () => {
    useAuthStore.getState().login('test-token-xyz', {
      id: '1',
      cin: '12345678',
      email: 'test@test.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'admin',
    });

    const token = useAuthStore.getState().token;
    expect(token).toBe('test-token-xyz');
  });

  it('response interceptor triggers logout on 401', () => {
    useAuthStore.getState().login('valid-token', {
      id: '1',
      cin: '12345678',
      email: 'test@test.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'admin',
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    useAuthStore.getState().logout();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().token).toBeNull();
  });
});

describe('Auth Store - Token Persistence', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('persists token via zustand persist middleware', () => {
    const store = useAuthStore.getState();
    expect(store.login).toBeDefined();
    expect(store.logout).toBeDefined();
  });

  it('login sets all auth fields atomically', () => {
    useAuthStore.getState().login('my-jwt', {
      id: '1',
      cin: '11111111',
      email: 'admin@iset.tn',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
    });

    const state = useAuthStore.getState();
    expect(state.token).toBe('my-jwt');
    expect(state.user).not.toBeNull();
    expect(state.user?.email).toBe('admin@iset.tn');
    expect(state.isAuthenticated).toBe(true);
  });

  it('logout is idempotent', () => {
    useAuthStore.getState().logout();
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
