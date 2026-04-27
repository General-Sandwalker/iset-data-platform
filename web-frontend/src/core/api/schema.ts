import { apiClient, type ApiResponse } from './client';

export const fieldTypes = ['text', 'number', 'decimal', 'date', 'datetime', 'boolean', 'select', 'multiselect', 'email', 'phone', 'file', 'user_link'] as const;
export type FieldType = typeof fieldTypes[number];

export const relationshipTypes = ['one_to_many', 'many_to_one'] as const;
export type RelationshipType = typeof relationshipTypes[number];

export interface DynamicTable {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  is_user_linked: boolean;
  created_by: string | null;
  created_at: string;
  fields?: DynamicField[];
}

export interface DynamicField {
  id: string;
  table_id: string;
  name: string;
  display_name: string;
  field_type: FieldType;
  config_json: Record<string, unknown>;
  is_required: boolean;
  order_index: number;
}

export interface DynamicRelationship {
  id: string;
  source_table_id: string;
  source_field_id: string;
  target_table_id: string;
  target_field_id: string | null;
  relationship_type: RelationshipType;
  created_at: string;
  source_table_name?: string;
  source_field_name?: string;
  target_table_name?: string;
  target_field_name?: string | null;
}

export interface CreateTableInput {
  name: string;
  displayName: string;
  description?: string;
  isUserLinked?: boolean;
}

export interface UpdateTableInput {
  displayName?: string;
  description?: string;
  isUserLinked?: boolean;
}

export interface CreateFieldInput {
  name: string;
  displayName: string;
  fieldType: FieldType;
  configJson?: Record<string, unknown>;
  isRequired?: boolean;
  orderIndex?: number;
}

export interface UpdateFieldInput {
  displayName?: string;
  configJson?: Record<string, unknown>;
  isRequired?: boolean;
  orderIndex?: number;
}

export interface CreateRelationshipInput {
  sourceTableId: string;
  sourceFieldId: string;
  targetTableId: string;
  targetFieldId?: string;
  relationshipType: RelationshipType;
}

export interface DataRecord {
  id: string;
  [key: string]: unknown;
}

export interface DataListParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, { op: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in'; value: unknown }>;
}

export interface DataListResponse {
  success: boolean;
  data?: DataRecord[];
  meta?: { page: number; limit: number; total: number };
  error?: { code: string; message: string; details?: unknown };
}

export const schemaApi = {
  async listTables(): Promise<ApiResponse<DynamicTable[]>> {
    const response = await apiClient.get('/schema/tables');
    return response.data;
  },

  async getTable(id: string): Promise<ApiResponse<DynamicTable>> {
    const response = await apiClient.get(`/schema/tables/${id}`);
    return response.data;
  },

  async createTable(data: CreateTableInput): Promise<ApiResponse<DynamicTable>> {
    const response = await apiClient.post('/schema/tables', data);
    return response.data;
  },

  async updateTable(id: string, data: UpdateTableInput): Promise<ApiResponse<DynamicTable>> {
    const response = await apiClient.patch(`/schema/tables/${id}`, data);
    return response.data;
  },

  async deleteTable(id: string): Promise<ApiResponse<{ message: string }>> {
    const response = await apiClient.delete(`/schema/tables/${id}`);
    return response.data;
  },

  async listFields(tableId: string): Promise<ApiResponse<DynamicField[]>> {
    const response = await apiClient.get(`/schema/tables/${tableId}/fields`);
    return response.data;
  },

  async createField(tableId: string, data: CreateFieldInput): Promise<ApiResponse<DynamicField>> {
    const response = await apiClient.post(`/schema/tables/${tableId}/fields`, data);
    return response.data;
  },

  async updateField(fieldId: string, data: UpdateFieldInput): Promise<ApiResponse<DynamicField>> {
    const response = await apiClient.patch(`/schema/tables/fields/${fieldId}`, data);
    return response.data;
  },

  async deleteField(fieldId: string): Promise<ApiResponse<{ message: string }>> {
    const response = await apiClient.delete(`/schema/tables/fields/${fieldId}`);
    return response.data;
  },

  async listRelationships(tableId?: string): Promise<ApiResponse<DynamicRelationship[]>> {
    const response = await apiClient.get('/schema/relationships', {
      params: tableId ? { tableId } : undefined,
    });
    return response.data;
  },

  async createRelationship(data: CreateRelationshipInput): Promise<ApiResponse<DynamicRelationship>> {
    const response = await apiClient.post('/schema/relationships', data);
    return response.data;
  },

  async updateRelationship(id: string, data: Partial<CreateRelationshipInput>): Promise<ApiResponse<DynamicRelationship>> {
    const response = await apiClient.patch(`/schema/relationships/${id}`, data);
    return response.data;
  },

  async deleteRelationship(id: string): Promise<ApiResponse<{ message: string }>> {
    const response = await apiClient.delete(`/schema/relationships/${id}`);
    return response.data;
  },

  async listData(tableId: string, params?: DataListParams): Promise<DataListResponse> {
    const response = await apiClient.get(`/schema/tables/${tableId}/data`, { params });
    return response.data;
  },

  async insertData(tableId: string, data: Record<string, unknown>): Promise<ApiResponse<DataRecord>> {
    const response = await apiClient.post(`/schema/tables/${tableId}/data`, data);
    return response.data;
  },

  async updateData(tableId: string, recordId: string, data: Record<string, unknown>): Promise<ApiResponse<DataRecord>> {
    const response = await apiClient.patch(`/schema/tables/${tableId}/data/${recordId}`, data);
    return response.data;
  },

  async deleteData(tableId: string, recordId: string): Promise<ApiResponse<{ message: string }>> {
    const response = await apiClient.delete(`/schema/tables/${tableId}/data/${recordId}`);
    return response.data;
  },

  async getMyRecords(): Promise<ApiResponse<{ cin: string; tablesCount: number; records: Record<string, DataRecord[]> }>> {
    const response = await apiClient.get('/schema/my-records');
    return response.data;
  },
};