import { useState } from 'react';
import {
  Card,
  Typography,
  Tabs,
  Modal,
  theme,
  message,
} from 'antd';
import {
  DatabaseOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { schemaApi, type DynamicTable } from '../core/api/schema';
import TableList from './components/TableList';
import TableCreator from './components/TableCreator';
import DataBrowser from './components/DataBrowser';
import RelationshipEditor from './components/RelationshipEditor';

const { Title, Text } = Typography;

export default function DatabasePage() {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('tables');
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<DynamicTable | null>(null);

  const handleTableCreated = () => {
    setIsCreatorOpen(false);
    queryClient.invalidateQueries({ queryKey: ['schema-tables'] });
    message.success('Table created successfully');
  };

  const handleViewTable = (table: DynamicTable) => {
    setSelectedTable(table);
  };

  const handleCloseBrowser = () => {
    setSelectedTable(null);
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

      {selectedTable ? (
        <DataBrowser table={selectedTable} onClose={handleCloseBrowser} />
      ) : (
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
      )}

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