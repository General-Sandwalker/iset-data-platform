import { ReactNode } from 'react';
import { Result } from 'antd';
import { useAuthStore } from '../../core/stores/auth.store';

interface RoleGuardProps {
  children?: ReactNode;
  allowedRoles: string[];
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user } = useAuthStore();

  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <Result
        status="403"
        title="403"
        subTitle="You don't have permission to access this page."
      />
    );
  }

  return <>{children}</>;
}
