import { apiClient, type ApiResponse } from './client';

export interface ReportTemplate {
  id: string;
  name: string;
  description: string | null;
  prompt_template: string;
  target_table_id: string | null;
  config_json: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportSection {
  title: string;
  content: string;
}

export interface GeneratedReport {
  id: string;
  template_id: string;
  user_cin: string | null;
  content: { sections: ReportSection[] } | null;
  status: string;
  created_at: string;
}

export const reportsApi = {
  async listTemplates(): Promise<ApiResponse<ReportTemplate[]>> {
    const response = await apiClient.get('/reports/templates');
    return response.data;
  },

  async getTemplate(id: string): Promise<ApiResponse<ReportTemplate>> {
    const response = await apiClient.get(`/reports/templates/${id}`);
    return response.data;
  },

  async createTemplate(data: {
    name: string;
    description?: string;
    promptTemplate: string;
    targetTableId?: string;
    configJson?: Record<string, unknown>;
  }): Promise<ApiResponse<ReportTemplate>> {
    const response = await apiClient.post('/reports/templates', data);
    return response.data;
  },

  async updateTemplate(id: string, data: {
    name?: string;
    description?: string;
    promptTemplate?: string;
    targetTableId?: string | null;
    configJson?: Record<string, unknown>;
  }): Promise<ApiResponse<ReportTemplate>> {
    const response = await apiClient.patch(`/reports/templates/${id}`, data);
    return response.data;
  },

  async deleteTemplate(id: string): Promise<ApiResponse<{ message: string }>> {
    const response = await apiClient.delete(`/reports/templates/${id}`);
    return response.data;
  },

  async previewTemplate(id: string, sampleData: Record<string, unknown>): Promise<ApiResponse<{
    filledTemplate: string;
    placeholders: string[];
    missing: string[];
  }>> {
    const response = await apiClient.post(`/reports/templates/${id}/preview`, { sampleData });
    return response.data;
  },

  async listReports(params?: {
    templateId?: string;
    userCin?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<GeneratedReport[]>> {
    const response = await apiClient.get('/reports/reports', { params });
    return response.data;
  },

  async getReport(id: string): Promise<ApiResponse<GeneratedReport>> {
    const response = await apiClient.get(`/reports/reports/${id}`);
    return response.data;
  },

  async generateReport(data: {
    templateId: string;
    cin: string;
    filters?: Record<string, unknown>;
  }): Promise<ApiResponse<GeneratedReport>> {
    const response = await apiClient.post('/reports/reports/generate', data);
    return response.data;
  },
};
