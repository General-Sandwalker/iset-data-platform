import { Card, Typography, Table, Button, Space, theme, Empty } from 'antd';
import { PlusOutlined, TeamOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function PartnershipsPage() {
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
            Partnerships
          </Title>
          <Text style={{ color: token.colorTextSecondary }}>
            Manage company partnerships, offers, and collaborations.
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          style={{ borderRadius: 10 }}
        >
          Add Company
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
                No partnerships registered
              </Text>
              <Text
                style={{
                  color: token.colorTextTertiary,
                  fontSize: 12,
                }}
              >
                Add companies to start managing partnerships and offers
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
            Add First Company
          </Button>
        </Empty>
      </Card>
    </div>
  );
}