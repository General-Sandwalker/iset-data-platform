import { Card, Typography, Button, Space, Row, Col } from 'antd';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      title: 'Academic Analytics',
      description: 'Track enrollments, success rates, and student evolution across filieres and academic years.',
      color: '#1a56db',
    },
    {
      title: 'Alumni Tracking',
      description: 'Monitor professional insertion rates, employment delays, and career trajectories of graduates.',
      color: '#059669',
    },
    {
      title: 'Dynamic Surveys',
      description: 'Create and distribute surveys with AI assistance. Collect data directly into your database.',
      color: '#7c3aed',
    },
    {
      title: 'Partnerships',
      description: 'Manage company partnerships, job offers, and internship opportunities.',
      color: '#dc2626',
    },
  ];

  return (
    <div style={{ padding: '48px 24px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 64 }}>
        <Title level={1} style={{ fontSize: 48, marginBottom: 16 }}>
          ISET Tozeur Digital Observatory
        </Title>
        <Text style={{ fontSize: 20, color: '#6b7280' }}>
          A unified platform for academic data management, alumni tracking, and professional insertion analytics.
        </Text>
        <div style={{ marginTop: 32 }}>
          <Button type="primary" size="large" onClick={() => navigate('/login')}>
            Login
          </Button>
        </div>
      </div>

      <Row gutter={[24, 24]}>
        {features.map((feature) => (
          <Col xs={24} sm={12} md={6} key={feature.title}>
            <Card hoverable style={{ height: '100%', borderTop: `4px solid ${feature.color}` }}>
              <Title level={4}>{feature.title}</Title>
              <Text type="secondary">{feature.description}</Text>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}