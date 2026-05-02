import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, setAuth, clearAuth, mockAdminUser, mockStudentUser, mockSuperAdminUser, mockManagerUser, mockTeacherUser, mockAlumniUser } from './test/helpers';
import App from './App';

vi.mock('./core/api/client', () => ({
  apiClient: {
    get: vi.fn().mockImplementation((url: string) => {
      if (url === '/public/stats') {
        return Promise.resolve({ data: { success: true, data: { students: 100, tables: 10, surveys: 5, dashboards: 3 } } });
      }
      if (url === '/public/dashboards') {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    }),
    post: vi.fn().mockResolvedValue({ data: { success: true, data: {} } }),
    patch: vi.fn().mockResolvedValue({ data: { success: true, data: {} } }),
    delete: vi.fn().mockResolvedValue({ data: { success: true, data: {} } }),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

vi.mock('./core/api/schema', () => ({
  schemaApi: {
    listTables: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getMyRecords: vi.fn().mockResolvedValue({ success: true, data: { cin: '', tablesCount: 0, records: {} } }),
  },
}));

vi.mock('./core/api/survey', () => ({
  surveyApi: {
    list: vi.fn().mockResolvedValue({ success: true, data: [] }),
  },
}));

vi.mock('./core/api/reports', () => ({
  reportsApi: {
    listTemplates: vi.fn().mockResolvedValue({ success: true, data: [] }),
    listReports: vi.fn().mockResolvedValue({ success: true, data: [] }),
  },
}));

const WT = { timeout: 5000 };

describe('Public Routes', () => {
  beforeEach(() => {
    clearAuth();
  });

  it('renders landing page at /', async () => {
    renderWithProviders(<App />, { route: '/' });
    await waitFor(() => {
      expect(screen.getAllByText(/ISET Tozeur/).length).toBeGreaterThanOrEqual(1);
    }, WT);
  });

  it('renders login page at /login', async () => {
    renderWithProviders(<App />, { route: '/login' });
    await waitFor(() => {
      expect(screen.getByPlaceholderText('CIN or Username')).toBeInTheDocument();
    }, WT);
  });
});

describe('Admin Route Access', () => {
  beforeEach(() => {
    clearAuth();
  });

  it('redirects unauthenticated users from /admin to /login', async () => {
    renderWithProviders(<App />, { route: '/admin' });
    await waitFor(() => {
      expect(screen.getByPlaceholderText('CIN or Username')).toBeInTheDocument();
    }, WT);
  });

  it('allows admin access to /admin', async () => {
    setAuth(mockAdminUser);
    renderWithProviders(<App />, { route: '/admin' });
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('CIN or Username')).not.toBeInTheDocument();
    }, WT);
  });

  it('allows super_admin access to /admin', async () => {
    setAuth(mockSuperAdminUser);
    renderWithProviders(<App />, { route: '/admin' });
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('CIN or Username')).not.toBeInTheDocument();
    }, WT);
  });

  it('blocks student from /admin/settings with 403', async () => {
    setAuth(mockStudentUser);
    renderWithProviders(<App />, { route: '/admin/settings' });
    await waitFor(() => {
      expect(screen.getByText('403')).toBeInTheDocument();
    }, WT);
  });

  it('blocks teacher from /admin/analytics/academic with 403', async () => {
    setAuth(mockTeacherUser);
    renderWithProviders(<App />, { route: '/admin/analytics/academic' });
    await waitFor(() => {
      expect(screen.getByText('403')).toBeInTheDocument();
    }, WT);
  });

  it('allows manager access to /admin/analytics/academic', async () => {
    setAuth(mockManagerUser);
    renderWithProviders(<App />, { route: '/admin/analytics/academic' });
    await waitFor(() => {
      expect(screen.queryByText('403')).not.toBeInTheDocument();
    }, WT);
  });
});

describe('Student Portal Access', () => {
  beforeEach(() => {
    clearAuth();
  });

  it('blocks unauthenticated users from /student/dashboard', async () => {
    renderWithProviders(<App />, { route: '/student/dashboard' });
    await waitFor(() => {
      expect(screen.getByPlaceholderText('CIN or Username')).toBeInTheDocument();
    }, WT);
  });

  it('allows student access to /student/dashboard', async () => {
    setAuth(mockStudentUser);
    renderWithProviders(<App />, { route: '/student/dashboard' });
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('CIN or Username')).not.toBeInTheDocument();
    }, WT);
  });

  it('blocks admin from /student/dashboard with 403', async () => {
    setAuth(mockAdminUser);
    renderWithProviders(<App />, { route: '/student/dashboard' });
    await waitFor(() => {
      expect(screen.getByText('403')).toBeInTheDocument();
    }, WT);
  });
});

describe('Teacher Portal Access', () => {
  beforeEach(() => {
    clearAuth();
  });

  it('allows teacher access to /teacher/dashboard', async () => {
    setAuth(mockTeacherUser);
    renderWithProviders(<App />, { route: '/teacher/dashboard' });
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('CIN or Username')).not.toBeInTheDocument();
    }, WT);
  });

  it('blocks student from /teacher/dashboard with 403', async () => {
    setAuth(mockStudentUser);
    renderWithProviders(<App />, { route: '/teacher/dashboard' });
    await waitFor(() => {
      expect(screen.getByText('403')).toBeInTheDocument();
    }, WT);
  });
});

describe('Alumni Portal Access', () => {
  beforeEach(() => {
    clearAuth();
  });

  it('allows alumni access to /alumni/dashboard', async () => {
    setAuth(mockAlumniUser);
    renderWithProviders(<App />, { route: '/alumni/dashboard' });
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('CIN or Username')).not.toBeInTheDocument();
    }, WT);
  });

  it('blocks student from /alumni/dashboard with 403', async () => {
    setAuth(mockStudentUser);
    renderWithProviders(<App />, { route: '/alumni/dashboard' });
    await waitFor(() => {
      expect(screen.getByText('403')).toBeInTheDocument();
    }, WT);
  });
});

describe('Observatoire Portal Access', () => {
  beforeEach(() => {
    clearAuth();
  });

  it('allows manager access to /observatoire/dashboard', async () => {
    setAuth(mockManagerUser);
    renderWithProviders(<App />, { route: '/observatoire/dashboard' });
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('CIN or Username')).not.toBeInTheDocument();
    }, WT);
  });

  it('blocks student from /observatoire/dashboard with 403', async () => {
    setAuth(mockStudentUser);
    renderWithProviders(<App />, { route: '/observatoire/dashboard' });
    await waitFor(() => {
      expect(screen.getByText('403')).toBeInTheDocument();
    }, WT);
  });
});
