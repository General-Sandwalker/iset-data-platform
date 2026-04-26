import { Card, Typography, Steps, Button, theme, Empty, Alert } from 'antd';
import { UploadOutlined, InboxOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function ImportPage() {
  const { token } = theme.useToken();

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <Title
          level={3}
          style={{ marginBottom: 4, color: token.colorText, fontWeight: 700 }}
        >
          Data Import Wizard
        </Title>
        <Text style={{ color: token.colorTextSecondary }}>
          Import data from CSV, Excel, or JSON files into your dynamic tables.
        </Text>
      </div>

      <Card
        style={{
          borderRadius: 16,
          border: `1px solid ${token.colorBorderSecondary}`,
        }}
        styles={{ body: { padding: '40px 24px' } }}
      >
        <Steps
          current={0}
          size="small"
          items={[
            { title: 'Upload', description: 'Select file' },
            { title: 'Preview', description: 'Review data' },
            { title: 'Mapping', description: 'Map columns' },
            { title: 'Validation', description: 'Check errors' },
            { title: 'Execute', description: 'Import data' },
          ]}
          style={{ marginBottom: 40 }}
        />

        <div
          style={{
            padding: '60px 24px',
            textAlign: 'center',
            background: token.colorBgSpotlight,
            borderRadius: 16,
            border: `2px dashed ${token.colorBorder}`,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              background: `${token.colorPrimary}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}
          >
            <InboxOutlined
              style={{ fontSize: 32, color: token.colorPrimary }}
            />
          </div>
          <Title level={4} style={{ marginBottom: 8, color: token.colorText }}>
            Upload Your File
          </Title>
          <Text
            style={{
              color: token.colorTextSecondary,
              display: 'block',
              marginBottom: 24,
            }}
          >
            Drag and drop a CSV, Excel, or JSON file here to get started
          </Text>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            style={{ borderRadius: 10 }}
          >
            Browse Files
          </Button>
        </div>

        <Alert
          message="Supported Formats"
          description="CSV (.csv), Excel (.xlsx, .xls), JSON (.json) - Maximum file size: 50MB"
          type="info"
          showIcon
          style={{
            marginTop: 24,
            borderRadius: 12,
            background: `${token.colorPrimary}08`,
            border: `1px solid ${token.colorPrimary}20`,
          }}
        />
      </Card>
    </div>
  );
}