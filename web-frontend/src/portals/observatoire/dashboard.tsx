import { useState, useEffect, useCallback } from 'react';
import { Card, Typography, Row, Col, Statistic, Spin, Space, theme } from 'antd';
import { useAuthStore } from '../../core/stores/auth.store';
import { UserOutlined, TeamOutlined, FileTextOutlined, FundProjectionScreenOutlined, DatabaseOutlined, FilePdfOutlined } from '@ant-design/icons';
import { apiClient, type ApiResponse } from '../../core/api/client';

const { Title, Text } = Typography;

interface ObservatoireStats {
  students: number;
  alumni: number;
  surveys: number;
  dashboards: number;
  dataTables: number;
  reports: number;
}

export default function ObservatoireDashboard() {
  const { user } = useAuthStore();
  const { token } = theme.useToken();
  const [stats, setStats] = useState<ObservatoireStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const res = await apiClient.get<ApiResponse<ObservatoireStats>>('/public/observatoire-stats');
      if (res.data.success && res.data.data) setStats(res.data.data);
    } catch { /* fallback */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const statCards = [
    { title: 'Students', value: stats?.students ?? 0, icon: <UserOutlined />, color: '#6366f1' },
    { title: 'Alumni', value: stats?.alumni ?? 0, icon: <TeamOutlined />, color: '#10b981' },
    { title: 'Surveys', value: stats?.surveys ?? 0, icon: <FileTextOutlined />, color: '#a855f7' },
    { title: 'Dashboards', value: stats?.dashboards ?? 0, icon: <FundProjectionScreenOutlined />, color: '#22d3ee' },
    { title: 'Data Tables', value: stats?.dataTables ?? 0, icon: <DatabaseOutlined />, color: '#f59e0b' },
    { title: 'Reports', value: stats?.reports ?? 0, icon: <FilePdfOutlined />, color: '#ef4444' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <Title level={3} style={{ marginBottom: 4, color: token.colorText, fontWeight: 700 }}>
          Welcome back, {user?.firstName} {user?.lastName}
        </Title>
        <Text style={{ color: token.colorTextSecondary }}>Observatoire Dashboard — Overview of all platform activity</Text>
      </div>

      <Spin spinning={loading}>
        <Row gutter={[20, 20]}>
          {statCards.map((stat) => (
            <Col xs={24} sm={12} lg={8} key={stat.title}>
              <Card style={{ borderRadius: 16, border: `1px solid ${token.colorBorderSecondary}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: `${stat.color}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: stat.color, fontSize: 20,
                  }}>
                    {stat.icon}
                  </div>
                  <Statistic title={stat.title} value={stat.value} valueStyle={{ fontWeight: 700 }} />
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Spin>

      <Card style={{ marginTop: 24, borderRadius: 16, border: `1px solid ${token.colorBorderSecondary}` }}>
        <Title level={5} style={{ marginBottom: 16 }}>Quick Actions</Title>
        <Space wrap>
          <a onClick={() => window.location.hash = '/observatoire/analytics/academic'} style={{ color: token.colorPrimary }}>Academic Analytics</a>
          <a onClick={() => window.location.hash = '/observatoire/analytics/insertion'} style={{ color: token.colorPrimary }}>Insertion Analytics</a>
          <a onClick={() => window.location.hash = '/observatoire/surveys'} style={{ color: token.colorPrimary }}>Manage Surveys</a>
          <a onClick={() => window.location.hash = '/observatoire/charts'} style={{ color: token.colorPrimary }}>Charts & Dashboards</a>
          <a onClick={() => window.location.hash = '/observatoire/reports'} style={{ color: token.colorPrimary }}>Generate Reports</a>
          <a onClick={() => window.location.hash = '/observatoire/profile'} style={{ color: token.colorPrimary }}>Edit Profile</a>
        </Space>
      </Card>
    </div>
  );
}
