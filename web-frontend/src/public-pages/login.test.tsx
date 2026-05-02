import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, setAuth, clearAuth, mockAdminUser, mockStudentUser } from '../test/helpers';
import { useAuthStore } from '../core/stores/auth.store';
import LoginPage from '../public-pages/login';

vi.mock('../core/api/client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

import { apiClient } from '../core/api/client';
const mockedPost = vi.mocked(apiClient.post);

const WT = { timeout: 5000 };

describe('Login Flow', () => {
  beforeEach(() => {
    clearAuth();
  });

  it('renders login form with identifier and password fields', () => {
    renderWithProviders(<LoginPage />, { route: '/login' });
    expect(screen.getByPlaceholderText('CIN or Username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />, { route: '/login' });

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Please enter your CIN or username')).toBeInTheDocument();
    }, WT);
  });

  it('shows error alert on failed login', async () => {
    const user = userEvent.setup();
    mockedPost.mockRejectedValueOnce({
      response: { data: { error: { message: 'Invalid credentials' } } },
    });

    renderWithProviders(<LoginPage />, { route: '/login' });

    await user.type(screen.getByPlaceholderText('CIN or Username'), 'wronguser');
    await user.type(screen.getByPlaceholderText('Password'), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    }, WT);
  });

  it('stores auth state and redirects on successful admin login', async () => {
    const user = userEvent.setup();
    mockedPost.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          token: 'jwt-token-123',
          user: mockAdminUser,
        },
      },
    });

    renderWithProviders(<LoginPage />, { route: '/login' });

    await user.type(screen.getByPlaceholderText('CIN or Username'), 'admin');
    await user.type(screen.getByPlaceholderText('Password'), 'password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.token).toBe('jwt-token-123');
      expect(state.user?.role).toBe('admin');
    }, WT);
  });

  it('stores auth state and redirects on successful student login', async () => {
    const user = userEvent.setup();
    mockedPost.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          token: 'jwt-token-student',
          user: mockStudentUser,
        },
      },
    });

    renderWithProviders(<LoginPage />, { route: '/login' });

    await user.type(screen.getByPlaceholderText('CIN or Username'), 'student');
    await user.type(screen.getByPlaceholderText('Password'), 'password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.role).toBe('etudiant');
    }, WT);
  });
});

describe('Auth Store', () => {
  beforeEach(() => {
    clearAuth();
  });

  it('starts unauthenticated', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
  });

  it('login sets token, user, and isAuthenticated', () => {
    useAuthStore.getState().login('my-token', mockAdminUser);

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe('my-token');
    expect(state.user).toEqual(mockAdminUser);
  });

  it('logout clears all auth state', () => {
    useAuthStore.getState().login('my-token', mockAdminUser);
    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
  });

  it('setUser updates user without changing token', () => {
    useAuthStore.getState().login('my-token', mockAdminUser);
    useAuthStore.getState().setUser({ ...mockAdminUser, firstName: 'Updated' });

    const state = useAuthStore.getState();
    expect(state.user?.firstName).toBe('Updated');
    expect(state.token).toBe('my-token');
    expect(state.isAuthenticated).toBe(true);
  });

  it('all roles can login and have correct role values', () => {
    const roles = [
      { user: mockAdminUser, expectedRole: 'admin' },
      { user: { ...mockAdminUser, role: 'super_admin' as const }, expectedRole: 'super_admin' },
      { user: { ...mockAdminUser, role: 'enseignant' as const }, expectedRole: 'enseignant' },
      { user: mockStudentUser, expectedRole: 'etudiant' },
      { user: { ...mockAdminUser, role: 'alumni' as const }, expectedRole: 'alumni' },
      { user: { ...mockAdminUser, role: 'responsable_observatoire' as const }, expectedRole: 'responsable_observatoire' },
    ];

    for (const { user, expectedRole } of roles) {
      useAuthStore.getState().logout();
      useAuthStore.getState().login('token', user);
      expect(useAuthStore.getState().user?.role).toBe(expectedRole);
    }
  });
});
