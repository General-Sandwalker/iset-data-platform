import { Card, Typography, theme, Empty, Button } from 'antd';
import { PlusOutlined, PieChartOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function DashboardsPage() {
  const { token } = theme.useToken();

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <Title
          level={3}
          style={{ marginBottom: 4, color: token.colorText, fontWeight: 700 }}
        >
          Dashboards
        </Title>
        <Text style={{ color: token.colorTextSecondary }}>
          Build interactive dashboards by combining charts and filters.
        </Text>
      </div>

      <Card
        style={{
          borderRadius: 16,
          border: `1px solid ${token.colorBorderSecondary}`,
        }}
        styles={{ body: { padding: 0 } }}
      >
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div>
              <Text
                style={{
                  color: token.colorTextSecondary,
                  display: 'block',
                  marginBottom: 8,
                }}
              >
                No dashboards created yet
              </Text>
              <Text
                style={{
                  color: token.colorTextTertiary,
                  fontSize: 12,
                }}
              >
                Combine charts into interactive dashboard views
              </Text>
            </div>
          }
          style={{ padding: '60px 0' }}
        >
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ marginTop: 16, borderRadius: 10 }}
          >
            Create First Dashboard
          </Button>
        </Empty>
      </Card>
    </div>
  );
}