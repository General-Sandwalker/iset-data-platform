import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, clearAuth, setAuth, mockStudentUser } from '../test/helpers';

vi.mock('../core/api/client', () => ({
  apiClient: {
    get: vi.fn().mockImplementation((url: string) => {
      if (url === '/public/stats') {
        return Promise.resolve({ data: { success: true, data: { students: 150, tables: 5, surveys: 12, dashboards: 3 } } });
      }
      if (url === '/public/dashboards') {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      if (url.startsWith('/public/surveys/')) {
        const slug = url.split('/').pop();
        if (slug === 'auth-survey') {
          return Promise.resolve({ data: { success: true, data: { id: 's-auth', title: 'Auth Survey', accessType: 'authenticated', questions: [] } } });
        }
        if (slug === 'public-survey') {
          return Promise.resolve({
            data: {
              success: true,
              data: {
                id: 's-pub',
                title: 'Public Feedback Survey',
                description: 'Please share your feedback',
                accessType: 'public',
                allowMultipleResponses: false,
                questions: [
                  { id: 'q-1', label: 'How satisfied are you?', type: 'rating', configJson: { max: 5 }, isRequired: true, orderIndex: 0 },
                  { id: 'q-2', label: 'Comments', type: 'text', configJson: {}, isRequired: false, orderIndex: 1 },
                ],
              },
            },
          });
        }
        return Promise.resolve({ data: { success: false, error: { message: 'Not found' } } });
      }
      if (url.startsWith('/public/dashboards/')) {
        return Promise.resolve({ data: { success: true, data: { id: 'd-1', title: 'Public Dashboard', charts: [] } } });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    }),
    post: vi.fn().mockResolvedValue({ data: { success: true, data: {} } }),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

const WT = { timeout: 5000 };

describe('Public Landing Page', () => {
  beforeEach(() => {
    clearAuth();
  });

  it('renders landing page with hero title', async () => {
    const { default: LandingPage } = await import('../public-pages/landing');
    renderWithProviders(<LandingPage />, { route: '/' });

    await waitFor(() => {
      expect(screen.getAllByText(/ISET Tozeur/).length).toBeGreaterThanOrEqual(1);
    }, WT);
    expect(screen.getByText(/Digital Observatory/)).toBeInTheDocument();
  });

  it('renders without authentication', async () => {
    const { default: LandingPage } = await import('../public-pages/landing');
    clearAuth();
    renderWithProviders(<LandingPage />, { route: '/' });

    await waitFor(() => {
      expect(screen.getAllByText(/ISET Tozeur/).length).toBeGreaterThanOrEqual(1);
    }, WT);
    expect(screen.queryByPlaceholderText('CIN or Username')).not.toBeInTheDocument();
  });

  it('has access button that navigates to login', async () => {
    const { default: LandingPage } = await import('../public-pages/landing');
    renderWithProviders(<LandingPage />, { route: '/' });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /accéder à la plateforme/i })).toBeInTheDocument();
    }, WT);
  });

  it('displays stats from API', async () => {
    const { default: LandingPage } = await import('../public-pages/landing');
    renderWithProviders(<LandingPage />, { route: '/' });

    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument();
    }, WT);
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});

describe('Public Dashboard Viewer', () => {
  beforeEach(() => {
    clearAuth();
  });

  it('renders public dashboard page without auth', async () => {
    const { default: PublicDashboardPage } = await import('../public-pages/dashboard-viewer');
    renderWithProviders(<PublicDashboardPage />, { route: '/public/dashboards/test-slug' });

    expect(screen.queryByPlaceholderText('CIN or Username')).not.toBeInTheDocument();
  });
});

describe('Public Survey Form', () => {
  beforeEach(() => {
    clearAuth();
  });

  it('renders public survey page without auth', async () => {
    const { default: PublicSurveyPage } = await import('../public-pages/survey-form');
    renderWithProviders(<PublicSurveyPage />, { route: '/public/surveys/test-slug' });

    expect(screen.queryByPlaceholderText('CIN or Username')).not.toBeInTheDocument();
  });

  it('shows authentication required for authenticated survey without login', async () => {
    const { default: PublicSurveyPage } = await import('../public-pages/survey-form');
    renderWithProviders(<PublicSurveyPage />, { route: '/public/surveys/auth-survey', path: '/public/surveys/:slug' });

    await waitFor(() => {
      expect(screen.getByText(/authentication required/i)).toBeInTheDocument();
    }, WT);
  });

  it('shows public survey questions for public survey', async () => {
    const { default: PublicSurveyPage } = await import('../public-pages/survey-form');
    renderWithProviders(<PublicSurveyPage />, { route: '/public/surveys/public-survey', path: '/public/surveys/:slug' });

    await waitFor(() => {
      expect(screen.getAllByText('Public Feedback Survey').length).toBeGreaterThanOrEqual(1);
    }, WT);
    expect(screen.getByText(/how satisfied are you/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit response/i })).toBeInTheDocument();
  });
});
