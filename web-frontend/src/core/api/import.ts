import { apiClient, type ApiResponse } from './client';

export type FileType = 'csv' | 'excel' | 'json';
export type ImportStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type TransformType = 'uppercase' | 'lowercase' | 'trim' | 'date_iso' | 'date_fr' | 'number' | 'boolean';

export interface UploadResult {
  id: string;
  filename: string;
  fileType: FileType;
  fileSize: number;
  columns: string[];
  sampleRows: Record<string, unknown>[];
  totalRows: number;
}

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  transform?: TransformType;
}

export interface PreviewResult {
  validRows: Record<string, unknown>[];
  invalidRows: { row: number; data: Record<string, unknown>; errors: string[] }[];
  stats: {
    totalRows: number;
    validCount: number;
    invalidCount: number;
  };
}

export interface ExecuteResult {
  totalRows: number;
  importedRows: number;
  errorCount: number;
  errors: { row: number; error: string }[];
}

export interface CreateTableAndImportResult {
  table: {
    id: string;
    name: string;
    displayName: string;
  };
  totalRows: number;
  importedRows: number;
  errorCount: number;
  errors: { row: number; error: string }[];
}

export interface ImportListItem {
  id: string;
  filename: string;
  fileType: FileType;
  fileSize: number;
  status: ImportStatus;
  columns: string[] | null;
  totalRows: number | null;
  importedRows: number;
  errorCount: number;
  createdAt: string;
  completedAt: string | null;
}

export interface ImportDetail extends ImportListItem {
  errors: object[];
}

export const importApi = {
  async upload(file: File): Promise<ApiResponse<UploadResult>> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/import/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    return response.data;
  },

  async preview(fileId: string, tableId: string, mappings: ColumnMapping[]): Promise<ApiResponse<PreviewResult>> {
    const response = await apiClient.post('/import/preview', { fileId, tableId, mappings });
    return response.data;
  },

  async execute(fileId: string, tableId: string, mappings: ColumnMapping[], skipDuplicates?: boolean): Promise<ApiResponse<ExecuteResult>> {
    const response = await apiClient.post('/import/execute', { fileId, tableId, mappings, skipDuplicates });
    return response.data;
  },

  async createTableAndImport(
    fileId: string,
    tableName: string,
    displayName: string,
    description: string,
    isUserLinked: boolean,
    mappings: ColumnMapping[],
  ): Promise<ApiResponse<CreateTableAndImportResult>> {
    const response = await apiClient.post('/import/create-table-and-import', {
      fileId, tableName, displayName, description, isUserLinked, mappings,
    });
    return response.data;
  },

  async list(page?: number, limit?: number): Promise<ApiResponse<ImportListItem[]>> {
    const response = await apiClient.get('/import', { params: { page, limit } });
    return response.data;
  },

  async get(id: string): Promise<ApiResponse<ImportDetail>> {
    const response = await apiClient.get(`/import/${id}`);
    return response.data;
  },

  async delete(id: string): Promise<ApiResponse<{ message: string }>> {
    const response = await apiClient.delete(`/import/${id}`);
    return response.data;
  },
};
