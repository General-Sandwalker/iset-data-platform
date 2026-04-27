import { apiClient, type ApiResponse } from './client';
import { type FieldType } from './schema';

export interface SuggestedField {
  name: string;
  displayName: string;
  fieldType: FieldType;
  isRequired: boolean;
  configJson?: Record<string, unknown>;
}

export interface TableSuggestion {
  tableName: string;
  displayName: string;
  description: string;
  isUserLinked: boolean;
  fields: SuggestedField[];
}

export const aiApi = {
  async suggestTable(fileId: string): Promise<ApiResponse<TableSuggestion>> {
    const response = await apiClient.post('/ai/import/suggest-table', { fileId });
    return response.data;
  },
};
