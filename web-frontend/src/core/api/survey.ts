import { apiClient, type ApiResponse } from './client';

export const questionTypes = ['multiple_choice', 'text', 'rating', 'dropdown', 'checkbox', 'date', 'number'] as const;
export type QuestionType = typeof questionTypes[number];

export const surveyStatuses = ['draft', 'published', 'closed'] as const;
export type SurveyStatus = typeof surveyStatuses[number];

export const accessTypes = ['public', 'authenticated'] as const;
export type AccessType = typeof accessTypes[number];

export interface Survey {
  id: string;
  title: string;
  description: string | null;
  target_table_id: string | null;
  status: SurveyStatus;
  access_type: AccessType;
  published_slug: string | null;
  allow_multiple_responses: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SurveyQuestion {
  id: string;
  survey_id: string;
  type: QuestionType;
  label: string;
  config_json: Record<string, unknown>;
  order_index: number;
  is_required: boolean;
  target_field_id: string | null;
}

export interface SurveyWithQuestions extends Survey {
  questions: SurveyQuestion[];
}

export interface CreateSurveyInput {
  title: string;
  description?: string;
  targetTableId?: string;
  accessType?: AccessType;
  allowMultipleResponses?: boolean;
}

export interface UpdateSurveyInput {
  title?: string;
  description?: string;
  targetTableId?: string | null;
  accessType?: AccessType;
  allowMultipleResponses?: boolean;
}

export interface AddQuestionInput {
  type: QuestionType;
  label: string;
  configJson?: Record<string, unknown>;
  isRequired?: boolean;
  orderIndex?: number;
  targetFieldId?: string;
  autoCreateField?: boolean;
}

export interface UpdateQuestionInput {
  type?: QuestionType;
  label?: string;
  configJson?: Record<string, unknown>;
  isRequired?: boolean;
  orderIndex?: number;
  targetFieldId?: string | null;
}

export interface SurveyStats {
  surveyId: string;
  title: string;
  status: SurveyStatus;
  totalResponses: number;
  questions: Array<{
    questionId: string;
    label: string;
    type: QuestionType;
    distribution?: Record<string, number>;
    average?: number | null;
    min?: number | null;
    max?: number | null;
    responseCount?: number;
    earliest?: string | null;
    latest?: string | null;
  }>;
}

export interface SurveySuggestion {
  title: string;
  description: string;
  questions: Array<{
    label: string;
    type: QuestionType;
    options?: string[];
    isRequired: boolean;
    min?: number;
    max?: number;
  }>;
}

export const surveyApi = {
  async list(status?: SurveyStatus): Promise<ApiResponse<Survey[]>> {
    const response = await apiClient.get('/surveys', { params: status ? { status } : undefined });
    return response.data;
  },

  async get(id: string): Promise<ApiResponse<SurveyWithQuestions>> {
    const response = await apiClient.get(`/surveys/${id}`);
    return response.data;
  },

  async create(data: CreateSurveyInput): Promise<ApiResponse<Survey>> {
    const response = await apiClient.post('/surveys', data);
    return response.data;
  },

  async update(id: string, data: UpdateSurveyInput): Promise<ApiResponse<Survey>> {
    const response = await apiClient.patch(`/surveys/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<ApiResponse<{ message: string }>> {
    const response = await apiClient.delete(`/surveys/${id}`);
    return response.data;
  },

  async addQuestion(surveyId: string, data: AddQuestionInput): Promise<ApiResponse<SurveyQuestion>> {
    const response = await apiClient.post(`/surveys/${surveyId}/questions`, data);
    return response.data;
  },

  async updateQuestion(questionId: string, data: UpdateQuestionInput): Promise<ApiResponse<SurveyQuestion>> {
    const response = await apiClient.patch(`/surveys/questions/${questionId}`, data);
    return response.data;
  },

  async deleteQuestion(questionId: string): Promise<ApiResponse<{ message: string }>> {
    const response = await apiClient.delete(`/surveys/questions/${questionId}`);
    return response.data;
  },

  async reorderQuestions(surveyId: string, questions: Array<{ id: string; orderIndex: number }>): Promise<ApiResponse<SurveyQuestion[]>> {
    const response = await apiClient.post(`/surveys/${surveyId}/reorder`, { questions });
    return response.data;
  },

  async linkTable(surveyId: string, tableId: string): Promise<ApiResponse<Survey>> {
    const response = await apiClient.post(`/surveys/${surveyId}/link-table`, { tableId });
    return response.data;
  },

  async autoCreateFields(surveyId: string): Promise<ApiResponse<Survey>> {
    const response = await apiClient.post(`/surveys/${surveyId}/auto-create-fields`);
    return response.data;
  },

  async publish(surveyId: string): Promise<ApiResponse<Survey>> {
    const response = await apiClient.post(`/surveys/${surveyId}/publish`);
    return response.data;
  },

  async close(surveyId: string): Promise<ApiResponse<Survey>> {
    const response = await apiClient.post(`/surveys/${surveyId}/close`);
    return response.data;
  },

  async getStats(surveyId: string): Promise<ApiResponse<SurveyStats>> {
    const response = await apiClient.get(`/surveys/${surveyId}/stats`);
    return response.data;
  },

  async generateWithAI(description: string, targetAudience?: string): Promise<ApiResponse<SurveySuggestion>> {
    const response = await apiClient.post('/ai/surveys/generate', { description, targetAudience });
    return response.data;
  },
};
