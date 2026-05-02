import { apiClient, type ApiResponse } from './client';

export interface SystemSetting {
  key: string;
  value: any;
  updated_at: string;
  updated_by: string | null;
}

export interface AcademicYear {
  id: string;
  year: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: any;
  created_at: string;
  user_first_name?: string | null;
  user_last_name?: string | null;
}

export const systemApi = {
  async listSettings(): Promise<ApiResponse<SystemSetting[]>> {
    const response = await apiClient.get('/system/settings');
    return response.data;
  },

  async getSetting(key: string): Promise<ApiResponse<SystemSetting>> {
    const response = await apiClient.get(`/system/settings/${key}`);
    return response.data;
  },

  async upsertSetting(key: string, value: any): Promise<ApiResponse<SystemSetting>> {
    const response = await apiClient.put(`/system/settings/${key}`, { value });
    return response.data;
  },

  async deleteSetting(key: string): Promise<ApiResponse<{ message: string }>> {
    const response = await apiClient.delete(`/system/settings/${key}`);
    return response.data;
  },

  async listAcademicYears(): Promise<ApiResponse<AcademicYear[]>> {
    const response = await apiClient.get('/system/academic-years');
    return response.data;
  },

  async createAcademicYear(data: {
    year: string;
    startDate: string;
    endDate: string;
    isCurrent?: boolean;
  }): Promise<ApiResponse<AcademicYear>> {
    const response = await apiClient.post('/system/academic-years', data);
    return response.data;
  },

  async updateAcademicYear(id: string, data: {
    year?: string;
    startDate?: string;
    endDate?: string;
    isCurrent?: boolean;
  }): Promise<ApiResponse<AcademicYear>> {
    const response = await apiClient.patch(`/system/academic-years/${id}`, data);
    return response.data;
  },

  async deleteAcademicYear(id: string): Promise<ApiResponse<{ message: string }>> {
    const response = await apiClient.delete(`/system/academic-years/${id}`);
    return response.data;
  },

  async listActivityLogs(params?: {
    userId?: string;
    action?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<ActivityLog[]>> {
    const response = await apiClient.get('/system/activity-logs', { params });
    return response.data;
  },
};
