import { useState, useEffect, useCallback } from 'react';
import { Card, Typography, Row, Col, Tag, Button, Space, Spin, Empty, theme, message } from 'antd';
import { FileTextOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { apiClient, type ApiResponse } from '../../core/api/client';

const { Title, Text, Paragraph } = Typography;

interface PublishedSurvey {
  id: string;
  title: string;
  description: string | null;
  access_type: string;
  published_slug: string | null;
  allow_multiple_responses: boolean;
}

export default function StudentSurveysPage() {
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const [surveys, setSurveys] = useState<PublishedSurvey[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSurveys = useCallback(async () => {
    try {
      const res = await apiClient.get<ApiResponse<PublishedSurvey[]>>('/public/surveys');
      if (res.data.success && res.data.data) setSurveys(res.data.data);
    } catch { message.error('Failed to load surveys'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadSurveys(); }, [loadSurveys]);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <Title level={3} style={{ marginBottom: 4, color: token.colorText, fontWeight: 700 }}>Available Surveys</Title>
        <Text style={{ color: token.colorTextSecondary }}>Complete surveys to contribute your data</Text>
      </div>

      <Spin spinning={loading}>
        {surveys.length > 0 ? (
          <Row gutter={[20, 20]}>
            {surveys.map((survey) => (
              <Col xs={24} sm={12} lg={8} key={survey.id}>
                <Card
                  hoverable
                  style={{
                    height: '100%', borderRadius: 16,
                    border: `1px solid ${token.colorBorderSecondary}`,
                  }}
                  styles={{ body: { display: 'flex', flexDirection: 'column', height: '100%' } }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: `${token.colorPrimary}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: token.colorPrimary,
                    }}>
                      <FileTextOutlined style={{ fontSize: 18 }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <Text strong style={{ fontSize: 15, display: 'block' }}>{survey.title}</Text>
                    </div>
                  </div>
                  {survey.description && (
                    <Paragraph style={{ color: token.colorTextSecondary, flex: 1, marginBottom: 12 }} ellipsis={{ rows: 3 }}>
                      {survey.description}
                    </Paragraph>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                    <Space>
                      <Tag color={survey.access_type === 'authenticated' ? 'blue' : 'green'}>
                        {survey.access_type === 'authenticated' ? 'Auth Required' : 'Open'}
                      </Tag>
                      {survey.allow_multiple_responses && <Tag color="purple">Multiple</Tag>}
                    </Space>
                    {survey.published_slug && (
                      <Button
                        type="primary" size="small" icon={<ArrowRightOutlined />}
                        onClick={() => navigate(`/student/surveys/${survey.published_slug}`)}
                      >
                        Take Survey
                      </Button>
                    )}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <Empty description="No surveys available right now" style={{ padding: 60 }} />
        )}
      </Spin>
    </div>
  );
}
