import { apiClient, type ApiResponse } from './client';

export interface Company {
  id: string;
  name: string;
  sector: string | null;
  address: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  partnership_start_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Offer {
  id: string;
  company_id: string;
  type: 'stage' | 'emploi';
  title: string;
  description: string | null;
  requirements: string | null;
  publish_date: string | null;
  expiry_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Collaboration {
  id: string;
  company_id: string;
  type: string;
  description: string | null;
  date: string | null;
  academic_year: string | null;
  created_at: string;
  updated_at: string;
}

export const partnershipsApi = {
  async listCompanies(params?: { search?: string; sector?: string; isActive?: boolean }): Promise<ApiResponse<Company[]>> {
    const response = await apiClient.get('/partnerships/companies', { params });
    return response.data;
  },

  async getCompany(id: string): Promise<ApiResponse<Company>> {
    const response = await apiClient.get(`/partnerships/companies/${id}`);
    return response.data;
  },

  async createCompany(data: {
    name: string;
    sector?: string;
    address?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    partnershipStartDate?: string;
    isActive?: boolean;
  }): Promise<ApiResponse<Company>> {
    const response = await apiClient.post('/partnerships/companies', data);
    return response.data;
  },

  async updateCompany(id: string, data: {
    name?: string;
    sector?: string;
    address?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    partnershipStartDate?: string;
    isActive?: boolean;
  }): Promise<ApiResponse<Company>> {
    const response = await apiClient.patch(`/partnerships/companies/${id}`, data);
    return response.data;
  },

  async deleteCompany(id: string): Promise<ApiResponse<{ message: string }>> {
    const response = await apiClient.delete(`/partnerships/companies/${id}`);
    return response.data;
  },

  async listOffers(params?: { companyId?: string; type?: string; isActive?: boolean }): Promise<ApiResponse<Offer[]>> {
    const response = await apiClient.get('/partnerships/offers', { params });
    return response.data;
  },

  async getOffer(id: string): Promise<ApiResponse<Offer>> {
    const response = await apiClient.get(`/partnerships/offers/${id}`);
    return response.data;
  },

  async createOffer(data: {
    companyId: string;
    type: string;
    title: string;
    description?: string;
    requirements?: string;
    publishDate?: string;
    expiryDate?: string;
    isActive?: boolean;
  }): Promise<ApiResponse<Offer>> {
    const response = await apiClient.post('/partnerships/offers', data);
    return response.data;
  },

  async updateOffer(id: string, data: {
    companyId?: string;
    type?: string;
    title?: string;
    description?: string;
    requirements?: string;
    publishDate?: string;
    expiryDate?: string;
    isActive?: boolean;
  }): Promise<ApiResponse<Offer>> {
    const response = await apiClient.patch(`/partnerships/offers/${id}`, data);
    return response.data;
  },

  async deleteOffer(id: string): Promise<ApiResponse<{ message: string }>> {
    const response = await apiClient.delete(`/partnerships/offers/${id}`);
    return response.data;
  },

  async listCollaborations(params?: { companyId?: string; academicYear?: string }): Promise<ApiResponse<Collaboration[]>> {
    const response = await apiClient.get('/partnerships/collaborations', { params });
    return response.data;
  },

  async createCollaboration(data: {
    companyId: string;
    type: string;
    description?: string;
    date?: string;
    academicYear?: string;
  }): Promise<ApiResponse<Collaboration>> {
    const response = await apiClient.post('/partnerships/collaborations', data);
    return response.data;
  },

  async updateCollaboration(id: string, data: {
    companyId?: string;
    type?: string;
    description?: string;
    date?: string;
    academicYear?: string;
  }): Promise<ApiResponse<Collaboration>> {
    const response = await apiClient.patch(`/partnerships/collaborations/${id}`, data);
    return response.data;
  },

  async deleteCollaboration(id: string): Promise<ApiResponse<{ message: string }>> {
    const response = await apiClient.delete(`/partnerships/collaborations/${id}`);
    return response.data;
  },
};
