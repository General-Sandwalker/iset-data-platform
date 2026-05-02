import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders, setAuth, clearAuth, mockAdminUser } from '../test/helpers';
import ImportPage from './import';

vi.mock('../core/api/client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: { success: true, data: [] } }),
    post: vi.fn().mockResolvedValue({ data: { success: true, data: {} } }),
    patch: vi.fn().mockResolvedValue({ data: { success: true, data: {} } }),
    delete: vi.fn().mockResolvedValue({ data: { success: true, data: {} } }),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

describe('Import Page', () => {
  beforeEach(() => {
    clearAuth();
    setAuth(mockAdminUser);
  });

  it('renders the import page with title', () => {
    renderWithProviders(<ImportPage />);
    expect(screen.getByText('Data Import')).toBeInTheDocument();
  });

  it('shows Import Wizard tab', () => {
    renderWithProviders(<ImportPage />);
    expect(screen.getByRole('tab', { name: /import wizard/i })).toBeInTheDocument();
  });

  it('shows Import History tab', () => {
    renderWithProviders(<ImportPage />);
    expect(screen.getByRole('tab', { name: /import history/i })).toBeInTheDocument();
  });
});
