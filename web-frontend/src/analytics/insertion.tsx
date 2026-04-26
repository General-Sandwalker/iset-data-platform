import { Card, Typography, theme, Row, Col } from 'antd';
import { LineChartOutlined, PieChartOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function InsertionAnalyticsPage() {
  const { token } = theme.useToken();

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <Title
          level={3}
          style={{ marginBottom: 4, color: token.colorText, fontWeight: 700 }}
        >
          Insertion Analytics
        </Title>
        <Text style={{ color: token.colorTextSecondary }}>
          Track professional insertion rates and career outcomes.
        </Text>
      </div>

      <Row gutter={[20, 20]}>
        {[
          { title: 'Insertion Rate', subtitle: 'At 6 & 12 months' },
          { title: 'Delay', subtitle: 'Average time to employment' },
          { title: 'Sectors', subtitle: 'By activity sector' },
          { title: 'Contracts', subtitle: 'Type distribution' },
        ].map((item) => (
          <Col xs={24} sm={12} lg={6} key={item.title}>
            <Card
              hoverable
              style={{
                borderRadius: 16,
                border: `1px solid ${token.colorBorderSecondary}`,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  background: `${token.colorSuccess}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  color: token.colorSuccess,
                }}
              >
                <PieChartOutlined style={{ fontSize: 24 }} />
              </div>
              <Title
                level={5}
                style={{ color: token.colorText, marginBottom: 4 }}
              >
                {item.title}
              </Title>
              <Text style={{ color: token.colorTextTertiary, fontSize: 12 }}>
                {item.subtitle}
              </Text>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}