import { useState } from 'react';
import {
  Modal,
  Table,
  Input,
  Switch,
  Select,
  Typography,
  Space,
  Tag,
  Alert,
  Spin,
  message,
  theme,
  Button,
} from 'antd';
import { RobotOutlined, CheckOutlined } from '@ant-design/icons';
import { fieldTypes, type FieldType } from '../../core/api/schema';
import { aiApi, type TableSuggestion, type SuggestedField } from '../../core/api/ai';

const { Text } = Typography;

interface AiSuggestionModalProps {
  open: boolean;
  fileId: string;
  onCancel: () => void;
  onApply: (suggestion: TableSuggestion) => void;
}

export default function AiSuggestionModal({ open, fileId, onCancel, onApply }: AiSuggestionModalProps) {
  const { token } = theme.useToken();
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<TableSuggestion | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await aiApi.suggestTable(fileId);
      if (result.success && result.data) {
        setSuggestion(result.data);
      } else {
        message.error(result.error?.message || 'Failed to get AI suggestion');
      }
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || 'AI suggestion failed. Check GROQ_API_KEY configuration.');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (index: number, updates: Partial<SuggestedField>) => {
    if (!suggestion) return;
    const newFields = [...suggestion.fields];
    newFields[index] = { ...newFields[index], ...updates };
    setSuggestion({ ...suggestion, fields: newFields });
  };

  const removeField = (index: number) => {
    if (!suggestion) return;
    const newFields = suggestion.fields.filter((_, i) => i !== index);
    setSuggestion({ ...suggestion, fields: newFields });
  };

  const updateTableInfo = (updates: Partial<TableSuggestion>) => {
    if (!suggestion) return;
    setSuggestion({ ...suggestion, ...updates });
  };

  const handleApply = () => {
    if (!suggestion) return;
    onApply(suggestion);
    setSuggestion(null);
    onCancel();
  };

  const handleCancel = () => {
    setSuggestion(null);
    onCancel();
  };

  return (
    <Modal
      title={
        <Space>
          <RobotOutlined style={{ color: token.colorPrimary }} />
          <span>AI Table Suggestion</span>
        </Space>
      }
      open={open}
      onCancel={handleCancel}
      width={800}
      footer={
        suggestion
          ? [
              <Button key="cancel" onClick={handleCancel}>
                Cancel
              </Button>,
              <Button key="regenerate" onClick={handleGenerate} loading={loading}>
                Regenerate
              </Button>,
              <Button
                key="apply"
                type="primary"
                icon={<CheckOutlined />}
                onClick={handleApply}
              >
                Apply Suggestion
              </Button>,
            ]
          : [
              <Button key="cancel" onClick={handleCancel}>
                Cancel
              </Button>,
              <Button
                key="generate"
                type="primary"
                icon={<RobotOutlined />}
                onClick={handleGenerate}
                loading={loading}
              >
                Generate with AI
              </Button>,
            ]
      }
    >
      {loading && !suggestion && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text>AI is analyzing your file structure...</Text>
          </div>
        </div>
      )}

      {!loading && !suggestion && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <RobotOutlined style={{ fontSize: 48, color: token.colorPrimary, marginBottom: 16 }} />
          <div>
            <Text style={{ fontSize: 16, display: 'block', marginBottom: 8 }}>
              Let AI analyze your file and suggest an optimal table structure
            </Text>
            <Text type="secondary">
              The AI will detect field types, suggest names, and configure the table based on your data
            </Text>
          </div>
        </div>
      )}

      {suggestion && (
        <div>
          <Alert
            message="Review the AI suggestion below. You can edit any field before applying."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <div style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              <div>
                <Text strong>Table Name: </Text>
                <Input
                  value={suggestion.tableName}
                  onChange={(e) => updateTableInfo({ tableName: e.target.value })}
                  style={{ width: 200 }}
                  size="small"
                />
              </div>
              <div>
                <Text strong>Display Name: </Text>
                <Input
                  value={suggestion.displayName}
                  onChange={(e) => updateTableInfo({ displayName: e.target.value })}
                  style={{ width: 200 }}
                  size="small"
                />
              </div>
              <div>
                <Text strong>Description: </Text>
                <Input
                  value={suggestion.description}
                  onChange={(e) => updateTableInfo({ description: e.target.value })}
                  style={{ width: '100%', maxWidth: 400 }}
                  size="small"
                />
              </div>
              <div>
                <Text strong>User Linked: </Text>
                <Switch
                  checked={suggestion.isUserLinked}
                  onChange={(checked) => updateTableInfo({ isUserLinked: checked })}
                  size="small"
                />
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  {suggestion.isUserLinked ? 'Adds CIN column linked to users' : 'No user linking'}
                </Text>
              </div>
            </Space>
          </div>

          <Table
            dataSource={suggestion.fields.map((f, i) => ({ ...f, _key: i }))}
            rowKey="_key"
            size="small"
            pagination={false}
            scroll={{ y: 300 }}
            columns={[
              {
                title: 'Field Name',
                dataIndex: 'name',
                key: 'name',
                width: 150,
                render: (val: string, _: SuggestedField, index: number) => (
                  <Input
                    value={val}
                    onChange={(e) => updateField(index, { name: e.target.value })}
                    size="small"
                  />
                ),
              },
              {
                title: 'Display Name',
                dataIndex: 'displayName',
                key: 'displayName',
                width: 150,
                render: (val: string, _: SuggestedField, index: number) => (
                  <Input
                    value={val}
                    onChange={(e) => updateField(index, { displayName: e.target.value })}
                    size="small"
                  />
                ),
              },
              {
                title: 'Type',
                dataIndex: 'fieldType',
                key: 'fieldType',
                width: 130,
                render: (val: FieldType, _: SuggestedField, index: number) => (
                  <Select
                    value={val}
                    onChange={(v: FieldType) => updateField(index, { fieldType: v })}
                    size="small"
                    style={{ width: '100%' }}
                    options={fieldTypes.map((ft) => ({
                      value: ft,
                      label: ft,
                    }))}
                  />
                ),
              },
              {
                title: 'Required',
                dataIndex: 'isRequired',
                key: 'isRequired',
                width: 70,
                render: (val: boolean, _: SuggestedField, index: number) => (
                  <Switch
                    checked={val}
                    onChange={(checked) => updateField(index, { isRequired: checked })}
                    size="small"
                  />
                ),
              },
              {
                title: 'Options',
                key: 'options',
                width: 160,
                render: (_: unknown, record: SuggestedField) => {
                  if (record.fieldType === 'select' || record.fieldType === 'multiselect') {
                    const opts = (record.configJson?.options as string[]) || [];
                    return (
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {opts.length > 0 ? opts.join(', ') : '—'}
                      </Text>
                    );
                  }
                  return <Text type="secondary">—</Text>;
                },
              },
              {
                title: '',
                key: 'actions',
                width: 40,
                render: (_: unknown, __: SuggestedField, index: number) => (
                  <Tag
                    color="red"
                    style={{ cursor: 'pointer' }}
                    onClick={() => removeField(index)}
                  >
                    ×
                  </Tag>
                ),
              },
            ]}
          />
        </div>
      )}
    </Modal>
  );
}
