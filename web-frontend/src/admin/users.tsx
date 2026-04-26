import { Card, Typography, Table, Button, Input, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

const { Title } = Typography;

export default function UserManagementPage() {
  return (
    <div>
      <Title level={3}>User Management</Title>
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Input.Search placeholder="Search by CIN or name" style={{ width: 300 }} />
          <Button type="primary" icon={<PlusOutlined />}>Add User</Button>
        </Space>
        <Table columns={[]} dataSource={[]} pagination={{ pageSize: 20 }} />
      </Card>
    </div>
  );
}