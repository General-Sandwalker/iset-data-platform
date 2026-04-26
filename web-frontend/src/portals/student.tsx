import { Card, Typography, Row, Col, Statistic, theme, Space } from 'antd';
import { useAuthStore } from '../core/stores/auth.store';
import { UserOutlined, FileTextOutlined, FolderOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const { token } = theme.useToken();

  return (
    <div style={{ minHeight: '100vh', background: token.colorBgBase, padding: 24 }}>
      <div style={{ marginBottom: 32 }}>
        <Title level={3} style={{ color: token.colorText, marginBottom: 4 }}>
          Student Portal
        </Title>
        <Text style={{ color: token.colorTextSecondary }}>
          Welcome back, {user?.firstName} {user?.lastName}
        </Text>
      </div>

      <Row gutter={[20, 20]}>
        <Col xs={24} sm={12} lg={8}>
          <Card style={{ borderRadius: 16, border: `1px solid ${token.colorBorderSecondary}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                <FileTextOutlined style={{ fontSize: 20 }} />
              </div>
              <Statistic title="My Surveys" value={0} valueStyle={{ fontWeight: 700 }} />
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card style={{ borderRadius: 16, border: `1px solid ${token.colorBorderSecondary}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(168,85,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7' }}>
                <FileTextOutlined style={{ fontSize: 20 }} />
              </div>
              <Statistic title="Available Surveys" value={0} valueStyle={{ fontWeight: 700 }} />
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card style={{ borderRadius: 16, border: `1px solid ${token.colorBorderSecondary}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                <FolderOutlined style={{ fontSize: 20 }} />
              </div>
              <Statistic title="Documents" value={0} valueStyle={{ fontWeight: 700 }} />
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}