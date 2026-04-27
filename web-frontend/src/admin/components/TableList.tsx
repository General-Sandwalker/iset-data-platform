import { useState } from 'react';
import {
  Card,
  Typography,
  Button,
  Space,
  Modal,
  message,
  Popconfirm,
  Tag,
  theme,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  DatabaseOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schemaApi, type DynamicTable } from '../../core/api/schema';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

interface TableListProps {
  onCreateNew?: () => void;
  onViewTable?: (table: DynamicTable) => void;
}

export default function TableList({ onCreateNew, onViewTable }: TableListProps) {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['schema-tables'],
    queryFn: () => schemaApi.listTables(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => schemaApi.deleteTable(id),
    onSuccess: () => {
      message.success('Table deleted');
      queryClient.invalidateQueries({ queryKey: ['schema-tables'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.error?.message || 'Failed to delete table');
    },
  });

  const tables = data?.data || [];

  if (!isLoading && tables.length === 0) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center' }}>
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
                Create your first dynamic table to start building your data structure
              </Text>
            </div>
          }
        >
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onCreateNew}
            style={{ marginTop: 16, borderRadius: 10 }}
          >
            Create First Table
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onCreateNew}
          style={{ borderRadius: 10 }}
        >
          New Table
        </Button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {tables.map((table) => (
          <Card
            key={table.id}
            hoverable
            style={{
              borderRadius: 12,
              border: `1px solid ${token.colorBorderSecondary}`,
            }}
            styles={{ body: { padding: 16 } }}
            actions={[
              <Button
                key="view"
                type="text"
                icon={<EyeOutlined />}
                onClick={() => onViewTable?.(table)}
              >
                Browse
              </Button>,
              <Popconfirm
                key="delete"
                title="Delete this table?"
                description="All data in this table will be permanently deleted."
                onConfirm={() => deleteMutation.mutate(table.id)}
                okText="Delete"
                okButtonProps={{ danger: true }}
              >
                <Button type="text" danger icon={<DeleteOutlined />}>
                  Delete
                </Button>
              </Popconfirm>,
            ]}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: `${token.colorPrimary}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <DatabaseOutlined style={{ fontSize: 20, color: token.colorPrimary }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text
                  strong
                  style={{
                    display: 'block',
                    fontSize: 15,
                    marginBottom: 4,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {table.display_name}
                </Text>
                <Text
                  type="secondary"
                  style={{
                    fontSize: 12,
                    display: 'block',
                    marginBottom: 8,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {table.name}
                </Text>
                <Space size={4}>
                  {table.is_user_linked && (
                    <Tag color="blue" style={{ margin: 0 }}>User Linked</Tag>
                  )}
                  {table.fields && table.fields.length > 0 && (
                    <Tag style={{ margin: 0 }}>{table.fields.length} fields</Tag>
                  )}
                </Space>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}