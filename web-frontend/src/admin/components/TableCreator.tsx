import { useState } from 'react';
import {
  Card,
  Typography,
  Form,
  Input,
  Switch,
  Button,
  Space,
  Steps,
  message,
  theme,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { schemaApi, type CreateFieldInput, type FieldType } from '../../core/api/schema';

const { Title, Text } = Typography;

interface FieldFormItem extends CreateFieldInput {
  key: string;
}

const fieldTypeOptions: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number (Integer)' },
  { value: 'decimal', label: 'Decimal' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'Date & Time' },
  { value: 'boolean', label: 'Boolean (Yes/No)' },
  { value: 'select', label: 'Single Select' },
  { value: 'multiselect', label: 'Multi Select' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'file', label: 'File Upload' },
  { value: 'user_link', label: 'User Link (CIN)' },
];

interface TableCreatorProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function TableCreator({ onSuccess, onCancel }: TableCreatorProps) {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [basicForm] = Form.useForm();
  const [fields, setFields] = useState<FieldFormItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddField = () => {
    const newField: FieldFormItem = {
      key: `field_${Date.now()}`,
      name: '',
      displayName: '',
      fieldType: 'text',
      isRequired: false,
      orderIndex: fields.length,
    };
    setFields([...fields, newField]);
  };

  const handleRemoveField = (key: string) => {
    setFields(fields.filter((f) => f.key !== key));
  };

  const handleFieldChange = (key: string, changes: Partial<FieldFormItem>) => {
    setFields(
      fields.map((f) => (f.key === key ? { ...f, ...changes } : f))
    );
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const values = await basicForm.validateFields();

      const tableData = {
        name: values.name,
        displayName: values.displayName,
        description: values.description,
        isUserLinked: values.isUserLinked || false,
      };

      const tableResult = await schemaApi.createTable(tableData);
      if (!tableResult.success) {
        message.error(tableResult.error?.message || 'Failed to create table');
        return;
      }

      const tableId = tableResult.data!.id;

      for (const field of fields) {
        if (!field.name || !field.displayName) continue;

        const fieldData: CreateFieldInput = {
          name: field.name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
          displayName: field.displayName,
          fieldType: field.fieldType,
          configJson: field.fieldType === 'select' || field.fieldType === 'multiselect'
            ? { options: field.configJson?.options || [] }
            : field.configJson,
          isRequired: field.isRequired,
          orderIndex: field.orderIndex,
        };

        await schemaApi.createField(tableId, fieldData);
      }

      message.success('Table created successfully');
      onSuccess?.();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error?.message || 'Failed to create table';
      message.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep0Basic = () => (
    <Form
      form={basicForm}
      layout="vertical"
      initialValues={{ isUserLinked: false }}
    >
      <Form.Item
        name="name"
        label="Table Name"
        rules={[
          { required: true, message: 'Table name is required' },
          { pattern: /^[a-zA-Z][a-z0-9_]*$/, message: 'Start with letter, use only letters, numbers, underscores' },
        ]}
      >
        <Input placeholder="e.g., students, courses, grades" />
      </Form.Item>
      <Form.Item
        name="displayName"
        label="Display Name"
        rules={[{ required: true, message: 'Display name is required' }]}
      >
        <Input placeholder="e.g., Students, Courses, Grades" />
      </Form.Item>
      <Form.Item name="description" label="Description">
        <Input.TextArea placeholder="Optional description for this table" rows={3} />
      </Form.Item>
      <Form.Item
        name="isUserLinked"
        label="Link to Users"
        valuePropName="checked"
        extra="When enabled, each record can be linked to a user via CIN"
      >
        <Switch />
      </Form.Item>
    </Form>
  );

  const renderStep1Fields = () => (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text>Define the fields for this table</Text>
        <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddField}>
          Add Field
        </Button>
      </div>

      {fields.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: token.colorTextSecondary }}>
          No fields added yet. Click "Add Field" to start.
        </div>
      )}

      {fields.map((field, index) => (
        <Card
          key={field.key}
          size="small"
          style={{ marginBottom: 12, border: `1px solid ${token.colorBorderSecondary}` }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 150px 40px', gap: 12, alignItems: 'start' }}>
            <Form.Item
              label="Field Name"
              style={{ marginBottom: 0 }}
              rules={[{ required: true, message: 'Required' }]}
            >
              <Input
                placeholder="field_name"
                value={field.name}
                onChange={(e) => handleFieldChange(field.key, { name: e.target.value })}
              />
            </Form.Item>
            <Form.Item
              label="Display Name"
              style={{ marginBottom: 0 }}
              rules={[{ required: true, message: 'Required' }]}
            >
              <Input
                placeholder="Display Name"
                value={field.displayName}
                onChange={(e) => handleFieldChange(field.key, { displayName: e.target.value })}
              />
            </Form.Item>
            <Form.Item
              label="Type"
              style={{ marginBottom: 0 }}
            >
              <select
                value={field.fieldType}
                onChange={(e) => handleFieldChange(field.key, { fieldType: e.target.value as FieldType })}
                style={{ width: '100%', height: 32, borderRadius: 6, border: `1px solid ${token.colorBorder}` }}
              >
                {fieldTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </Form.Item>
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleRemoveField(field.key)}
              style={{ marginTop: 24 }}
            />
          </div>

          {(field.fieldType === 'select' || field.fieldType === 'multiselect') && (
            <div style={{ marginTop: 12 }}>
              <Form.Item label="Options (comma-separated)" style={{ marginBottom: 0 }}>
                <Input
                  placeholder="Option 1, Option 2, Option 3"
                  onChange={(e) => handleFieldChange(field.key, {
                    configJson: { options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }
                  })}
                />
              </Form.Item>
            </div>
          )}

          <div style={{ marginTop: 8 }}>
            <label>
              <input
                type="checkbox"
                checked={field.isRequired}
                onChange={(e) => handleFieldChange(field.key, { isRequired: e.target.checked })}
              />{' '}
              Required
            </label>
          </div>
        </Card>
      ))}
    </div>
  );

  const renderStep2Review = () => (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Title level={5}>Table Information</Title>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div><Text type="secondary">Name:</Text> {basicForm.getFieldValue('name')}</div>
          <div><Text type="secondary">Display Name:</Text> {basicForm.getFieldValue('displayName')}</div>
          <div style={{ gridColumn: '1 / -1' }}><Text type="secondary">Description:</Text> {basicForm.getFieldValue('description') || '-'}</div>
          <div><Text type="secondary">User Linked:</Text> {basicForm.getFieldValue('isUserLinked') ? 'Yes' : 'No'}</div>
        </div>
      </Card>

      <Card>
        <Title level={5}>Fields ({fields.length})</Title>
        {fields.length === 0 && <Text type="secondary">No fields defined</Text>}
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {fields.map((f) => (
            <li key={f.key}>
              <strong>{f.displayName || f.name}</strong> ({f.fieldType})
              {f.isRequired && <span style={{ color: token.colorError }}> *</span>}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );

  const steps = [
  { title: 'Basic Info', content: 'Name & Description' },
  { title: 'Fields', content: 'Define columns' },
  { title: 'Review', content: 'Confirm & Create' },
  ];

  return (
    <div>
      <Steps current={step} items={steps} style={{ marginBottom: 24 }} />

      <div style={{ minHeight: 300 }}>
        {step === 0 && renderStep0Basic()}
        {step === 1 && renderStep1Fields()}
        {step === 2 && renderStep2Review()}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, borderTop: `1px solid ${token.colorBorderSecondary}`, paddingTop: 16 }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Space>
          {step > 0 && (
            <Button onClick={() => setStep(step - 1)}>
              Previous
            </Button>
          )}
          {step < 2 ? (
            <Button type="primary" onClick={() => setStep(step + 1)}>
              Next
            </Button>
          ) : (
            <Button type="primary" loading={isSubmitting} onClick={handleSubmit}>
              Create Table
            </Button>
          )}
        </Space>
      </div>
    </div>
  );
}