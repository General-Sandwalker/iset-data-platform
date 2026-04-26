import { Card, Typography } from 'antd';

const { Title } = Typography;

export default function PublicSurveyPage() {
  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>Survey</Title>
      <Card>Survey form will appear here</Card>
    </div>
  );
}