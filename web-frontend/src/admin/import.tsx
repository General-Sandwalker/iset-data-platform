import { Card, Typography, Steps, Button } from 'antd';

const { Title } = Typography;

export default function ImportPage() {
  return (
    <div>
      <Title level={3}>Data Import Wizard</Title>
      <Card>
        <Steps current={0} items={[
          { title: 'Upload' },
          { title: 'Preview' },
          { title: 'Mapping' },
          { title: 'Validation' },
          { title: 'Execute' },
        ]} />
        <div style={{ marginTop: 24 }}>Upload step coming soon</div>
      </Card>
    </div>
  );
}