import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, setAuth, clearAuth, mockAdminUser } from '../test/helpers';

vi.mock('../core/api/survey', () => ({
  surveyApi: {
    list: vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          id: 's-1',
          title: 'Student Satisfaction Survey',
          description: 'Annual feedback',
          status: 'published',
          access_type: 'authenticated',
          allow_multiple_responses: false,
          slug: null,
          published_slug: 'abc-123',
          target_table_id: null,
          created_by: 'u-1',
          created_at: '2026-01-01',
        },
        {
          id: 's-2',
          title: 'Alumni Employment Survey',
          description: 'Public survey',
          status: 'draft',
          access_type: 'public',
          allow_multiple_responses: true,
          slug: null,
          published_slug: null,
          target_table_id: null,
          created_by: 'u-1',
          created_at: '2026-01-02',
        },
      ],
    }),
    create: vi.fn().mockResolvedValue({ success: true, data: { id: 's-new' } }),
    delete: vi.fn().mockResolvedValue({ success: true }),
    publish: vi.fn().mockResolvedValue({ success: true, data: { id: 's-2', status: 'published', published_slug: 'xyz-789' } }),
  },
}));

vi.mock('../core/api/client', () => ({
  apiClient: {
    get: vi.fn().mockImplementation((url: string) => {
      if (url === '/public/surveys/auth-survey') {
        return Promise.resolve({ data: { success: true, data: { id: 's-auth', title: 'Auth Survey', accessType: 'authenticated', questions: [] } } });
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

const WT = { timeout: 5000 };

describe('Survey Creation Flow', () => {
  beforeEach(() => {
    clearAuth();
    setAuth(mockAdminUser);
  });

  it('opens Create Survey modal and shows form fields', async () => {
    const user = userEvent.setup();
    const { default: SurveysPage } = await import('./surveys');
    renderWithProviders(<SurveysPage />);

    await waitFor(() => {
      expect(screen.getByText('Survey Management')).toBeInTheDocument();
    }, WT);

    await user.click(screen.getByRole('button', { name: /create survey/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    }, WT);

    const dialog = screen.getByRole('dialog');
    await waitFor(() => {
      expect(within(dialog).getByText('Survey Title')).toBeInTheDocument();
      expect(within(dialog).getByText('Description')).toBeInTheDocument();
      expect(within(dialog).getByText('Access Type')).toBeInTheDocument();
    }, WT);
  }, 60000);

  it('lists existing surveys with title and status', async () => {
    const { default: SurveysPage } = await import('./surveys');
    renderWithProviders(<SurveysPage />);

    await waitFor(() => {
      expect(screen.getByText('Student Satisfaction Survey')).toBeInTheDocument();
      expect(screen.getByText('Alumni Employment Survey')).toBeInTheDocument();
    }, WT);
    expect(screen.getByText('published')).toBeInTheDocument();
    expect(screen.getByText('draft')).toBeInTheDocument();
  });
});

describe('Survey Public Submission Page', () => {
  beforeEach(() => {
    clearAuth();
  });

  it('renders public survey page without auth', async () => {
    const { default: PublicSurveyPage } = await import('../public-pages/survey-form');
    renderWithProviders(<PublicSurveyPage />, { route: '/public/surveys/test-slug', path: '/public/surveys/:slug' });

    expect(screen.queryByPlaceholderText('CIN or Username')).not.toBeInTheDocument();
  });

  it('shows 403 for authenticated-only survey when not logged in', async () => {
    const { default: PublicSurveyPage } = await import('../public-pages/survey-form');
    renderWithProviders(<PublicSurveyPage />, { route: '/public/surveys/auth-survey', path: '/public/surveys/:slug' });

    await waitFor(() => {
      expect(screen.getByText(/authentication required/i)).toBeInTheDocument();
    }, WT);
  });
});
