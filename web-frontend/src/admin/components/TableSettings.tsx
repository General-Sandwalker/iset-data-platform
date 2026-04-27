import { useState } from 'react';
import {
  Card,
  Typography,
  Form,
  Input,
  Switch,
  Button,
  Space,
  message,
  Popconfirm,
  theme,
  Divider,
} from 'antd';
import {
  SaveOutlined,
  DeleteOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { schemaApi, type DynamicTable, type UpdateTableInput } from '../../core/api/schema';

const { Title, Text } = Typography;

interface TableSettingsProps {
  table: DynamicTable;
  onClose?: () => void;
}

export default function TableSettings({ table, onClose }: TableSettingsProps) {
  const { token } = theme.useToken();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateTableInput) => schemaApi.updateTable(table.id, data),
    onSuccess: () => {
      message.success('Table settings updated');
      queryClient.invalidateQueries({ queryKey: ['schema-tables'] });
      queryClient.invalidateQueries({ queryKey: ['schema-table', table.id] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.error?.message || 'Failed to update table');
    },
  });

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const values = await form.validateFields();
      await updateMutation.mutateAsync(values);
    } catch {}
    finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleUserLinked = async (checked: boolean) => {
    try {
      setIsSubmitting(true);
      await updateMutation.mutateAsync({ isUserLinked: checked });
      message.success(checked ? 'Table linked to users' : 'Table unlinked from users');
    } catch {}
    finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <Card
        style={{ borderRadius: 16 }}
        styles={{ body: { padding: 24 } }}
      >
        <div style={{ marginBottom: 24 }}>
          <Title level={4} style={{ marginBottom: 4 }}>{table.display_name}</Title>
          <Text type="secondary">{table.name}</Text>
        </div>

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            displayName: table.display_name,
            description: table.description || '',
          }}
        >
          <Form.Item
            name="displayName"
            label="Display Name"
            rules={[{ required: true, message: 'Display name is required' }]}
          >
            <Input placeholder="Display Name" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea placeholder="Optional description" rows={3} />
          </Form.Item>

          <Divider />

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <Title level={5} style={{ marginBottom: 2 }}>
                  <LinkOutlined style={{ marginRight: 8 }} />
                  User Linking
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  When enabled, records in this table can be linked to users via CIN
                </Text>
              </div>
              <Switch
                checked={table.is_user_linked}
                onChange={handleToggleUserLinked}
                loading={isSubmitting}
              />
            </div>

            {table.is_user_linked && (
              <div
                style={{
                  padding: 12,
                  background: `${token.colorPrimaryBg}`,
                  borderRadius: 8,
                  border: `1px solid ${token.colorPrimaryBorder}`,
                }}
              >
                <Text style={{ fontSize: 13 }}>
                  This table has a <code style={{ background: token.colorBgContainer, padding: '2px 6px', borderRadius: 4 }}>cin</code> column
                  that links records to users.
                </Text>
              </div>
            )}
          </div>

          <Divider />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={isSubmitting}
              onClick={handleSubmit}
            >
              Save Changes
            </Button>
          </div>
        </Form>
      </Card>

      <Card
        style={{ borderRadius: 16, marginTop: 16 }}
        styles={{ body: { padding: 24 } }}
      >
        <Title level={5} style={{ color: token.colorError }}>Danger Zone</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Deleting a table is permanent and will remove all associated data.
        </Text>
        <Popconfirm
          title="Delete this table?"
          description="This action cannot be undone. All data will be permanently deleted."
          onConfirm={async () => {
            try {
              await schemaApi.deleteTable(table.id);
              message.success('Table deleted');
              queryClient.invalidateQueries({ queryKey: ['schema-tables'] });
              onClose?.();
            } catch (err: any) {
              message.error(err?.response?.data?.error?.message || 'Failed to delete table');
            }
          }}
          okText="Delete"
          okButtonProps={{ danger: true }}
        >
          <Button danger icon={<DeleteOutlined />}>
            Delete Table
          </Button>
        </Popconfirm>
      </Card>
    </div>
  );
}