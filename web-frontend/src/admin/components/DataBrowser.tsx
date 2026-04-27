import { useState, useMemo, useEffect } from 'react';
import {
  Card,
  Typography,
  Table,
  Button,
  Space,
  Input,
  Modal,
  Form,
  Select,
  message,
  Popconfirm,
  Tag,
  theme,
  Tooltip,
  Avatar,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  UserOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { TableProps } from 'antd';
import { schemaApi, type DynamicTable, type DynamicField, type DataRecord, type FieldType } from '../../core/api/schema';
import { apiClient } from '../../core/api/client';

const { Title, Text } = Typography;

interface DataBrowserProps {
  table: DynamicTable;
  onClose?: () => void;
}

const fieldTypeLabels: Record<FieldType, string> = {
  text: 'Text',
  number: 'Number',
  decimal: 'Decimal',
  date: 'Date',
  datetime: 'Date & Time',
  boolean: 'Boolean',
  select: 'Select',
  multiselect: 'Multi Select',
  email: 'Email',
  phone: 'Phone',
  file: 'File',
  user_link: 'User Link',
};

export default function DataBrowser({ table, onClose }: DataBrowserProps) {
  const { token } = theme.useToken();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<DataRecord | null>(null);
  const [form] = Form.useForm();
  const [selectedFields, setSelectedFields] = useState<DynamicField[]>([]);
  const [userInfoCache, setUserInfoCache] = useState<Record<string, { first_name: string; last_name: string; email: string }>>({});

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['schema-table-data', table.id, { page, limit, search, sortBy, sortOrder }],
    queryFn: () =>
      schemaApi.listData(table.id, {
        page,
        limit,
        search: search || undefined,
        sortBy,
        sortOrder,
      }),
  });

  const { data: fieldsData } = useQuery({
    queryKey: ['schema-table-fields', table.id],
    queryFn: () => schemaApi.getTable(table.id),
    enabled: isModalOpen || selectedFields.length === 0,
  });

  useMemo(() => {
    if (fieldsData?.data?.fields) {
      setSelectedFields(fieldsData.data.fields);
    }
  }, [fieldsData]);

  useEffect(() => {
    const fetchUserInfo = async () => {
      const records = data?.data || [];
      const cinFields = selectedFields.filter(f => f.field_type === 'user_link');

      if (cinFields.length === 0) return;

      const cinsToFetch = new Set<string>();
      for (const record of records) {
        for (const field of cinFields) {
          const cin = String(record[field.name] ?? '');
          if (cin && !userInfoCache[cin]) {
            cinsToFetch.add(cin);
          }
        }
      }

      if (cinsToFetch.size === 0) return;

      try {
        const response = await apiClient.get('/users', {
          params: {
            cin: Array.from(cinsToFetch).join(','),
            limit: 100,
          },
        });
        const users = response.data?.data || [];
        const newCache: Record<string, { first_name: string; last_name: string; email: string }> = {};
        for (const user of users) {
          if (user.cin) {
            newCache[user.cin] = {
              first_name: user.first_name,
              last_name: user.last_name,
              email: user.email,
            };
          }
        }
        setUserInfoCache(prev => ({ ...prev, ...newCache }));
      } catch {}
    };

    fetchUserInfo();
  }, [data, selectedFields]);

  const insertMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => schemaApi.insertData(table.id, data),
    onSuccess: () => {
      message.success('Record created');
      setIsModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['schema-table-data', table.id] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.error?.message || 'Failed to create record');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      schemaApi.updateData(table.id, id, data),
    onSuccess: () => {
      message.success('Record updated');
      setIsModalOpen(false);
      setSelectedRecord(null);
      setIsEditMode(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['schema-table-data', table.id] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.error?.message || 'Failed to update record');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (recordId: string) => schemaApi.deleteData(table.id, recordId),
    onSuccess: () => {
      message.success('Record deleted');
      queryClient.invalidateQueries({ queryKey: ['schema-table-data', table.id] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.error?.message || 'Failed to delete record');
    },
  });

  const handleAdd = () => {
    setSelectedRecord(null);
    setIsEditMode(false);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (record: DataRecord) => {
    setSelectedRecord(record);
    setIsEditMode(true);

    const initialValues: Record<string, unknown> = {};
    for (const field of selectedFields) {
      const value = record[field.name];
      if (field.field_type === 'boolean') {
        initialValues[field.name] = value === true || value === 'true' || value === 1;
      } else if (field.field_type === 'multiselect' && typeof value === 'string') {
        try {
          initialValues[field.name] = JSON.parse(value);
        } catch {
          initialValues[field.name] = [];
        }
      } else {
        initialValues[field.name] = value;
      }
    }
    form.setFieldsValue(initialValues);
    setIsModalOpen(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (isEditMode && selectedRecord) {
        updateMutation.mutate({ id: selectedRecord.id, data: values });
      } else {
        insertMutation.mutate(values);
      }
    } catch {}
  };

  const handleExportCSV = () => {
    const records = data?.data || [];
    if (records.length === 0) {
      message.warning('No data to export');
      return;
    }

    const headers = selectedFields.map((f) => f.display_name);
    const rows = records.map((r) =>
      selectedFields.map((f) => {
        const val = r[f.name];
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
      })
    );

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${table.name}_export_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const columns: TableProps<DataRecord>['columns'] = selectedFields.map((field) => ({
    title: field.display_name,
    dataIndex: field.name,
    key: field.name,
    sorter: field.field_type !== 'file' && field.field_type !== 'multiselect',
    render: (value: unknown) => {
      if (value === null || value === undefined) return <Text type="secondary">-</Text>;

      switch (field.field_type) {
        case 'boolean':
          return (
            <Tag color={value ? 'green' : 'red'}>
              {value ? 'Yes' : 'No'}
            </Tag>
          );
        case 'select':
          return <Tag>{String(value)}</Tag>;
        case 'multiselect':
          try {
            const arr = JSON.parse(String(value));
            if (Array.isArray(arr)) {
              return arr.map((v) => <Tag key={v} style={{ margin: 2 }}>{v}</Tag>);
            }
          } catch {}
          return String(value);
        case 'date':
        case 'datetime':
          try {
            return new Date(String(value)).toLocaleDateString('fr-FR');
          } catch {
            return String(value);
          }
        case 'email':
          return <a href={`mailto:${value}`}>{String(value)}</a>;
        case 'phone':
          return <a href={`tel:${value}`}>{String(value)}</a>;
        case 'user_link': {
          const cin = String(value);
          const userInfo = userInfoCache[cin];
          if (userInfo) {
            return (
              <Space>
                <Avatar size="small" icon={<UserOutlined />} />
                <Text>
                  {userInfo.first_name} {userInfo.last_name}
                </Text>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  ({userInfo.email})
                </Text>
              </Space>
            );
          }
          return (
            <Space>
              <UserOutlined />
              <Text>{cin}</Text>
            </Space>
          );
        }
        default:
          return String(value);
      }
    },
  }));

  const actionColumn: TableProps<DataRecord>['columns'][0] = {
    title: 'Actions',
    key: 'actions',
    width: 120,
    fixed: 'right' as const,
    render: (_: unknown, record: DataRecord) => (
      <Space size="small">
        <Button
          type="text"
          icon={<EditOutlined />}
          size="small"
          onClick={() => handleEdit(record)}
        />
        <Popconfirm
          title="Delete this record?"
          onConfirm={() => deleteMutation.mutate(record.id)}
          okText="Delete"
          okButtonProps={{ danger: true }}
        >
          <Button type="text" icon={<DeleteOutlined />} size="small" danger />
        </Popconfirm>
      </Space>
    ),
  };

  const meta = data?.meta || { total: 0, page: 1, limit: 20 };
  const records = data?.data || [];

  return (
    <div>
      <Card
        style={{ borderRadius: 16 }}
        styles={{ body: { padding: 0 } }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <Title level={4} style={{ margin: 0 }}>{table.display_name}</Title>
            <Text type="secondary">{table.description || table.name}</Text>
          </div>
          <Space>
            <Input.Search
              placeholder="Search..."
              prefix={<SearchOutlined />}
              onSearch={setSearch}
              allowClear
              style={{ width: 200 }}
            />
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
              Refresh
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExportCSV}>
              Export
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              Add Record
            </Button>
          </Space>
        </div>

        <Table
          columns={[...columns, actionColumn]}
          dataSource={records}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 'max-content' }}
          pagination={{
            current: page,
            pageSize: limit,
            total: meta.total,
            showSizeChanger: true,
            showTotal: (total) => `${total} records`,
            onChange: (p, l) => {
              setPage(p);
              setLimit(l);
            },
          }}
          onChange={(pagination, filters, sorter) => {
            if (Array.isArray(sorter) && sorter.length > 0) {
              const s = sorter[0];
              setSortBy(s.field as string);
              setSortOrder(s.order === 'ascend' ? 'asc' : 'desc');
            } else if (!Array.isArray(sorter) && sorter.field) {
              setSortBy(sorter.field as string);
              setSortOrder(sorter.order === 'ascend' ? 'asc' : 'desc');
            }
          }}
        />
      </Card>

      <Modal
        title={isEditMode ? 'Edit Record' : 'Add Record'}
        open={isModalOpen}
        onOk={handleModalOk}
        onCancel={() => {
          setIsModalOpen(false);
          setSelectedRecord(null);
          setIsEditMode(false);
          form.resetFields();
        }}
        okText={isEditMode ? 'Update' : 'Create'}
        confirmLoading={insertMutation.isPending || updateMutation.isPending}
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          {selectedFields
            .filter((f) => f.name !== 'id' && f.name !== 'created_at' && f.name !== 'updated_at' && f.name !== 'created_by' && f.name !== 'cin')
            .map((field) => (
              <Form.Item
                key={field.id}
                name={field.name}
                label={field.display_name}
                rules={[
                  {
                    required: field.is_required,
                    message: `${field.display_name} is required`,
                  },
                ]}
              >
                {field.field_type === 'select' ? (
                  <Select
                    allowClear
                    options={((field.config_json as { options?: string[] })?.options || []).map((v) => ({
                      value: v,
                      label: v,
                    }))}
                    placeholder={`Select ${field.display_name}`}
                  />
                ) : field.field_type === 'multiselect' ? (
                  <Select
                    mode="multiple"
                    allowClear
                    options={((field.config_json as { options?: string[] })?.options || []).map((v) => ({
                      value: v,
                      label: v,
                    }))}
                    placeholder={`Select ${field.display_name}`}
                  />
                ) : field.field_type === 'boolean' ? (
                  <Select
                    options={[
                      { value: true, label: 'Yes' },
                      { value: false, label: 'No' },
                    ]}
                    placeholder={`Select ${field.display_name}`}
                  />
                ) : field.field_type === 'number' || field.field_type === 'decimal' ? (
                  <Input type="number" placeholder={`Enter ${field.display_name}`} />
                ) : field.field_type === 'date' ? (
                  <Input type="date" placeholder={`Enter ${field.display_name}`} />
                ) : field.field_type === 'datetime' ? (
                  <Input type="datetime-local" placeholder={`Enter ${field.display_name}`} />
                ) : field.field_type === 'email' ? (
                  <Input type="email" placeholder={`Enter ${field.display_name}`} />
                ) : field.field_type === 'phone' ? (
                  <Input placeholder={`Enter ${field.display_name}`} />
                ) : (
                  <Input placeholder={`Enter ${field.display_name}`} />
                )}
              </Form.Item>
            ))}
        </Form>
      </Modal>
    </div>
  );
}