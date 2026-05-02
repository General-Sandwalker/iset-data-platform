import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, setAuth, clearAuth, mockStudentUser, mockTeacherUser, mockAlumniUser, mockManagerUser } from '../test/helpers';

vi.mock('../core/api/client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: { success: true, data: { availableSurveys: 3, publishedDashboards: 2, myRecords: 1, dataTables: 5 } } }),
    post: vi.fn().mockResolvedValue({ data: { success: true, data: {} } }),
    patch: vi.fn().mockResolvedValue({ data: { success: true, data: {} } }),
    delete: vi.fn().mockResolvedValue({ data: { success: true, data: {} } }),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

vi.mock('../core/api/schema', () => ({
  schemaApi: {
    getMyRecords: vi.fn().mockResolvedValue({ success: true, data: { cin: '22222222', tablesCount: 1, records: {} } }),
  },
}));

const WT = { timeout: 5000 };

describe('Student Portal Dashboard', () => {
  beforeEach(() => {
    clearAuth();
    setAuth(mockStudentUser);
  });

  it('renders student dashboard with greeting', async () => {
    const { default: StudentDashboard } = await import('../portals/student/dashboard');
    renderWithProviders(<StudentDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
    }, WT);
  });

  it('shows student name in dashboard', async () => {
    const { default: StudentDashboard } = await import('../portals/student/dashboard');
    renderWithProviders(<StudentDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Student User/i)).toBeInTheDocument();
    }, WT);
  });
});

describe('Teacher Portal Dashboard', () => {
  beforeEach(() => {
    clearAuth();
    setAuth(mockTeacherUser);
  });

  it('renders teacher dashboard with greeting', async () => {
    const { default: TeacherDashboard } = await import('../portals/teacher/dashboard');
    renderWithProviders(<TeacherDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
    }, WT);
  });
});

describe('Alumni Portal Dashboard', () => {
  beforeEach(() => {
    clearAuth();
    setAuth(mockAlumniUser);
  });

  it('renders alumni dashboard with greeting', async () => {
    const { default: AlumniDashboard } = await import('../portals/alumni/dashboard');
    renderWithProviders(<AlumniDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
    }, WT);
  });
});

describe('Observatoire Portal Dashboard', () => {
  beforeEach(() => {
    clearAuth();
    setAuth(mockManagerUser);
  });

  it('renders observatoire dashboard', async () => {
    const { default: ObservatoireDashboard } = await import('../portals/observatoire/dashboard');
    renderWithProviders(<ObservatoireDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
    }, WT);
  });
});
