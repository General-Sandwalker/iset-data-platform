import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, setAuth, clearAuth, mockAdminUser } from '../test/helpers';

vi.mock('../core/api/schema', () => ({
  schemaApi: {
    listTables: vi.fn().mockResolvedValue({ success: true, data: [] }),
    createTable: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 't-new', name: 'dt_test', display_name: 'Test Table', description: 'A test table', is_user_linked: false },
    }),
    createField: vi.fn().mockResolvedValue({ success: true, data: { id: 'f-new' } }),
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

describe('TableCreator - Step 0 (Basic Info)', () => {
  beforeEach(() => {
    clearAuth();
    setAuth(mockAdminUser);
  });

  it('renders the first step with basic info form', async () => {
    const { default: TableCreator } = await import('./components/TableCreator');
    renderWithProviders(<TableCreator onCancel={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Basic Info')).toBeInTheDocument();
    }, WT);
    expect(screen.getByText('Table Name')).toBeInTheDocument();
    expect(screen.getByText('Display Name')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Link to Users')).toBeInTheDocument();
  });

  it('shows Next and Cancel buttons', async () => {
    const { default: TableCreator } = await import('./components/TableCreator');
    renderWithProviders(<TableCreator onCancel={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Basic Info')).toBeInTheDocument();
    }, WT);
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });
});

describe('TableCreator - Step 1 (Fields)', () => {
  beforeEach(() => {
    clearAuth();
    setAuth(mockAdminUser);
  });

  it('navigates to Fields step and shows Add Field button', async () => {
    const user = userEvent.setup();
    const { default: TableCreator } = await import('./components/TableCreator');
    renderWithProviders(<TableCreator onCancel={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Basic Info')).toBeInTheDocument();
    }, WT);

    const nameInputs = screen.getAllByPlaceholderText(/e\.g\., students/i);
    await user.type(nameInputs[0], 'test_table');
    const displayInputs = screen.getAllByPlaceholderText(/e\.g\., Students/i);
    await user.type(displayInputs[0], 'Test Table');

    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText('Fields')).toBeInTheDocument();
    }, WT);
    expect(screen.getByRole('button', { name: /add field/i })).toBeInTheDocument();
    expect(screen.getByText(/no fields added yet/i)).toBeInTheDocument();
  });
});

describe('TableCreator - Step 2 (Review)', () => {
  beforeEach(() => {
    clearAuth();
    setAuth(mockAdminUser);
  });

  it('navigates to Review step and shows table information', async () => {
    const user = userEvent.setup();
    const { default: TableCreator } = await import('./components/TableCreator');
    renderWithProviders(<TableCreator onCancel={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Basic Info')).toBeInTheDocument();
    }, WT);

    const nameInputs = screen.getAllByPlaceholderText(/e\.g\., students/i);
    await user.type(nameInputs[0], 'test_table');
    const displayInputs = screen.getAllByPlaceholderText(/e\.g\., Students/i);
    await user.type(displayInputs[0], 'Test Table');

    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText('Fields')).toBeInTheDocument();
    }, WT);

    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText('Review')).toBeInTheDocument();
    }, WT);
    expect(screen.getByText('Table Information')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create table/i })).toBeInTheDocument();
  });
});

describe('Database Page - Table CRUD', () => {
  beforeEach(() => {
    clearAuth();
    setAuth(mockAdminUser);
  });

  it('renders the database page with tabs and New Table button', async () => {
    const { default: DatabasePage } = await import('./database');
    renderWithProviders(<DatabasePage />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /tables/i })).toBeInTheDocument();
    }, WT);
    expect(screen.getByRole('tab', { name: /relationships/i })).toBeInTheDocument();
  });
});
