import { Card, Typography, Row, Col, Statistic, theme } from 'antd';
import { useAuthStore } from '../core/stores/auth.store';
import { TeamOutlined, UserOutlined, FileTextOutlined, DashboardOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function EcoleDashboard() {
  const { user } = useAuthStore();
  const { token } = theme.useToken();

  return (
    <div style={{ minHeight: '100vh', background: token.colorBgBase, padding: 24 }}>
      <div style={{ marginBottom: 32 }}>
        <Title level={3} style={{ color: token.colorText, marginBottom: 4 }}>
          Responsable Observatoire Portal
        </Title>
        <Text style={{ color: token.colorTextSecondary }}>
          Welcome back, {user?.firstName} {user?.lastName}
        </Text>
      </div>

      <Row gutter={[20, 20]}>
        {[
          { title: 'Total Students', value: 0, color: '#6366f1', icon: <UserOutlined /> },
          { title: 'Total Alumni', value: 0, color: '#10b981', icon: <TeamOutlined /> },
          { title: 'Surveys', value: 0, color: '#a855f7', icon: <FileTextOutlined /> },
          { title: 'Dashboards', value: 0, color: '#22d3ee', icon: <DashboardOutlined /> },
        ].map((stat) => (
          <Col xs={24} sm={12} lg={6} key={stat.title}>
            <Card style={{ borderRadius: 16, border: `1px solid ${token.colorBorderSecondary}` }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: stat.color }}>
                  {stat.icon}
                </div>
                <Statistic title={stat.title} value={stat.value} valueStyle={{ fontWeight: 700 }} />
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}