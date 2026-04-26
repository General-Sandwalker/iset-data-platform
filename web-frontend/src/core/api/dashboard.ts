import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../core/api/client';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [usersRes, activityRes] = await Promise.all([
        apiClient.get('/users', { params: { limit: 1 } }),
        apiClient.get('/admin/activity-logs', { params: { limit: 10 } }),
      ]);
      return {
        totalUsers: usersRes.data.meta?.total || 0,
        recentActivity: activityRes.data.data || [],
      };
    },
  });
}