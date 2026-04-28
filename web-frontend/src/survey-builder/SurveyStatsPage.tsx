import { useState, useEffect, useCallback } from 'react';
import {
  Card, Typography, Table, Tag, Space, Button, Spin, Empty, message,
  theme, Statistic, Row, Col, Progress, Divider,
} from 'antd';
import {
  ArrowLeftOutlined, BarChartOutlined, ReloadOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import {
  surveyApi, type SurveyStats, type QuestionType,
} from '../core/api/survey';

const questionTypeLabels: Record<QuestionType, string> = {
  multiple_choice: 'Multiple Choice',
  text: 'Short Text',
  rating: 'Rating Scale',
  dropdown: 'Dropdown',
  checkbox: 'Checkboxes',
  date: 'Date',
  number: 'Number',
};

const { Title, Text } = Typography;

export default function SurveyStatsPage() {
  const { token } = theme.useToken();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [stats, setStats] = useState<SurveyStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const result = await surveyApi.getStats(id);
      if (result.success && result.data) {
        setStats(result.data);
      }
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  }

  if (!stats) {
    return <Empty description="Stats not available" />;
  }

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/surveys')}>Back</Button>
          <Title level={4} style={{ margin: 0 }}>{stats.title} — Response Stats</Title>
        </Space>
        <Space>
          <Tag color={stats.status === 'published' ? 'green' : stats.status === 'closed' ? 'red' : 'default'}>
            {stats.status}
          </Tag>
          <Button icon={<ReloadOutlined />} onClick={fetchStats}>Refresh</Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card style={{ borderRadius: 12, textAlign: 'center' }}>
            <Statistic
              title="Total Responses"
              value={stats.totalResponses}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: token.colorPrimary }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card style={{ borderRadius: 12, textAlign: 'center' }}>
            <Statistic
              title="Questions"
              value={stats.questions.length}
              valueStyle={{ color: token.colorInfo }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card style={{ borderRadius: 12, textAlign: 'center' }}>
            <Statistic
              title="Completion Rate"
              value={stats.totalResponses > 0 ? 100 : 0}
              suffix="%"
              valueStyle={{ color: token.colorSuccess }}
            />
          </Card>
        </Col>
      </Row>

      {stats.questions.map((q, idx) => (
        <Card
          key={q.questionId}
          style={{ marginBottom: 16, borderRadius: 12, border: `1px solid ${token.colorBorderSecondary}` }}
          styles={{ body: { padding: 16 } }}
        >
          <div style={{ marginBottom: 12 }}>
            <Space>
              <Tag color="blue">{idx + 1}</Tag>
              <Text strong style={{ fontSize: 15 }}>{q.label}</Text>
              <Tag>{questionTypeLabels[q.type]}</Tag>
            </Space>
          </div>

          <Row gutter={16}>
            <Col span={6}>
              <Statistic title="Responses" value={q.responseCount || 0} />
            </Col>

            {(q.type === 'rating' || q.type === 'number') && (
              <>
                <Col span={6}>
                  <Statistic title="Average" value={q.average?.toFixed(2) || '—'} />
                </Col>
                <Col span={6}>
                  <Statistic title="Min" value={q.min ?? '—'} />
                </Col>
                <Col span={6}>
                  <Statistic title="Max" value={q.max ?? '—'} />
                </Col>
              </>
            )}

            {q.type === 'date' && (
              <>
                <Col span={9}>
                  <Statistic title="Earliest" value={q.earliest ? new Date(q.earliest).toLocaleDateString() : '—'} />
                </Col>
                <Col span={9}>
                  <Statistic title="Latest" value={q.latest ? new Date(q.latest).toLocaleDateString() : '—'} />
                </Col>
              </>
            )}
          </Row>

          {q.distribution && Object.keys(q.distribution).length > 0 && (
            <div style={{ marginTop: 16 }}>
              <Divider style={{ margin: '12px 0' }} />
              <Text strong style={{ display: 'block', marginBottom: 12 }}>Response Distribution</Text>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(q.distribution)
                  .sort(([, a], [, b]) => b - a)
                  .map(([option, count]) => {
                    const total = Object.values(q.distribution!).reduce((s, v) => s + v, 0);
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={option}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <Text style={{ fontSize: 13 }}>{option}</Text>
                          <Text type="secondary" style={{ fontSize: 13 }}>{count} ({pct}%)</Text>
                        </div>
                        <Progress
                          percent={pct}
                          showInfo={false}
                          strokeColor={token.colorPrimary}
                          size="small"
                        />
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </Card>
      ))}

      {stats.questions.length === 0 && (
        <Empty description="No questions in this survey yet" />
      )}
    </div>
  );
}
