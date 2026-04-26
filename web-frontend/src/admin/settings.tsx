import { Card, Typography, Tabs } from 'antd';

const { Title } = Typography;

export default function SettingsPage() {
  return (
    <div>
      <Title level={3}>System Settings</Title>
      <Card>
        <Tabs items={[
          { key: 'academic-years', label: 'Academic Years', children: 'Academic year management coming soon' },
          { key: 'backup', label: 'Backup', children: 'Backup management coming soon' },
          { key: 'activity', label: 'Activity Logs', children: 'Activity logs coming soon' },
          { key: 'theme', label: 'Theme', children: 'Theme customization coming soon' },
        ]} />
      </Card>
    </div>
  );
}