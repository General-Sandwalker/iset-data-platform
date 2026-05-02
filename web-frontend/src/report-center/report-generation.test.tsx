import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, setAuth, clearAuth, mockAdminUser } from '../test/helpers';

vi.mock('../core/api/reports', () => ({
  reportsApi: {
    listTemplates: vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          id: 'tmpl-1',
          name: 'Student Performance Report',
          description: 'Academic performance',
          target_table_id: 't-1',
          prompt_template: 'Generate a performance report for student {{cin}}',
          created_at: '2026-01-01',
        },
      ],
    }),
    listReports: vi.fn().mockResolvedValue({ success: true, data: [] }),
    generateReport: vi.fn().mockResolvedValue({ success: true, data: { id: 'r-1', status: 'generated', content: { sections: [] } } }),
    createTemplate: vi.fn().mockResolvedValue({ success: true, data: { id: 'tmpl-2' } }),
  },
}));

vi.mock('../core/api/schema', () => ({
  schemaApi: {
    listTables: vi.fn().mockResolvedValue({
      success: true,
      data: [{ id: 't-1', name: 'dt_students', display_name: 'Students', description: '', is_user_linked: false, created_by: 'u-1', created_at: '2026-01-01' }],
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

describe('Report Generation Flow', () => {
  beforeEach(() => {
    clearAuth();
    setAuth(mockAdminUser);
  });

  it('renders report center with Templates tab active by default', async () => {
    const { default: ReportsPage } = await import('../report-center');
    renderWithProviders(<ReportsPage />);

    await waitFor(() => {
      expect(screen.getByText('Report Center')).toBeInTheDocument();
    }, WT);
    expect(screen.getByRole('button', { name: /new template/i })).toBeInTheDocument();
  });

  it('displays existing templates in the table', async () => {
    const { default: ReportsPage } = await import('../report-center');
    renderWithProviders(<ReportsPage />);

    await waitFor(() => {
      expect(screen.getByText('Student Performance Report')).toBeInTheDocument();
    }, WT);
  });

  it('switches to Report History tab on click', async () => {
    const { default: ReportsPage } = await import('../report-center');
    renderWithProviders(<ReportsPage />);

    await waitFor(() => {
      expect(screen.getByText('Report Center')).toBeInTheDocument();
    }, WT);

    const historyBtn = screen.getByRole('button', { name: /report history/i });
    historyBtn.click();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /generate report/i })).toBeInTheDocument();
    }, WT);
  });

  it('opens Generate Report modal from Report History tab', async () => {
    const user = userEvent.setup();
    const { default: ReportsPage } = await import('../report-center');
    renderWithProviders(<ReportsPage />);

    await waitFor(() => {
      expect(screen.getByText('Report Center')).toBeInTheDocument();
    }, WT);

    screen.getByRole('button', { name: /report history/i }).click();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /generate report/i })).toBeInTheDocument();
    }, WT);

    await user.click(screen.getByRole('button', { name: /generate report/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    }, WT);

    const dialog = screen.getByRole('dialog');
    await waitFor(() => {
      expect(within(dialog).getByText(/generate report with ai/i)).toBeInTheDocument();
    }, WT);
  });

  it('opens Create Template modal from Templates tab', async () => {
    const user = userEvent.setup();
    const { default: ReportsPage } = await import('../report-center');
    renderWithProviders(<ReportsPage />);

    await waitFor(() => {
      expect(screen.getByText('Report Center')).toBeInTheDocument();
    }, WT);

    await user.click(screen.getByRole('button', { name: /new template/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    }, WT);

    const dialog = screen.getByRole('dialog');
    await waitFor(() => {
      expect(within(dialog).getByText('Template Name')).toBeInTheDocument();
      expect(within(dialog).getByText('Prompt Template')).toBeInTheDocument();
    }, WT);
  });
});
