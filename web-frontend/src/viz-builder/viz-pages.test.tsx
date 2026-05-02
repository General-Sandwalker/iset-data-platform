import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, setAuth, clearAuth, mockAdminUser } from '../test/helpers';

vi.mock('../core/api/viz', () => ({
  vizApi: {
    listCharts: vi.fn().mockResolvedValue({ success: true, data: [] }),
    listDashboards: vi.fn().mockResolvedValue({ success: true, data: [] }),
    createChart: vi.fn().mockResolvedValue({ success: true, data: { id: 'c-1' } }),
    createDashboard: vi.fn().mockResolvedValue({ success: true, data: { id: 'd-1' } }),
    executeChart: vi.fn().mockResolvedValue({ success: true, data: { columns: [], rows: [] } }),
  },
}));

vi.mock('../core/api/schema', () => ({
  schemaApi: {
    listTables: vi.fn().mockResolvedValue({
      success: true,
      data: [{ id: 't-1', name: 'dt_students', display_name: 'Students', description: '', is_user_linked: false, created_by: 'u-1', created_at: '2026-01-01' }],
    }),
    listFields: vi.fn().mockResolvedValue({
      success: true,
      data: [
        { id: 'f-1', name: 'name', display_name: 'Name', field_type: 'text', is_required: true, order_index: 0 },
      ],
    }),
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

describe('Chart Editor Page', () => {
  beforeEach(() => {
    clearAuth();
    setAuth(mockAdminUser);
  });

  it('renders the chart editor page with title and buttons', async () => {
    const { default: ChartsPage } = await import('../viz-builder/charts');
    renderWithProviders(<ChartsPage />);

    await waitFor(() => {
      expect(screen.getByText('Chart Editor')).toBeInTheDocument();
    }, WT);
  });

  it('shows Create Chart and AI Generate buttons', async () => {
    const { default: ChartsPage } = await import('../viz-builder/charts');
    renderWithProviders(<ChartsPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create chart/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /ai generate/i })).toBeInTheDocument();
    }, WT);
  });

  it('shows empty state when no charts exist', async () => {
    const { default: ChartsPage } = await import('../viz-builder/charts');
    renderWithProviders(<ChartsPage />);

    await waitFor(() => {
      expect(screen.getByText(/no charts created yet/i)).toBeInTheDocument();
    }, WT);
  });

  it('opens Create Chart modal with form fields', async () => {
    const user = userEvent.setup();
    const { default: ChartsPage } = await import('../viz-builder/charts');
    renderWithProviders(<ChartsPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create chart/i })).toBeInTheDocument();
    }, WT);

    await user.click(screen.getByRole('button', { name: /create chart/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    }, WT);

    const dialog = screen.getByRole('dialog');
    await waitFor(() => {
      expect(within(dialog).getByText('Title')).toBeInTheDocument();
      expect(within(dialog).getByText('Chart Type')).toBeInTheDocument();
      expect(within(dialog).getByText('SQL Query')).toBeInTheDocument();
    }, WT);
  });
});

describe('Dashboards Page', () => {
  beforeEach(() => {
    clearAuth();
    setAuth(mockAdminUser);
  });

  it('renders the dashboards page with title', async () => {
    const { default: DashboardsPage } = await import('../viz-builder/dashboards');
    renderWithProviders(<DashboardsPage />);

    await waitFor(() => {
      expect(screen.getByText('Dashboards')).toBeInTheDocument();
    }, WT);
  });

  it('shows Create Dashboard button', async () => {
    const { default: DashboardsPage } = await import('../viz-builder/dashboards');
    renderWithProviders(<DashboardsPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create dashboard/i })).toBeInTheDocument();
    }, WT);
  });

  it('shows empty state when no dashboards exist', async () => {
    const { default: DashboardsPage } = await import('../viz-builder/dashboards');
    renderWithProviders(<DashboardsPage />);

    await waitFor(() => {
      expect(screen.getByText(/no dashboards created yet/i)).toBeInTheDocument();
    }, WT);
  });

  it('opens Create Dashboard modal with form fields', async () => {
    const user = userEvent.setup();
    const { default: DashboardsPage } = await import('../viz-builder/dashboards');
    renderWithProviders(<DashboardsPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create dashboard/i })).toBeInTheDocument();
    }, WT);

    await user.click(screen.getByRole('button', { name: /create dashboard/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    }, WT);

    const dialog = screen.getByRole('dialog');
    await waitFor(() => {
      expect(within(dialog).getByText('Title')).toBeInTheDocument();
    }, WT);
  });
});
