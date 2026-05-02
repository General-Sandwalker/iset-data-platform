import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  ];

  return {
    apiClient: {
      get: vi.fn().mockResolvedValue({
        data: { success: true, data: users, meta: { page: 1, limit: 20, total: 1 } },
      }),
      post: vi.fn().mockResolvedValue({ data: { success: true, data: { id: 'u-new', temp_password: 'TempP@ss1' } } }),
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

describe('User Creation Flow', () => {
  beforeEach(() => {
    clearAuth();
    setAuth(mockAdminUser);
  });

  it('opens Add User modal and shows form fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument();
    }, WT);

    await user.click(screen.getByRole('button', { name: /add user/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    }, WT);

    const dialog = screen.getByRole('dialog');
    await waitFor(() => {
      expect(dialog.querySelector('label[for="cin"]')).toBeInTheDocument();
      expect(dialog.querySelector('label[for="email"]')).toBeInTheDocument();
    }, WT);
  });

  it('shows user data in the table after loading', async () => {
    renderWithProviders(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    }, WT);
    expect(screen.getByText('admin@iset.tn')).toBeInTheDocument();
  });

  it('displays active status tag for active users', async () => {
    renderWithProviders(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
    }, WT);
  });
});
