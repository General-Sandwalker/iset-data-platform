import { Card, Typography, Table, Button, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

const { Title } = Typography;

export default function SurveysPage() {
  return (
    <div>
      <Title level={3}>Survey Management</Title>
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />}>Create Survey</Button>
        </Space>
        <Table columns={[]} dataSource={[]} pagination={{ pageSize: 20 }} />
      </Card>
    </div>
  );
}