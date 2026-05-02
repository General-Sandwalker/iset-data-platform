import React, { ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, theme, App as AntApp } from 'antd';
import { useAuthStore } from '../core/stores/auth.store';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
  queryClient?: QueryClient;
  path?: string;
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: CustomRenderOptions = {},
) {
  const { route = '/', queryClient = createTestQueryClient(), path, ...renderOptions } = options;

  function Wrapper({ children }: { children: ReactNode }) {
    const inner = path ? (
      <Routes>
        <Route path={path} element={children} />
      </Routes>
    ) : children;

    return (
      <ConfigProvider
        theme={{
          algorithm: theme.defaultAlgorithm,
          token: { colorPrimary: '#6366f1' },
        }}
      >
        <AntApp>
          <MemoryRouter initialEntries={[route]}>
            <QueryClientProvider client={queryClient}>
              {inner}
            </QueryClientProvider>
          </MemoryRouter>
        </AntApp>
      </ConfigProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}

export const mockAdminUser = {
  id: '00000000-0000-0000-0000-000000000001',
  cin: '12345678',
  email: 'admin@iset.tn',
  firstName: 'Admin',
  lastName: 'User',
  role: 'admin' as const,
};

export const mockSuperAdminUser = {
  id: '00000000-0000-0000-0000-000000000002',
  cin: '00000000',
  email: 'super@iset.tn',
  firstName: 'Super',
  lastName: 'Admin',
  role: 'super_admin' as const,
};

export const mockTeacherUser = {
  id: '00000000-0000-0000-0000-000000000003',
  cin: '11111111',
  email: 'teacher@iset.tn',
  firstName: 'Teacher',
  lastName: 'User',
  role: 'enseignant' as const,
};

export const mockStudentUser = {
  id: '00000000-0000-0000-0000-000000000004',
  cin: '22222222',
  email: 'student@iset.tn',
  firstName: 'Student',
  lastName: 'User',
  role: 'etudiant' as const,
};

export const mockAlumniUser = {
  id: '00000000-0000-0000-0000-000000000005',
  cin: '33333333',
  email: 'alumni@iset.tn',
  firstName: 'Alumni',
  lastName: 'User',
  role: 'alumni' as const,
};

export const mockManagerUser = {
  id: '00000000-0000-0000-0000-000000000006',
  cin: '44444444',
  email: 'manager@iset.tn',
  firstName: 'Manager',
  lastName: 'User',
  role: 'responsable_observatoire' as const,
};

type MockUser = typeof mockAdminUser | typeof mockSuperAdminUser | typeof mockTeacherUser | typeof mockStudentUser | typeof mockAlumniUser | typeof mockManagerUser;

export function setAuth(user: MockUser, token = 'test-jwt-token') {
  useAuthStore.getState().login(token, user);
}

export function clearAuth() {
  useAuthStore.getState().logout();
}

export { createTestQueryClient };
