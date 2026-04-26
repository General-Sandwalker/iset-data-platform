import { Card, Typography, Row, Col, Statistic } from 'antd';

const { Title } = Typography;

export default function DashboardPage() {
  return (
    <div>
      <Title level={3}>Admin Dashboard</Title>
      <Row gutter={16}>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="Total Students" value={0} /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="Total Alumni" value={0} /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="Active Surveys" value={0} /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="Published Dashboards" value={0} /></Card>
        </Col>
      </Row>
    </div>
  );
}