import { useState } from 'react';
import {
  Card,
  Typography,
  Table,
  Button,
  Space,
  Input,
  Select,
  Modal,
  Form,
  message,
  Popconfirm,
  Tag,
  Switch,
  Alert,
  theme,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  DeleteOutlined,
  EditOutlined,
  KeyOutlined,
  UploadOutlined,
  UserAddOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../core/api/client';
import {
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useResetUserPassword,
  type User,
  type CreateUserInput,
} from '../core/api/users';
import UserImportWizard from './user-import-wizard';

const { Title, Text } = Typography;

const roleOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'responsable_observatoire', label: 'Responsable Observatoire' },
  { value: 'enseignant', label: 'Enseignant' },
  { value: 'etudiant', label: 'Etudiant' },
  { value: 'alumni', label: 'Alumni' },
];

const roleColors: Record<string, string> = {
  super_admin: 'red',
  admin: 'volcano',
  responsable_observatoire: 'orange',
  enseignant: 'blue',
  etudiant: 'green',
  alumni: 'cyan',
};

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  responsable_observatoire: 'Resp. Observatoire',
  enseignant: 'Enseignant',
  etudiant: 'Etudiant',
  alumni: 'Alumni',
};

export default function UserManagementPage() {
  const { token: themeToken } = theme.useToken();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [role, setRole] = useState<string>('');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [createdTempPassword, setCreatedTempPassword] = useState<string | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['users', { page, limit, role, search }],
    queryFn: async () => {
      const response = await apiClient.get('/users', {
        params: {
          page,
          limit,
          role: role || undefined,
          search: search || undefined,
        },
      });
      return response.data;
    },
  });

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const resetPassword = useResetUserPassword();

  const handleAdd = () => {
    setSelectedUser(null);
    setIsEditMode(false);
    setCreatedTempPassword(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setIsEditMode(true);
    setCreatedTempPassword(null);
    form.setFieldsValue({
      cin: user.cin,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      phone: user.phone,
      isActive: user.is_active,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteUser.mutateAsync(id);
      message.success('User deleted');
    } catch {
      message.error('Failed to delete user');
    }
  };

  const handleResetPassword = async (id: string) => {
    try {
      const tempPassword = await resetPassword.mutateAsync(id);
      Modal.info({
        title: 'Password Reset',
        content: (
          <div>
            <p>A temporary password has been set for this user:</p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 8,
              }}
            >
              <code
                style={{
                  fontSize: 18,
                  background: themeToken.colorBgContainer,
                  border: `1px solid ${themeToken.colorBorder}`,
                  padding: '4px 12px',
                  borderRadius: 6,
                  fontFamily: 'monospace',
                }}
              >
                {tempPassword}
              </code>
              <Button
                size="small"
                icon={<CopyOutlined />}
                onClick={() => {
                  navigator.clipboard.writeText(tempPassword);
                  message.success('Copied to clipboard');
                }}
              >
                Copy
              </Button>
            </div>
          </div>
        ),
      });
    } catch {
      message.error('Failed to reset password');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (isEditMode && selectedUser) {
        await updateUser.mutateAsync({ id: selectedUser.id, ...values });
        message.success('User updated');
        setIsModalOpen(false);
      } else {
        const result = await createUser.mutateAsync(values as CreateUserInput);
        const tempPwd =
          result?.data?.tempPassword ||
          result?.data?.temp_password ||
          null;
        if (tempPwd) {
          setCreatedTempPassword(tempPwd);
        } else {
          message.success('User created');
          setIsModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['users'] });
        }
      }
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.error?.message ||
        (isEditMode ? 'Failed to update user' : 'Failed to create user');
      message.error(errorMsg);
    }
  };

  const handleCopyTempPassword = () => {
    if (createdTempPassword) {
      navigator.clipboard.writeText(createdTempPassword);
      message.success('Copied to clipboard');
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setCreatedTempPassword(null);
    if (createdTempPassword) {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  };

  const columns = [
    {
      title: 'Name',
      render: (_: any, record: User) =>
        `${record.first_name} ${record.last_name}`,
      sorter: (a: User, b: User) =>
        a.first_name.localeCompare(b.first_name),
    },
    {
      title: 'CIN',
      dataIndex: 'cin',
      render: (v: string) => v || '-',
    },
    { title: 'Email', dataIndex: 'email' },
    {
      title: 'Role',
      dataIndex: 'role',
      render: (role: string) => (
        <Tag color={roleColors[role] || 'default'}>
          {roleLabels[role] || role}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      render: (active: boolean) =>
        active ? (
          <Tag color="green">Active</Tag>
        ) : (
          <Tag color="red">Inactive</Tag>
        ),
    },
    {
      title: 'Actions',
      width: 160,
      render: (_: any, record: User) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEdit(record)}
          />
          <Button
            type="text"
            icon={<KeyOutlined />}
            size="small"
            onClick={() => handleResetPassword(record.id)}
            loading={resetPassword.isPending && resetPassword.variables === record.id}
          />
          {record.role !== 'super_admin' && (
            <Popconfirm
              title="Delete this user?"
              description="This action cannot be undone."
              onConfirm={() => handleDelete(record.id)}
            >
              <Button
                type="text"
                icon={<DeleteOutlined />}
                size="small"
                danger
              />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const users = data?.data || [];
  const { total = 0 } = data?.meta || {};

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>
          User Management
        </Title>
        <Space>
          <Button
            icon={<UploadOutlined />}
            onClick={() => setIsImportOpen(true)}
          >
            Import
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            Add User
          </Button>
        </Space>
      </div>

      <Card>
        <Space
          style={{ marginBottom: 16, width: '100%' }}
          wrap
        >
          <Input.Search
            placeholder="Search by CIN or name"
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
            onSearch={setSearch}
            allowClear
          />
          <Select
            placeholder="Filter by role"
            allowClear
            style={{ width: 220 }}
            onChange={setRole}
            options={roleOptions}
            value={role || undefined}
          />
        </Space>
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize: limit,
            total,
            showSizeChanger: true,
            showTotal: (total) => `${total} users`,
            onChange: (p, l) => {
              setPage(p);
              setLimit(l);
            },
          }}
        />
      </Card>

      <Modal
        title={
          <Space>
            <UserAddOutlined />
            {isEditMode ? 'Edit User' : 'Add User'}
          </Space>
        }
        open={isModalOpen}
        onOk={createdTempPassword ? undefined : handleModalOk}
        onCancel={handleModalClose}
        okText={isEditMode ? 'Update' : 'Create'}
        confirmLoading={createUser.isPending || updateUser.isPending}
        footer={
          createdTempPassword
            ? [
                <Button key="close" type="primary" onClick={handleModalClose}>
                  Done
                </Button>,
              ]
            : undefined
        }
        width={520}
      >
        {createdTempPassword ? (
          <div style={{ padding: '16px 0' }}>
            <Alert
              type="success"
              message="User created successfully"
              description="Make sure to share the temporary password with the user. They will be prompted to change it on first login."
              style={{ marginBottom: 16 }}
            />
            <div
              style={{
                padding: 16,
                background: themeToken.colorBgContainer,
                border: `1px solid ${themeToken.colorBorder}`,
                borderRadius: themeToken.borderRadius,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Temporary Password
                </Text>
                <div
                  style={{
                    fontSize: 20,
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    letterSpacing: 1,
                  }}
                >
                  {createdTempPassword}
                </div>
              </div>
              <Button
                icon={<CopyOutlined />}
                onClick={handleCopyTempPassword}
              >
                Copy
              </Button>
            </div>
          </div>
        ) : (
          <Form
            form={form}
            layout="vertical"
            style={{ marginTop: 16 }}
            initialValues={{ isActive: true }}
          >
            <Form.Item
              name="cin"
              label="CIN"
              rules={[
                {
                  len: 8,
                  message: 'CIN must be 8 characters',
                },
              ]}
            >
              <Input placeholder="CIN (8 characters)" maxLength={8} />
            </Form.Item>
            <Form.Item
              name="email"
              label="Email"
              rules={[{ required: true, type: 'email' }]}
            >
              <Input type="email" placeholder="Email address" />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="firstName"
                  label="First Name"
                  rules={[{ required: true, message: 'Required' }]}
                >
                  <Input placeholder="First Name" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="lastName"
                  label="Last Name"
                  rules={[{ required: true, message: 'Required' }]}
                >
                  <Input placeholder="Last Name" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              name="role"
              label="Role"
              rules={[{ required: true, message: 'Please select a role' }]}
            >
              <Select placeholder="Select role" options={roleOptions} />
            </Form.Item>
            <Form.Item name="phone" label="Phone">
              <Input placeholder="Phone number" />
            </Form.Item>
            {isEditMode && (
              <Form.Item
                name="isActive"
                label="Active"
                valuePropName="checked"
              >
                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
              </Form.Item>
            )}
          </Form>
        )}
      </Modal>

      <Modal
        title="Import Users from CSV/Excel"
        open={isImportOpen}
        onCancel={() => setIsImportOpen(false)}
        footer={null}
        width={700}
      >
        <UserImportWizard
          onComplete={() => {
            setIsImportOpen(false);
            queryClient.invalidateQueries({ queryKey: ['users'] });
          }}
        />
      </Modal>
    </div>
  );
}
