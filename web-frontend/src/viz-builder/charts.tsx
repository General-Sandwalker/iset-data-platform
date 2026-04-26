import { Card, Typography, theme, Empty, Button } from 'antd';
import { PlusOutlined, LineChartOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function ChartsPage() {
  const { token } = theme.useToken();

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <Title
          level={3}
          style={{ marginBottom: 4, color: token.colorText, fontWeight: 700 }}
        >
          Chart Editor
        </Title>
        <Text style={{ color: token.colorTextSecondary }}>
          Create and manage visualizations with AI-powered assistance.
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
                No charts created yet
              </Text>
              <Text
                style={{
                  color: token.colorTextTertiary,
                  fontSize: 12,
                }}
              >
                Create your first chart to visualize your data
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
            Create First Chart
          </Button>
        </Empty>
      </Card>
    </div>
  );
}