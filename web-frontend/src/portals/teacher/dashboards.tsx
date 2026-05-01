import { useState, useEffect, useCallback } from 'react';
import { Card, Typography, Row, Col, Spin, Empty, Button, theme, message } from 'antd';
import { BarChartOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { apiClient, type ApiResponse } from '../../core/api/client';

const { Title, Text, Paragraph } = Typography;

interface PublicDashboard {
  id: string;
  title: string;
  description: string | null;
  slug: string;
}

export default function TeacherDashboardsPage() {
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const [dashboards, setDashboards] = useState<PublicDashboard[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboards = useCallback(async () => {
    try {
      const res = await apiClient.get<ApiResponse<PublicDashboard[]>>('/public/dashboards');
      if (res.data.success && res.data.data) setDashboards(res.data.data);
    } catch { message.error('Failed to load dashboards'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadDashboards(); }, [loadDashboards]);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <Title level={3} style={{ marginBottom: 4, color: token.colorText, fontWeight: 700 }}>Academic Dashboards</Title>
        <Text style={{ color: token.colorTextSecondary }}>View academic analytics and data visualizations</Text>
      </div>

      <Spin spinning={loading}>
        {dashboards.length > 0 ? (
          <Row gutter={[20, 20]}>
            {dashboards.map((dashboard) => (
              <Col xs={24} sm={12} lg={8} key={dashboard.id}>
                <Card
                  hoverable
                  style={{ height: '100%', borderRadius: 16, border: `1px solid ${token.colorBorderSecondary}` }}
                  styles={{ body: { display: 'flex', flexDirection: 'column', height: '100%' } }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: `${token.colorPrimary}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: token.colorPrimary,
                    }}>
                      <BarChartOutlined style={{ fontSize: 18 }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <Text strong style={{ fontSize: 15, display: 'block' }}>{dashboard.title}</Text>
                    </div>
                  </div>
                  {dashboard.description && (
                    <Paragraph style={{ color: token.colorTextSecondary, flex: 1, marginBottom: 12 }} ellipsis={{ rows: 3 }}>
                      {dashboard.description}
                    </Paragraph>
                  )}
                  <div style={{ marginTop: 'auto' }}>
                    <Button type="primary" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/public/dashboards/${dashboard.slug}`)}>
                      View Dashboard
                    </Button>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <Empty description="No academic dashboards available" style={{ padding: 60 }} />
        )}
      </Spin>
    </div>
  );
}
