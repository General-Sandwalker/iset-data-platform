import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders, setAuth, clearAuth, mockAdminUser } from '../test/helpers';

vi.mock('../core/api/import', () => ({
  importApi: {
    upload: vi.fn().mockResolvedValue({
      success: true,
      data: {
        id: 'f-1',
        filename: 'test.csv',
        fileType: 'csv',
        fileSize: 1024,
        columns: ['name', 'email', 'age'],
        sampleRows: [
          { name: 'Alice', email: 'alice@test.com', age: 25 },
          { name: 'Bob', email: 'bob@test.com', age: 30 },
        ],
        totalRows: 100,
      },
    }),
    preview: vi.fn().mockResolvedValue({
      success: true,
      data: {
        validRows: [{ name: 'Alice', email: 'alice@test.com', age: 25 }],
        invalidRows: [],
        stats: { totalRows: 100, validCount: 95, invalidCount: 5 },
      },
    }),
    previewNewTable: vi.fn().mockResolvedValue({
      success: true,
      data: {
        validRows: [{ name: 'Alice', email: 'alice@test.com', age: 25 }],
        invalidRows: [],
        stats: { totalRows: 100, validCount: 95, invalidCount: 5 },
      },
    }),
    execute: vi.fn().mockResolvedValue({
      success: true,
      data: { totalRows: 100, importedRows: 95, errorCount: 5, errors: [] },
    }),
    createTableAndImport: vi.fn().mockResolvedValue({
      success: true,
      data: {
        table: { id: 't-new', name: 'dt_test', displayName: 'Test' },
        totalRows: 100,
        importedRows: 95,
        errorCount: 5,
        errors: [],
      },
    }),
  },
}));

vi.mock('../core/api/schema', () => ({
  schemaApi: {
    listTables: vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          id: 't-1', name: 'dt_students', display_name: 'Students', description: '', is_user_linked: false, created_by: 'u-1', created_at: '2026-01-01',
          fields: [
            { id: 'f-1', name: 'name', display_name: 'Name', field_type: 'text', is_required: true, order_index: 0 },
            { id: 'f-2', name: 'email', display_name: 'Email', field_type: 'email', is_required: false, order_index: 1 },
          ],
        },
      ],
    }),
    getTable: vi.fn().mockResolvedValue({
      success: true,
      data: {
        id: 't-1', name: 'dt_students', display_name: 'Students', description: '', is_user_linked: false,
        fields: [
          { id: 'f-1', name: 'name', display_name: 'Name', field_type: 'text', is_required: true, order_index: 0 },
          { id: 'f-2', name: 'email', display_name: 'Email', field_type: 'email', is_required: false, order_index: 1 },
        ],
      },
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

vi.mock('../core/api/ai', () => ({
  aiApi: {
    suggestTableStructure: vi.fn().mockResolvedValue({
      success: true,
      data: { tableName: 'dt_test', displayName: 'Test', description: '', isUserLinked: false, fields: [] },
    }),
  },
}));

const WT = { timeout: 5000 };

describe('Data Import Page', () => {
  beforeEach(() => {
    clearAuth();
    setAuth(mockAdminUser);
  });

  it('renders import page with wizard and history tabs', async () => {
    const { default: ImportPage } = await import('./import');
    renderWithProviders(<ImportPage />);

    await waitFor(() => {
      expect(screen.getByText('Data Import')).toBeInTheDocument();
    }, WT);
    expect(screen.getByRole('tab', { name: /import wizard/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /import history/i })).toBeInTheDocument();
  });
});

describe('Import Wizard - Step 0 (Upload)', () => {
  beforeEach(() => {
    clearAuth();
    setAuth(mockAdminUser);
  });

  it('renders upload area with Browse Files and Supported Formats', async () => {
    const { default: ImportWizard } = await import('./components/ImportWizard');
    renderWithProviders(<ImportWizard onComplete={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/upload your file/i)).toBeInTheDocument();
    }, WT);
    expect(screen.getAllByRole('button', { name: /browse files/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/supported formats/i)).toBeInTheDocument();
    expect(screen.getByText(/cancel/i)).toBeInTheDocument();
  });

  it('renders all 5 steps in the Steps component', async () => {
    const { default: ImportWizard } = await import('./components/ImportWizard');
    renderWithProviders(<ImportWizard onComplete={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Upload')).toBeInTheDocument();
    }, WT);
    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByText('Mapping')).toBeInTheDocument();
    expect(screen.getByText('Validation')).toBeInTheDocument();
    expect(screen.getByText('Execute')).toBeInTheDocument();
  });
});

describe('Import Wizard - Step transitions via file upload', () => {
  beforeEach(() => {
    clearAuth();
    setAuth(mockAdminUser);
  });

  it('advances to Step 1 (Preview) after file upload', async () => {
    const { default: ImportWizard } = await import('./components/ImportWizard');
    renderWithProviders(<ImportWizard onComplete={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/upload your file/i)).toBeInTheDocument();
    }, WT);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    const file = new File(['name,email,age\nAlice,alice@test.com,25'], 'test.csv', { type: 'text/csv' });
    const dt = new DataTransfer();
    dt.items.add(file);
    Object.defineProperty(fileInput, 'files', { value: dt.files, configurable: true });
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));

    await waitFor(() => {
      expect(screen.getByText(/100 total rows/i)).toBeInTheDocument();
    }, WT);
    expect(screen.getByText(/3 columns/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next: map columns/i })).toBeInTheDocument();
  });

  it('shows Previous and Start Over buttons on Step 1', async () => {
    const { default: ImportWizard } = await import('./components/ImportWizard');
    renderWithProviders(<ImportWizard onComplete={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/upload your file/i)).toBeInTheDocument();
    }, WT);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['name,email,age\nAlice,alice@test.com,25'], 'test.csv', { type: 'text/csv' });
    const dt = new DataTransfer();
    dt.items.add(file);
    Object.defineProperty(fileInput, 'files', { value: dt.files, configurable: true });
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /next: map columns/i })).toBeInTheDocument();
    }, WT);

    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start over/i })).toBeInTheDocument();
  });
});
