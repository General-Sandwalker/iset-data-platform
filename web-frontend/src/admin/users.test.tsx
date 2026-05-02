import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, setAuth, clearAuth, mockAdminUser } from '../test/helpers';

vi.mock('../core/api/client', () => {
  const users = [
    {
      id: 'u-1',
      cin: '12345678',
      email: 'admin@iset.tn',
      role: 'admin',
      first_name: 'Admin',
      last_name: 'User',
      phone: null,
      is_active: true,
      must_change_password: false,
      created_at: '2026-01-01',
      last_login: null,
    },
    {
      id: 'u-2',
      cin: '22222222',
      email: 'student@iset.tn',
      role: 'etudiant',
      first_name: 'Student',
      last_name: 'User',
      phone: null,
      is_active: true,
      must_change_password: true,
      created_at: '2026-01-01',
      last_login: null,
    },
  ];

  return {
    apiClient: {
      get: vi.fn().mockResolvedValue({
        data: { success: true, data: users, meta: { page: 1, limit: 20, total: 2 } },
      }),
      post: vi.fn().mockResolvedValue({ data: { success: true, data: { id: 'u-new', temp_password: 'temp123' } } }),
      patch: vi.fn().mockResolvedValue({ data: { success: true } }),
      delete: vi.fn().mockResolvedValue({ data: { success: true } }),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    },
  };
});

import UserManagementPage from './users';

const WT = { timeout: 5000 };

describe('User Management Page', () => {
  beforeEach(() => {
    clearAuth();
    setAuth(mockAdminUser);
  });

  it('renders user management title', async () => {
    renderWithProviders(<UserManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument();
    }, WT);
  });

  it('renders Add User and Import buttons', async () => {
    renderWithProviders(<UserManagementPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add user/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /import/i })).toBeInTheDocument();
    }, WT);
  });

  it('shows search input', async () => {
    renderWithProviders(<UserManagementPage />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search by CIN or name')).toBeInTheDocument();
    }, WT);
  });
});
