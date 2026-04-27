import { useState } from 'react';
import {
  Card,
  Typography,
  Tabs,
  Modal,
  Button,
  Space,
  theme,
  message,
} from 'antd';
import {
  DatabaseOutlined,
  LinkOutlined,
  SettingOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { schemaApi, type DynamicTable } from '../core/api/schema';
import TableList from './components/TableList';
import TableCreator from './components/TableCreator';
import DataBrowser from './components/DataBrowser';
import RelationshipEditor from './components/RelationshipEditor';
import TableSettings from './components/TableSettings';

const { Title, Text } = Typography;

type ViewMode = 'list' | 'browser' | 'settings';

export default function DatabasePage() {
  const { token } = theme.useToken();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('tables');
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<DynamicTable | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const handleTableCreated = () => {
    setIsCreatorOpen(false);
    queryClient.invalidateQueries({ queryKey: ['schema-tables'] });
    message.success('Table created successfully');
  };

  const handleViewTable = (table: DynamicTable) => {
    setSelectedTable(table);
    setViewMode('browser');
  };

  const handleOpenSettings = (table: DynamicTable) => {
    setSelectedTable(table);
    setViewMode('settings');
  };

  const handleBackToList = () => {
    setSelectedTable(null);
    setViewMode('list');
    queryClient.invalidateQueries({ queryKey: ['schema-tables'] });
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'browser':
        return selectedTable ? (
          <div>
            <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={handleBackToList}
              >
                Back
              </Button>
              <Button
                icon={<SettingOutlined />}
                onClick={() => setViewMode('settings')}
              >
                Table Settings
              </Button>
            </div>
            <DataBrowser table={selectedTable} onClose={handleBackToList} />
          </div>
        ) : null;

      case 'settings':
        return selectedTable ? (
          <div>
            <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => setViewMode('browser')}
                disabled={!selectedTable}
              >
                Back to Data
              </Button>
              <Button
                type="primary"
                icon={<ArrowLeftOutlined />}
                onClick={handleBackToList}
              >
                Back to Tables
              </Button>
            </div>
            <TableSettings table={selectedTable} onClose={handleBackToList} />
          </div>
        ) : null;

      default:
        return (
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
                  key: 'tables',
                  label: (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <DatabaseOutlined />
                      Tables
                    </span>
                  ),
                  children: (
                    <div style={{ padding: '24px 0' }}>
                      <TableList
                        onCreateNew={() => setIsCreatorOpen(true)}
                        onViewTable={handleViewTable}
                        onOpenSettings={handleOpenSettings}
                      />
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
                    <div style={{ padding: '24px 0' }}>
                      <RelationshipEditor />
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        );
    }
  };

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
      </div>

      {renderContent()}

      <Modal
        title="Create New Table"
        open={isCreatorOpen}
        onCancel={() => setIsCreatorOpen(false)}
        footer={null}
        width={700}
        destroyOnClose
      >
        <TableCreator
          onSuccess={handleTableCreated}
          onCancel={() => setIsCreatorOpen(false)}
        />
      </Modal>
    </div>
  );
}