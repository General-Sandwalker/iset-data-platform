import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders, setAuth, clearAuth, mockAdminUser, mockStudentUser, mockSuperAdminUser, mockManagerUser } from '../../test/helpers';
import { useAuthStore } from '../../core/stores/auth.store';
import { AuthGuard } from './AuthGuard';
import { RoleGuard } from './RoleGuard';

describe('AuthGuard', () => {
  beforeEach(() => {
    clearAuth();
  });

  it('redirects to /login when not authenticated', () => {
    renderWithProviders(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>,
      { route: '/admin' },
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    setAuth(mockAdminUser);

    renderWithProviders(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>,
      { route: '/admin' },
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});

describe('RoleGuard', () => {
  beforeEach(() => {
    clearAuth();
  });

  it('shows 403 when user role is not in allowedRoles', () => {
    setAuth(mockStudentUser);

    renderWithProviders(
      <RoleGuard allowedRoles={['admin', 'super_admin']}>
        <div>Admin Content</div>
      </RoleGuard>,
      { route: '/admin/settings' },
    );

    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    expect(screen.getByText('403')).toBeInTheDocument();
    expect(screen.getByText(/don't have permission/i)).toBeInTheDocument();
  });

  it('renders children when user role is in allowedRoles', () => {
    setAuth(mockAdminUser);

    renderWithProviders(
      <RoleGuard allowedRoles={['admin', 'super_admin']}>
        <div>Admin Content</div>
      </RoleGuard>,
      { route: '/admin/settings' },
    );

    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });

  it('allows super_admin access to admin-only routes', () => {
    setAuth(mockSuperAdminUser);

    renderWithProviders(
      <RoleGuard allowedRoles={['super_admin', 'admin']}>
        <div>Settings Page</div>
      </RoleGuard>,
      { route: '/admin/settings' },
    );

    expect(screen.getByText('Settings Page')).toBeInTheDocument();
  });

  it('blocks teacher from admin+manager routes', () => {
    setAuth({ ...mockStudentUser, role: 'enseignant' });

    renderWithProviders(
      <RoleGuard allowedRoles={['super_admin', 'admin', 'responsable_observatoire']}>
        <div>Analytics Page</div>
      </RoleGuard>,
      { route: '/admin/analytics/academic' },
    );

    expect(screen.queryByText('Analytics Page')).not.toBeInTheDocument();
    expect(screen.getByText('403')).toBeInTheDocument();
  });

  it('allows manager access to admin+manager routes', () => {
    setAuth(mockManagerUser);

    renderWithProviders(
      <RoleGuard allowedRoles={['super_admin', 'admin', 'responsable_observatoire']}>
        <div>Analytics Page</div>
      </RoleGuard>,
      { route: '/admin/analytics/academic' },
    );

    expect(screen.getByText('Analytics Page')).toBeInTheDocument();
  });

  it('shows 403 when user is null', () => {
    clearAuth();
    useAuthStore.getState().login('token', mockAdminUser);
    useAuthStore.setState({ user: null });

    renderWithProviders(
      <RoleGuard allowedRoles={['admin']}>
        <div>Content</div>
      </RoleGuard>,
    );

    expect(screen.getByText('403')).toBeInTheDocument();
  });
});
