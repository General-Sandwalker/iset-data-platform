import { Layout, Card, Typography, Row, Col, Statistic } from 'antd';
import { useAuthStore } from '../core/stores/auth.store';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function EcoleDashboard() {
  const { user } = useAuthStore();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #e5e7eb' }}>
        <Title level={4} style={{ lineHeight: '64px', margin: 0 }}>Observatoire Portal</Title>
      </Header>
      <Content style={{ padding: 24 }}>
        <Title level={4}>Welcome, {user?.firstName} {user?.lastName}</Title>
        <Row gutter={16} style={{ marginTop: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Card><Statistic title="Total Students" value={0} /></Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card><Statistic title="Total Alumni" value={0} /></Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card><Statistic title="Surveys" value={0} /></Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card><Statistic title="Dashboards" value={0} /></Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}