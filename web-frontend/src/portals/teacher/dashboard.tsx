import { useState, useEffect, useCallback } from 'react';
import { Card, Typography, Row, Col, Statistic, Spin, Space, theme } from 'antd';
import { useAuthStore } from '../../core/stores/auth.store';
import { FileTextOutlined, DatabaseOutlined, BarChartOutlined } from '@ant-design/icons';
import { apiClient, type ApiResponse } from '../../core/api/client';

const { Title, Text } = Typography;

interface TeacherStats {
  availableSurveys: number;
  publishedDashboards: number;
  dataTables: number;
}

export default function TeacherDashboard() {
  const { user } = useAuthStore();
  const { token } = theme.useToken();
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const res = await apiClient.get<ApiResponse<TeacherStats>>('/public/teacher-stats');
      if (res.data.success && res.data.data) setStats(res.data.data);
    } catch { /* fallback */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const statCards = [
    { title: 'Available Surveys', value: stats?.availableSurveys ?? 0, icon: <FileTextOutlined />, color: '#6366f1' },
    { title: 'Data Tables', value: stats?.dataTables ?? 0, icon: <DatabaseOutlined />, color: '#10b981' },
    { title: 'Public Dashboards', value: stats?.publishedDashboards ?? 0, icon: <BarChartOutlined />, color: '#a855f7' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <Title level={3} style={{ marginBottom: 4, color: token.colorText, fontWeight: 700 }}>
          Welcome back, {user?.firstName} {user?.lastName}
        </Title>
        <Text style={{ color: token.colorTextSecondary }}>Teacher Portal Dashboard</Text>
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
          <a onClick={() => window.location.hash = '/teacher/dashboards'} style={{ color: token.colorPrimary }}>View Academic Dashboards</a>
          <a onClick={() => window.location.hash = '/teacher/surveys'} style={{ color: token.colorPrimary }}>Browse Surveys</a>
          <a onClick={() => window.location.hash = '/teacher/profile'} style={{ color: token.colorPrimary }}>Edit Profile</a>
        </Space>
      </Card>
    </div>
  );
}
