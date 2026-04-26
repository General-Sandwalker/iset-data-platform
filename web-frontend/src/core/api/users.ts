import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../core/api/client';

export interface User {
  id: string;
  cin: string | null;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  last_login: string | null;
}

export interface CreateUserInput {
  cin?: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string;
}

export interface UpdateUserInput extends Partial<CreateUserInput> {
  isActive?: boolean;
}

export function useUsers(params?: {
  page?: number;
  limit?: number;
  role?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: async () => {
      const response = await apiClient.get('/users', { params });
      return response.data;
    },
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: async () => {
      const response = await apiClient.get(`/users/${id}`);
      return response.data.data as User;
    },
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      const response = await apiClient.post('/users', input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: { id: string } & UpdateUserInput) => {
      const response = await apiClient.patch(`/users/${id}`, input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/users/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post(
        `/admin/users/${id}/reset-password`
      );
      return response.data.data.tempPassword as string;
    },
  });
}
