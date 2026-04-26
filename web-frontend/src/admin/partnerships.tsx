import { Card, Typography, Table } from 'antd';

const { Title } = Typography;

export default function PartnershipsPage() {
  return (
    <div>
      <Title level={3}>Partnerships</Title>
      <Card>
        <Table columns={[]} dataSource={[]} pagination={{ pageSize: 20 }} />
      </Card>
    </div>
  );
}