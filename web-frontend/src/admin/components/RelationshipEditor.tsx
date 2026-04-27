import { useState, useEffect, useRef } from 'react';
import {
  Card,
  Typography,
  Button,
  Space,
  Modal,
  Form,
  Select,
  message,
  Popconfirm,
  theme,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schemaApi, type DynamicTable, type DynamicField, type DynamicRelationship } from '../../core/api/schema';

const { Title, Text } = Typography;

interface TableNode {
  id: string;
  name: string;
  display_name: string;
  x: number;
  y: number;
  fields: DynamicField[];
}

interface RelationshipLine {
  id: string;
  sourceTableId: string;
  sourceFieldId: string;
  targetTableId: string;
  targetFieldId: string | null;
  sourceFieldName: string;
  targetFieldName: string | null;
  relationshipType: string;
}

interface RelationshipEditorProps {
  onClose?: () => void;
}

export default function RelationshipEditor({ onClose }: RelationshipEditorProps) {
  const { token } = theme.useToken();
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [nodes, setNodes] = useState<TableNode[]>([]);
  const [lines, setLines] = useState<RelationshipLine[]>([]);
  const [selectedSourceTable, setSelectedSourceTable] = useState<string>('');
  const [selectedSourceField, setSelectedSourceField] = useState<string>('');
  const [selectedTargetTable, setSelectedTargetTable] = useState<string>('');
  const [selectedTargetField, setSelectedTargetField] = useState<string>('');

  const { data: tablesData, isLoading: tablesLoading } = useQuery({
    queryKey: ['schema-tables-with-fields'],
    queryFn: async () => {
      const tables = await schemaApi.listTables();
      const tablesWithFields = await Promise.all(
        (tables.data || []).map(async (t) => {
          const full = await schemaApi.getTable(t.id);
          return full.data;
        })
      );
      return tablesWithFields;
    },
  });

  const { data: relationshipsData, isLoading: relsLoading } = useQuery({
    queryKey: ['schema-relationships'],
    queryFn: () => schemaApi.listRelationships(),
  });

  const createMutation = useMutation({
    mutationFn: (data: {
      sourceTableId: string;
      sourceFieldId: string;
      targetTableId: string;
      targetFieldId?: string;
      relationshipType: 'one_to_many' | 'many_to_one';
    }) => schemaApi.createRelationship(data),
    onSuccess: () => {
      message.success('Relationship created');
      setIsModalOpen(false);
      form.resetFields();
      setSelectedSourceTable('');
      setSelectedSourceField('');
      setSelectedTargetTable('');
      setSelectedTargetField('');
      queryClient.invalidateQueries({ queryKey: ['schema-relationships'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.error?.message || 'Failed to create relationship');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => schemaApi.deleteRelationship(id),
    onSuccess: () => {
      message.success('Relationship deleted');
      queryClient.invalidateQueries({ queryKey: ['schema-relationships'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.error?.message || 'Failed to delete relationship');
    },
  });

  useEffect(() => {
    if (tablesData) {
      const cols = 3;
      const nodeWidth = 200;
      const nodeHeight = 150;
      const padding = 40;

      const arrangedNodes: TableNode[] = tablesData.map((table, index) => ({
        id: table.id,
        name: table.name,
        display_name: table.display_name,
        x: (index % cols) * (nodeWidth + padding) + padding,
        y: Math.floor(index / cols) * (nodeHeight + padding) + padding,
        fields: table.fields || [],
      }));
      setNodes(arrangedNodes);
    }
  }, [tablesData]);

  useEffect(() => {
    if (relationshipsData?.data) {
      const relLines: RelationshipLine[] = relationshipsData.data.map((r) => ({
        id: r.id,
        sourceTableId: r.source_table_id,
        sourceFieldId: r.source_field_id,
        targetTableId: r.target_table_id,
        targetFieldId: r.target_field_id,
        sourceFieldName: r.source_field_name || '',
        targetFieldName: r.target_field_name,
        relationshipType: r.relationship_type,
      }));
      setLines(relLines);
    }
  }, [relationshipsData]);

  const handleCreateRelationship = async () => {
    try {
      const values = await form.validateFields();
      createMutation.mutate({
        sourceTableId: values.sourceTableId,
        sourceFieldId: values.sourceFieldId,
        targetTableId: values.targetTableId,
        targetFieldId: values.targetFieldId,
        relationshipType: values.relationshipType,
      });
    } catch {}
  };

  const getTableById = (id: string) => nodes.find((n) => n.id === id);
  const getFieldById = (tableId: string, fieldId: string) => {
    const table = getTableById(tableId);
    return table?.fields.find((f) => f.id === fieldId);
  };

  const renderLines = () => {
    return lines.map((line) => {
      const sourceNode = getTableById(line.sourceTableId);
      const targetNode = getTableById(line.targetTableId);
      if (!sourceNode || !targetNode) return null;

      const sourceFieldIndex = sourceNode.fields.findIndex((f) => f.id === line.sourceFieldId);
      const targetFieldIndex = targetNode.fields.findIndex((f) => f.id === line.targetFieldId);

      const sourceX = sourceNode.x + 200;
      const sourceY = sourceNode.y + 60 + (sourceFieldIndex >= 0 ? sourceFieldIndex * 24 : 0);
      const targetX = targetNode.x;
      const targetY = targetNode.y + 60 + (targetFieldIndex >= 0 ? targetFieldIndex * 24 : 0);

      const midX = (sourceX + targetX) / 2;

      const path = `M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`;

      return (
        <g key={line.id}>
          <path
            d={path}
            fill="none"
            stroke={token.colorPrimary}
            strokeWidth={2}
            markerEnd="url(#arrowhead)"
          />
          <text
            x={midX}
            y={(sourceY + targetY) / 2}
            fill={token.colorTextSecondary}
            fontSize={10}
            textAnchor="middle"
          >
            {line.relationshipType === 'one_to_many' ? '1:N' : 'N:1'}
          </text>
        </g>
      );
    });
  };

  const tables = tablesData || [];
  const relationships = relationshipsData?.data || [];

  const sourceTableFields = nodes.find((n) => n.id === selectedSourceTable)?.fields || [];
  const targetTableFields = nodes.find((n) => n.id === selectedTargetTable)?.fields || [];

  if (tablesLoading || relsLoading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;
  }

  if (tables.length === 0) {
    return (
      <Empty
        description="Create tables first before defining relationships"
        style={{ padding: 60 }}
      />
    );
  }

  return (
    <div>
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text type="secondary">
          {relationships.length} relationship{relationships.length !== 1 ? 's' : ''} defined
        </Text>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsModalOpen(true)}
        >
          Create Relationship
        </Button>
      </div>

      <div
        ref={canvasRef}
        style={{
          position: 'relative',
          height: 500,
          background: token.colorBgContainer,
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: 12,
          overflow: 'auto',
        }}
      >
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth={10}
              markerHeight={7}
              refX={9}
              refY={3.5}
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill={token.colorPrimary}
              />
            </marker>
          </defs>
          {renderLines()}
        </svg>

        {nodes.map((node) => (
          <div
            key={node.id}
            style={{
              position: 'absolute',
              left: node.x,
              top: node.y,
              width: 200,
              background: token.colorBgElevated,
              border: `1px solid ${token.colorBorder}`,
              borderRadius: 8,
              padding: 12,
              boxShadow: token.boxShadow,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 8,
              }}
            >
              <LinkOutlined style={{ color: token.colorPrimary }} />
              <Text strong style={{ fontSize: 13 }}>{node.display_name}</Text>
            </div>
            <div style={{ maxHeight: 100, overflow: 'auto' }}>
              {node.fields.slice(0, 5).map((field) => (
                <div
                  key={field.id}
                  style={{
                    fontSize: 11,
                    color: token.colorTextSecondary,
                    padding: '2px 0',
                    borderBottom: `1px solid ${token.colorBorderSecondary}`,
                  }}
                >
                  {field.display_name}
                  <span style={{ color: token.colorTextTertiary }}> ({field.field_type})</span>
                </div>
              ))}
              {node.fields.length > 5 && (
                <Text type="secondary" style={{ fontSize: 10 }}>
                  +{node.fields.length - 5} more
                </Text>
              )}
            </div>
          </div>
        ))}
      </div>

      {relationships.length > 0 && (
        <Card style={{ marginTop: 16 }} size="small">
          <Title level={5}>Relationships</Title>
          {relationships.map((rel) => {
            const sourceTable = nodes.find((n) => n.id === rel.source_table_id);
            const targetTable = nodes.find((n) => n.id === rel.target_table_id);
            return (
              <div
                key={rel.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                <Space>
                  <Text>{sourceTable?.display_name || rel.source_table_id}</Text>
                  <Text type="secondary">via</Text>
                  <Text code>{rel.source_field_name}</Text>
                  <Text type="secondary">({rel.relationship_type})</Text>
                  <Text type="secondary">to</Text>
                  <Text>{targetTable?.display_name || rel.target_table_id}</Text>
                </Space>
                <Popconfirm
                  title="Delete this relationship?"
                  onConfirm={() => deleteMutation.mutate(rel.id)}
                  okText="Delete"
                  okButtonProps={{ danger: true }}
                >
                  <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                </Popconfirm>
              </div>
            );
          })}
        </Card>
      )}

      <Modal
        title="Create Relationship"
        open={isModalOpen}
        onOk={handleCreateRelationship}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
          setSelectedSourceTable('');
          setSelectedSourceField('');
          setSelectedTargetTable('');
          setSelectedTargetField('');
        }}
        okText="Create"
        confirmLoading={createMutation.isPending}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="sourceTableId"
            label="Source Table"
            rules={[{ required: true, message: 'Select source table' }]}
          >
            <Select
              placeholder="Select table"
              showSearch
              optionFilterProp="label"
              options={tables.map((t) => ({ value: t.id, label: t.display_name }))}
              onChange={(val) => {
                setSelectedSourceTable(val);
                setSelectedSourceField('');
                form.setFieldsValue({ sourceFieldId: undefined });
              }}
            />
          </Form.Item>

          <Form.Item
            name="sourceFieldId"
            label="Source Field"
            rules={[{ required: true, message: 'Select source field' }]}
          >
            <Select
              placeholder="Select field"
              showSearch
              options={sourceTableFields.map((f) => ({ value: f.id, label: f.display_name }))}
              onChange={(val) => setSelectedSourceField(val)}
              disabled={!selectedSourceTable}
            />
          </Form.Item>

          <Form.Item
            name="relationshipType"
            label="Relationship Type"
            rules={[{ required: true, message: 'Select type' }]}
            initialValue="many_to_one"
          >
            <Select
              options={[
                { value: 'many_to_one', label: 'Many-to-One (belongs to)' },
                { value: 'one_to_many', label: 'One-to-Many (has many)' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="targetTableId"
            label="Target Table"
            rules={[{ required: true, message: 'Select target table' }]}
          >
            <Select
              placeholder="Select table"
              showSearch
              optionFilterProp="label"
              options={tables.map((t) => ({ value: t.id, label: t.display_name }))}
              onChange={(val) => {
                setSelectedTargetTable(val);
                setSelectedTargetField('');
                form.setFieldsValue({ targetFieldId: undefined });
              }}
            />
          </Form.Item>

          <Form.Item
            name="targetFieldId"
            label="Target Field (optional)"
          >
            <Select
              placeholder="Select field (defaults to id)"
              allowClear
              showSearch
              options={targetTableFields.map((f) => ({ value: f.id, label: f.display_name }))}
              onChange={(val) => setSelectedTargetField(val)}
              disabled={!selectedTargetTable}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}