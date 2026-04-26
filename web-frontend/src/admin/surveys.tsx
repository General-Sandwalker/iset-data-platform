import { Card, Typography, Table, Button, Space, theme, Empty, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function SurveysPage() {
  const { token } = theme.useToken();

  return (
    <div>
      <div
        style={{
          marginBottom: 28,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <Title
            level={3}
            style={{ marginBottom: 4, color: token.colorText, fontWeight: 700 }}
          >
            Survey Management
          </Title>
          <Text style={{ color: token.colorTextSecondary }}>
            Create, publish, and manage surveys with AI assistance.
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          style={{ borderRadius: 10 }}
        >
          Create Survey
        </Button>
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
                No surveys created yet
              </Text>
              <Text
                style={{
                  color: token.colorTextTertiary,
                  fontSize: 12,
                }}
              >
                Create your first survey to start collecting data
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
            Create First Survey
          </Button>
        </Empty>
      </Card>
    </div>
  );
}