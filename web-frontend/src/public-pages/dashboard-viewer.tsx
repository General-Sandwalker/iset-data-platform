import { Card, Typography, Row, Col } from 'antd';

const { Title, Text } = Typography;

export default function PublicDashboardPage() {
  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>Public Dashboard</Title>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card>Dashboard content will appear here</Card>
        </Col>
      </Row>
    </div>
  );
}