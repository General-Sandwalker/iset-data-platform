import { apiClient, type ApiResponse } from './client';

export type ChartType = 'bar' | 'line' | 'pie' | 'donut' | 'area' | 'scatter' | 'table' | 'metric' | 'horizontal_bar' | 'radar';

export interface Chart {
  id: string;
  title: string;
  description: string | null;
  chart_type: ChartType;
  table_id: string;
  sql_query: string;
  config_json: Record<string, unknown>;
  is_public: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  table_name?: string;
  table_display_name?: string;
}

export interface ChartDataResult {
  rows: Record<string, unknown>[];
  totalCount: number;
}

export interface DashboardChart {
  id: string;
  dashboard_id: string;
  chart_id: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  config_json: Record<string, unknown>;
  created_at: string;
  chart?: Chart;
  data?: Record<string, unknown>[];
  totalCount?: number;
  error?: string;
}

export interface Dashboard {
  id: string;
  title: string;
  description: string | null;
  layout_json: Record<string, unknown>;
  is_public: boolean;
  published_slug: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  charts?: DashboardChart[];
}

export interface ChartSuggestion {
  title: string;
  chartType: ChartType;
  sqlQuery: string;
  configJson: Record<string, unknown>;
  description: string;
}

export const vizApi = {
  async listCharts(params?: { tableId?: string; isPublic?: boolean }): Promise<ApiResponse<Chart[]>> {
    const response = await apiClient.get('/viz/charts', { params });
    return response.data;
  },

  async getChart(id: string): Promise<ApiResponse<Chart>> {
    const response = await apiClient.get(`/viz/charts/${id}`);
    return response.data;
  },

  async createChart(data: {
    title: string;
    description?: string;
    chartType: ChartType;
    tableId: string;
    sqlQuery: string;
    configJson?: Record<string, unknown>;
    isPublic?: boolean;
  }): Promise<ApiResponse<Chart>> {
    const response = await apiClient.post('/viz/charts', data);
    return response.data;
  },

  async updateChart(id: string, data: {
    title?: string;
    description?: string;
    chartType?: ChartType;
    sqlQuery?: string;
    configJson?: Record<string, unknown>;
    isPublic?: boolean;
  }): Promise<ApiResponse<Chart>> {
    const response = await apiClient.patch(`/viz/charts/${id}`, data);
    return response.data;
  },

  async deleteChart(id: string): Promise<ApiResponse<{ message: string }>> {
    const response = await apiClient.delete(`/viz/charts/${id}`);
    return response.data;
  },

  async executeChart(id: string, limit?: number): Promise<ApiResponse<ChartDataResult>> {
    const response = await apiClient.post(`/viz/charts/${id}/execute`, null, { params: { limit } });
    return response.data;
  },

  async executeRawQuery(tableId: string, sqlQuery: string, limit?: number): Promise<ApiResponse<ChartDataResult>> {
    const response = await apiClient.post('/viz/charts/execute-raw', { tableId, sqlQuery, limit });
    return response.data;
  },

  async listDashboards(params?: { isPublic?: boolean }): Promise<ApiResponse<Dashboard[]>> {
    const response = await apiClient.get('/viz/dashboards', { params });
    return response.data;
  },

  async getDashboard(id: string): Promise<ApiResponse<Dashboard>> {
    const response = await apiClient.get(`/viz/dashboards/${id}`);
    return response.data;
  },

  async createDashboard(data: {
    title: string;
    description?: string;
    isPublic?: boolean;
  }): Promise<ApiResponse<Dashboard>> {
    const response = await apiClient.post('/viz/dashboards', data);
    return response.data;
  },

  async updateDashboard(id: string, data: {
    title?: string;
    description?: string;
    isPublic?: boolean;
  }): Promise<ApiResponse<Dashboard>> {
    const response = await apiClient.patch(`/viz/dashboards/${id}`, data);
    return response.data;
  },

  async deleteDashboard(id: string): Promise<ApiResponse<{ message: string }>> {
    const response = await apiClient.delete(`/viz/dashboards/${id}`);
    return response.data;
  },

  async addChartToDashboard(dashboardId: string, data: {
    chartId: string;
    positionX?: number;
    positionY?: number;
    width?: number;
    height?: number;
  }): Promise<ApiResponse<DashboardChart>> {
    const response = await apiClient.post(`/viz/dashboards/${dashboardId}/charts`, data);
    return response.data;
  },

  async removeChartFromDashboard(chartId: string): Promise<ApiResponse<{ message: string }>> {
    const response = await apiClient.delete(`/viz/dashboards/charts/${chartId}`);
    return response.data;
  },

  async updateDashboardChart(chartId: string, data: {
    positionX?: number;
    positionY?: number;
    width?: number;
    height?: number;
  }): Promise<ApiResponse<DashboardChart>> {
    const response = await apiClient.patch(`/viz/dashboards/charts/${chartId}`, data);
    return response.data;
  },

  async publishDashboard(id: string): Promise<ApiResponse<Dashboard>> {
    const response = await apiClient.post(`/viz/dashboards/${id}/publish`);
    return response.data;
  },

  async unpublishDashboard(id: string): Promise<ApiResponse<Dashboard>> {
    const response = await apiClient.post(`/viz/dashboards/${id}/unpublish`);
    return response.data;
  },

  async generateChart(description: string, tableId: string): Promise<ApiResponse<ChartSuggestion>> {
    const response = await apiClient.post('/ai/charts/generate', { description, tableId });
    return response.data;
  },
};
