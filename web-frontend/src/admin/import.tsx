import { useState } from 'react';
import { Card, Typography, Tabs, Button, theme, Space } from 'antd';
import { UploadOutlined, HistoryOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import ImportWizard from './components/ImportWizard';
import ImportHistory from './components/ImportHistory';

const { Title, Text } = Typography;

export default function ImportPage() {
  const { token } = theme.useToken();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('wizard');

  const handleImportComplete = () => {
    setActiveTab('history');
    queryClient.invalidateQueries({ queryKey: ['imports'] });
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <Title
          level={3}
          style={{ marginBottom: 4, color: token.colorText, fontWeight: 700 }}
        >
          Data Import
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
        styles={{ body: { padding: 0 } }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          style={{ padding: '0 24px' }}
          items={[
            {
              key: 'wizard',
              label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <UploadOutlined />
                  Import Wizard
                </span>
              ),
              children: (
                <div style={{ padding: '24px 0' }}>
                  <ImportWizard
                    onComplete={handleImportComplete}
                    onCancel={() => setActiveTab('history')}
                  />
                </div>
              ),
            },
            {
              key: 'history',
              label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <HistoryOutlined />
                  Import History
                </span>
              ),
              children: (
                <div style={{ padding: '24px 0' }}>
                  <ImportHistory />
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
