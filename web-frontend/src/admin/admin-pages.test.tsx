import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, setAuth, clearAuth, mockAdminUser } from '../test/helpers';

vi.mock('../core/api/reports', () => ({
  reportsApi: {
    listTemplates: vi.fn().mockResolvedValue({ success: true, data: [] }),
    listReports: vi.fn().mockResolvedValue({ success: true, data: [] }),
    createTemplate: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('../core/api/schema', () => ({
  schemaApi: {
    listTables: vi.fn().mockResolvedValue({ success: true, data: [] }),
  },
}));

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

const WT = { timeout: 5000 };

describe('Reports Page', () => {
  beforeEach(() => {
    clearAuth();
    setAuth(mockAdminUser);
  });

  it('renders the reports page title', async () => {
    const { default: ReportsPage } = await import('../report-center');
    renderWithProviders(<ReportsPage />);

    await waitFor(() => {
      expect(screen.getByText('Report Center')).toBeInTheDocument();
    }, WT);
  });

  it('shows tab buttons for templates and report history', async () => {
    const { default: ReportsPage } = await import('../report-center');
    renderWithProviders(<ReportsPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /templates/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /report history/i })).toBeInTheDocument();
    }, WT);
  });
});

describe('Partnerships Page', () => {
  beforeEach(() => {
    clearAuth();
    setAuth(mockAdminUser);
  });

  it('renders the partnerships page title', async () => {
    const { default: PartnershipsPage } = await import('./partnerships');
    renderWithProviders(<PartnershipsPage />);

    await waitFor(() => {
      expect(screen.getByText('Partnerships')).toBeInTheDocument();
    }, WT);
  });

  it('shows search input', async () => {
    const { default: PartnershipsPage } = await import('./partnerships');
    renderWithProviders(<PartnershipsPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search companies/i)).toBeInTheDocument();
    }, WT);
  });

  it('shows Add Company button', async () => {
    const { default: PartnershipsPage } = await import('./partnerships');
    renderWithProviders(<PartnershipsPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add company/i })).toBeInTheDocument();
    }, WT);
  });
});
