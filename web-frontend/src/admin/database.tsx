import { Card, Typography, Tabs } from 'antd';

const { Title } = Typography;

export default function DatabasePage() {
  return (
    <div>
      <Title level={3}>Visual Database Manager</Title>
      <Card>
        <Tabs items={[
          { key: 'tables', label: 'Tables', children: 'Table list coming soon' },
          { key: 'relationships', label: 'Relationships', children: 'Relationship editor coming soon' },
        ]} />
      </Card>
    </div>
  );
}