import { Card, Typography, theme, Empty, Button, Row, Col } from 'antd';
import { PlusOutlined, LineChartOutlined, BarChartOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function AcademicAnalyticsPage() {
  const { token } = theme.useToken();

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <Title
          level={3}
          style={{ marginBottom: 4, color: token.colorText, fontWeight: 700 }}
        >
          Academic Analytics
        </Title>
        <Text style={{ color: token.colorTextSecondary }}>
          Visualize enrollments, success rates, and academic performance.
        </Text>
      </div>

      <Row gutter={[20, 20]}>
        {[
          { title: 'Enrollments', subtitle: 'Students by filiere' },
          { title: 'Success Rates', subtitle: 'Pass/fail ratios' },
          { title: 'Evolution', subtitle: 'Trends over time' },
          { title: 'Teachers', subtitle: 'By specialty' },
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
                  background: `${token.colorPrimary}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  color: token.colorPrimary,
                }}
              >
                <BarChartOutlined style={{ fontSize: 24 }} />
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