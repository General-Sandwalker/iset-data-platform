import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, Typography, Button, Input, Select, Rate, Checkbox, DatePicker, InputNumber, Space, Spin, message, theme, Result, Tag, Breadcrumb } from 'antd';
import { apiClient, type ApiResponse } from '../core/api/client';
import { useAuthStore } from '../core/stores/auth.store';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface SurveyQuestion {
  id: string;
  type: string;
  label: string;
  configJson: Record<string, unknown>;
  isRequired: boolean;
  orderIndex: number;
}

interface SurveyInfo {
  id: string;
  title: string;
  description: string | null;
  accessType: string;
  allowMultipleResponses: boolean;
  questions: SurveyQuestion[];
}

export default function PublicSurveyPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const { isAuthenticated } = useAuthStore();
  const [survey, setSurvey] = useState<SurveyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [authRequired, setAuthRequired] = useState(false);

  const loadSurvey = useCallback(async () => {
    if (!slug) return;
    try {
      const headers: Record<string, string> = {};
      const authToken = useAuthStore.getState().token;
      if (authToken) headers.Authorization = `Bearer ${authToken}`;

      const res = await apiClient.get<ApiResponse<SurveyInfo>>(`/public/surveys/${slug}`, { headers });
      if (res.data.success && res.data.data) {
        setSurvey(res.data.data);
        if (res.data.data.accessType === 'authenticated' && !isAuthenticated && !authToken) {
          setAuthRequired(true);
        }
      }
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setAuthRequired(true);
      } else {
        message.error(err?.response?.data?.error?.message || 'Failed to load survey');
      }
    } finally { setLoading(false); }
  }, [slug, isAuthenticated]);

  useEffect(() => { loadSurvey(); }, [loadSurvey]);

  const handleSubmit = async () => {
    if (!survey || !slug) return;
    const missing = survey.questions.filter(q => q.isRequired && (responses[q.id] === undefined || responses[q.id] === '' || responses[q.id] === null));
    if (missing.length > 0) {
      message.warning(`Please answer required questions: ${missing.map(q => q.label).join(', ')}`);
      return;
    }
    setSubmitting(true);
    try {
      const headers: Record<string, string> = {};
      const authToken = useAuthStore.getState().token;
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      await apiClient.post(`/public/surveys/${slug}/submit`, { responses }, { headers });
      message.success('Survey submitted successfully!');
      setSubmitted(true);
    } catch (err: any) {
      const code = err?.response?.data?.error?.code;
      if (code === 'DUPLICATE_RESPONSE') {
        message.warning('You have already responded to this survey');
      } else if (err?.response?.status === 401) {
        message.warning('Please log in to submit this survey');
        navigate('/login');
      } else {
        message.error(err?.response?.data?.error?.message || 'Failed to submit survey');
      }
    } finally { setSubmitting(false); }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;

  if (authRequired) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
        <Result
          status="403"
          title="Authentication Required"
          subTitle="This survey requires you to be logged in before you can respond."
          extra={<Button type="primary" onClick={() => navigate('/login')}>Go to Login</Button>}
        />
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
        <Result
          status="success"
          title="Survey Submitted!"
          subTitle="Thank you for your response."
          extra={
            <Space>
              <Button onClick={() => navigate('/')}>Back to Home</Button>
            </Space>
          }
        />
      </div>
    );
  }

  if (!survey) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
        <Result
          status="404"
          title="Survey Not Found"
          subTitle="This survey may not exist or is no longer available."
          extra={<Button onClick={() => navigate('/')}>Back to Home</Button>}
        />
      </div>
    );
  }

  const renderQuestion = (q: SurveyQuestion) => {
    const opts = (q.configJson?.options as string[]) || [];
    switch (q.type) {
      case 'multiple_choice':
        return <Select style={{ width: '100%' }} placeholder="Select an option" options={opts.map(o => ({ value: o, label: o }))} value={responses[q.id]} onChange={v => setResponses(prev => ({ ...prev, [q.id]: v }))} />;
      case 'dropdown':
        return <Select style={{ width: '100%' }} placeholder="Select an option" options={opts.map(o => ({ value: o, label: o }))} value={responses[q.id]} onChange={v => setResponses(prev => ({ ...prev, [q.id]: v }))} />;
      case 'text':
        return <TextArea rows={3} placeholder="Your answer..." value={responses[q.id] || ''} onChange={e => setResponses(prev => ({ ...prev, [q.id]: e.target.value }))} />;
      case 'rating':
        return <Rate count={(q.configJson?.max as number) || 5} value={responses[q.id] || 0} onChange={v => setResponses(prev => ({ ...prev, [q.id]: v }))} />;
      case 'checkbox':
        return <Checkbox.Group options={opts.map(o => ({ label: o, value: o }))} value={responses[q.id] || []} onChange={v => setResponses(prev => ({ ...prev, [q.id]: v }))} />;
      case 'date':
        return <DatePicker style={{ width: '100%' }} value={responses[q.id]} onChange={d => setResponses(prev => ({ ...prev, [q.id]: d?.toISOString() || null }))} />;
      case 'number':
        return <InputNumber style={{ width: '100%' }} min={q.configJson?.min as number} max={q.configJson?.max as number} placeholder="Enter a number" value={responses[q.id]} onChange={v => setResponses(prev => ({ ...prev, [q.id]: v }))} />;
      default:
        return <Input placeholder="Your answer..." value={responses[q.id] || ''} onChange={e => setResponses(prev => ({ ...prev, [q.id]: e.target.value }))} />;
    }
  };

  const sortedQuestions = [...survey.questions].sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
      <Breadcrumb
        style={{ marginBottom: 20 }}
        items={[
          { title: <Link to="/">Home</Link> },
          { title: 'Survey' },
          { title: survey.title },
        ]}
      />

      <div style={{ marginBottom: 28 }}>
        <Title level={3} style={{ marginBottom: 4, color: token.colorText, fontWeight: 700 }}>{survey.title}</Title>
        {survey.description && <Paragraph style={{ color: token.colorTextSecondary }}>{survey.description}</Paragraph>}
        <Space>
          {survey.accessType === 'authenticated' && <Tag color="blue">Login Required</Tag>}
          {survey.allowMultipleResponses && <Tag color="purple">Multiple Responses Allowed</Tag>}
        </Space>
      </div>

      {sortedQuestions.map((q, idx) => (
        <Card key={q.id} style={{ marginBottom: 16, borderRadius: 12, border: `1px solid ${token.colorBorderSecondary}` }} styles={{ body: { padding: 20 } }}>
          <div style={{ marginBottom: 12 }}>
            <Text strong style={{ fontSize: 15 }}>{idx + 1}. {q.label}</Text>
            {q.isRequired && <Tag color="red" style={{ marginLeft: 8 }}>Required</Tag>}
          </div>
          {renderQuestion(q)}
        </Card>
      ))}

      <div style={{ textAlign: 'center', marginTop: 24, marginBottom: 48 }}>
        <Space>
          <Button onClick={() => navigate('/')}>Cancel</Button>
          <Button type="primary" loading={submitting} onClick={handleSubmit} style={{ borderRadius: 10, paddingInline: 32 }}>
            Submit Response
          </Button>
        </Space>
      </div>
    </div>
  );
}
