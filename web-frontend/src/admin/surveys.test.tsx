import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, setAuth, clearAuth, mockAdminUser } from '../test/helpers';

vi.mock('../core/api/survey', () => {
  const surveys = [
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
      title: 'Alumni Career Survey',
      description: 'Career tracking',
      status: 'draft',
      access_type: 'public',
      allow_multiple_responses: true,
      slug: null,
      published_slug: null,
      target_table_id: null,
      created_by: 'u-1',
      created_at: '2026-01-01',
    },
  ];

  return {
    surveyApi: {
      list: vi.fn().mockResolvedValue({ success: true, data: surveys }),
      create: vi.fn().mockResolvedValue({ success: true, data: { id: 's-new' } }),
      delete: vi.fn().mockResolvedValue({ success: true }),
    },
  };
});

import SurveysPage from './surveys';

const WT = { timeout: 5000 };

describe('Surveys Page', () => {
  beforeEach(() => {
    clearAuth();
    setAuth(mockAdminUser);
  });

  it('renders the surveys page title', async () => {
    renderWithProviders(<SurveysPage />);
    await waitFor(() => {
      expect(screen.getByText('Survey Management')).toBeInTheDocument();
    }, WT);
  });

  it('shows Create Survey button', async () => {
    renderWithProviders(<SurveysPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create survey/i })).toBeInTheDocument();
    }, WT);
  });
});
