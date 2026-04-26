import { Card, Typography, Table, Button, Space, Input, Select, Modal, Form, message, Popconfirm, Tag } from 'antd';
import { PlusOutlined, SearchOutlined, DeleteOutlined, EditOutlined, KeyOutlined, UploadOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../core/api/client';
import { useCreateUser, useUpdateUser, useDeleteUser, useResetUserPassword, type User, type CreateUserInput } from '../../core/api/users';
import UserImportWizard from './user-import-wizard';

const { Title } = Typography;
const { confirm } = Modal;

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

export default function UserManagementPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [role, setRole] = useState<string>('');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['users', { page, limit, role, search }],
    queryFn: async () => {
      const response = await apiClient.get('/users', {
        params: { page, limit, role: role || undefined, search: search || undefined },
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
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setIsEditMode(true);
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
            <code style={{ fontSize: 18, background: '#f5f5f5', padding: '4px 8px', borderRadius: 4 }}>{tempPassword}</code>
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
      } else {
        await createUser.mutateAsync(values as CreateUserInput);
        message.success('User created');
      }
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch {
      message.error(isEditMode ? 'Failed to update user' : 'Failed to create user');
    }
  };

  const columns = [
    {
      title: 'Name',
      render: (_: any, record: User) => `${record.first_name} ${record.last_name}`,
      sorter: (a: User, b: User) => a.first_name.localeCompare(b.first_name),
    },
    { title: 'CIN', dataIndex: 'cin', render: (v: string) => v || '-' },
    { title: 'Email', dataIndex: 'email' },
    {
      title: 'Role',
      dataIndex: 'role',
      render: (role: string) => <Tag color={roleColors[role] || 'default'}>{role}</Tag>,
    },
    {
      title: 'Active',
      dataIndex: 'is_active',
      render: (active: boolean) => (active ? <Tag color="green">Active</Tag> : <Tag color="red">Inactive</Tag>),
    },
    {
      title: 'Actions',
      width: 150,
      render: (_: any, record: User) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)} />
          <Button icon={<KeyOutlined />} size="small" onClick={() => handleResetPassword(record.id)} />
          <Popconfirm title="Delete this user?" onConfirm={() => handleDelete(record.id)}>
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const users = data?.data || [];
  const { total = 0 } = data?.meta || {};

  return (
    <div>
      <Title level={3}>User Management</Title>
      <Card>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Input.Search placeholder="Search by CIN or name" prefix={<SearchOutlined />} style={{ width: 300 }} onSearch={setSearch} />
            <Select placeholder="Filter by role" allowClear style={{ width: 200 }} onChange={setRole} options={roleOptions} />
          </Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Add User
          </Button>
          <Button icon={<UploadOutlined />} onClick={() => setIsImportOpen(true)}>
            Import Users
          </Button>
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
            onChange: (p, l) => { setPage(p); setLimit(l); },
          }}
        />
      </Card>
      <Modal
        title={isEditMode ? 'Edit User' : 'Add User'}
        open={isModalOpen}
        onOk={handleModalOk}
        onCancel={() => setIsModalOpen(false)}
        okText={isEditMode ? 'Update' : 'Create'}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="cin" label="CIN" rules={[{ len: 8, message: 'CIN must be 8 characters' }]}>
            <Input placeholder="CIN (8 characters)" maxLength={8} />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input type="email" placeholder="Email" />
          </Form.Item>
          <Space style={{ width: '100%' }}> 
            <Form.Item name="firstName" label="First Name" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input placeholder="First Name" />
            </Form.Item>
            <Form.Item name="lastName" label="Last Name" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input placeholder="Last Name" />
            </Form.Item>
          </Space>
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select placeholder="Select role" options={roleOptions} />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input placeholder="Phone number" />
          </Form.Item>
          {isEditMode && (
            <Form.Item name="isActive" label="Active" valuePropName="checked">
              <Button type="link" />
            </Form.Item>
          )}
        </Form>
      </Modal>
      <Modal
        title="Import Users from CSV/Excel"
        open={isImportOpen}
        onCancel={() => setIsImportOpen(false)}
        footer={null}
        width={700}
      >
        <UserImportWizard onComplete={() => { setIsImportOpen(false); queryClient.invalidateQueries({ queryKey: ['users'] }); }} />
      </Modal>
    </div>
  );
}