import { apiClient, type ApiResponse } from './client';

export const analyticsApi = {
  async getEnrollmentsSummary(params?: {
    annee?: string;
    filiere?: string;
    niveau?: string;
    genre?: string;
  }): Promise<ApiResponse<any>> {
    const response = await apiClient.get('/analytics/academic/enrollments/summary', { params });
    return response.data;
  },

  async getSuccessRates(params?: {
    annee?: string;
    filiere?: string;
    niveau?: string;
    genre?: string;
  }): Promise<ApiResponse<any>> {
    const response = await apiClient.get('/analytics/academic/success-rates', { params });
    return response.data;
  },

  async getTeacherStats(params?: {
    annee?: string;
    genre?: string;
  }): Promise<ApiResponse<any>> {
    const response = await apiClient.get('/analytics/academic/teachers', { params });
    return response.data;
  },

  async getFormationStats(params?: {
    annee?: string;
  }): Promise<ApiResponse<any>> {
    const response = await apiClient.get('/analytics/academic/formations', { params });
    return response.data;
  },

  async getEventStats(params?: {
    annee?: string;
  }): Promise<ApiResponse<any>> {
    const response = await apiClient.get('/analytics/academic/events', { params });
    return response.data;
  },

  async getMappings(): Promise<ApiResponse<Record<string, string | null>>> {
    const response = await apiClient.get('/analytics/academic/mappings');
    return response.data;
  },

  async setMapping(key: string, tableId: string): Promise<ApiResponse<any>> {
    const response = await apiClient.post('/analytics/academic/mappings', { key, tableId });
    return response.data;
  },
};
