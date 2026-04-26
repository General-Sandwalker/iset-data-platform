import { Card, Typography, Tabs, Button, theme, Empty } from 'antd';
import { PlusOutlined, DatabaseOutlined, LinkOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function DatabasePage() {
  const { token } = theme.useToken();
  const navigate = useNavigate();

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
            Visual Database Manager
          </Title>
          <Text style={{ color: token.colorTextSecondary }}>
            Create and manage dynamic tables, fields, and relationships.
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {}}
          style={{ borderRadius: 10 }}
        >
          New Table
        </Button>
      </div>

      <Card
        style={{
          borderRadius: 16,
          border: `1px solid ${token.colorBorderSecondary}`,
        }}
        styles={{ body: { padding: 0 } }}
      >
        <Tabs
          defaultActiveKey="tables"
          style={{ padding: '0 24px' }}
          items={[
            {
              key: 'tables',
              label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <DatabaseOutlined />
                  Tables
                </span>
              ),
              children: (
                <div
                  style={{
                    padding: '60px 0',
                    textAlign: 'center',
                  }}
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
                          No tables created yet
                        </Text>
                        <Text
                          style={{
                            color: token.colorTextTertiary,
                            fontSize: 12,
                          }}
                        >
                          Create your first dynamic table to start building your
                          data structure
                        </Text>
                      </div>
                    }
                  >
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => {}}
                      style={{ marginTop: 16, borderRadius: 10 }}
                    >
                      Create First Table
                    </Button>
                  </Empty>
                </div>
              ),
            },
            {
              key: 'relationships',
              label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <LinkOutlined />
                  Relationships
                </span>
              ),
              children: (
                <div
                  style={{
                    padding: '60px 0',
                    textAlign: 'center',
                  }}
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
                          No relationships defined
                        </Text>
                        <Text
                          style={{
                            color: token.colorTextTertiary,
                            fontSize: 12,
                          }}
                        >
                          Define relationships between tables to create linked
                          data structures
                        </Text>
                      </div>
                    }
                  >
                    <Button
                      type="primary"
                      icon={<LinkOutlined />}
                      onClick={() => {}}
                      style={{ marginTop: 16, borderRadius: 10 }}
                    >
                      Create Relationship
                    </Button>
                  </Empty>
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}