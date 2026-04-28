import { useState, useEffect, useCallback } from 'react';
import {
  Card, Typography, Table, Button, Space, Tag, Empty, Modal, Form, Input,
  Select, Switch, Drawer, List, Spin, message, theme, Popconfirm, Tooltip,
  InputNumber, Divider, Badge,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, PublishOutlined,
  RobotOutlined, LinkOutlined, BarChartOutlined, CopyOutlined,
  CloseOutlined, ArrowUpOutlined, ArrowDownOutlined, EyeOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { surveyApi, type Survey, type SurveyStatus } from '../../core/api/survey';

const { Title, Text, Paragraph } = Typography;

export default function SurveysPage() {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchSurveys = useCallback(async () => {
    setLoading(true);
    try {
      const result = await surveyApi.list();
      if (result.success && result.data) {
        setSurveys(result.data);
      }
    } catch {
      message.error('Failed to load surveys');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSurveys(); }, [fetchSurveys]);

  const handleCreate = async (values: any) => {
    try {
      const result = await surveyApi.create(values);
      if (result.success && result.data) {
        message.success('Survey created');
        setCreateModalOpen(false);
        form.resetFields();
        navigate(`/admin/surveys/${result.data.id}`);
      }
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || 'Failed to create survey');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await surveyApi.delete(id);
      message.success('Survey deleted');
      fetchSurveys();
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || 'Failed to delete survey');
    }
  };

  const statusColor: Record<SurveyStatus, string> = {
    draft: 'default',
    published: 'green',
    closed: 'red',
  };

  return (
    <div>
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ marginBottom: 4, color: token.colorText, fontWeight: 700 }}>
            Survey Management
          </Title>
          <Text style={{ color: token.colorTextSecondary }}>
            Create, publish, and manage surveys with AI assistance.
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} style={{ borderRadius: 10 }} onClick={() => setCreateModalOpen(true)}>
          Create Survey
        </Button>
      </div>

      <Card style={{ borderRadius: 16, border: `1px solid ${token.colorBorderSecondary}` }} styles={{ body: { padding: 0 } }}>
        {surveys.length === 0 && !loading ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <Text style={{ color: token.colorTextSecondary, display: 'block', marginBottom: 8 }}>
                  No surveys created yet
                </Text>
                <Text style={{ color: token.colorTextTertiary, fontSize: 12 }}>
                  Create your first survey to start collecting data
                </Text>
              </div>
            }
            style={{ padding: '60px 0' }}
          >
            <Button type="primary" icon={<PlusOutlined />} style={{ marginTop: 16, borderRadius: 10 }} onClick={() => setCreateModalOpen(true)}>
              Create First Survey
            </Button>
          </Empty>
        ) : (
          <Table
            dataSource={surveys}
            rowKey="id"
            loading={loading}
            pagination={false}
            onRow={(record) => ({ onClick: () => navigate(`/admin/surveys/${record.id}`), style: { cursor: 'pointer' } })}
            columns={[
              { title: 'Title', dataIndex: 'title', key: 'title', render: (t: string) => <Text strong>{t}</Text> },
              { title: 'Status', dataIndex: 'status', key: 'status', width: 120, render: (s: SurveyStatus) => <Tag color={statusColor[s]}>{s}</Tag> },
              { title: 'Access', dataIndex: 'access_type', key: 'access_type', width: 120, render: (a: string) => <Tag>{a}</Tag> },
              { title: 'Created', dataIndex: 'created_at', key: 'created_at', width: 150, render: (d: string) => new Date(d).toLocaleDateString() },
              {
                title: '', key: 'actions', width: 100,
                render: (_: unknown, record: Survey) => (
                  <Space onClick={(e) => e.stopPropagation()}>
                    <Tooltip title="View Stats">
                      <Button type="text" size="small" icon={<BarChartOutlined />} onClick={() => navigate(`/admin/surveys/${record.id}/stats`)} />
                    </Tooltip>
                    <Popconfirm title="Delete this survey?" onConfirm={() => handleDelete(record.id)} okButtonProps={{ danger: true }}>
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                ),
              },
            ]}
          />
        )}
      </Card>

      <Modal
        title="Create New Survey"
        open={createModalOpen}
        onCancel={() => { setCreateModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="Create"
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="title" label="Survey Title" rules={[{ required: true, message: 'Title is required' }]}>
            <Input placeholder="e.g., Alumni Employment Survey" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Brief description of the survey purpose" />
          </Form.Item>
          <Form.Item name="accessType" label="Access Type" initialValue="public">
            <Select options={[{ value: 'public', label: 'Public (no login required)' }, { value: 'authenticated', label: 'Authenticated (login required)' }]} />
          </Form.Item>
          <Form.Item name="allowMultipleResponses" label="Allow Multiple Responses" valuePropName="checked" initialValue={false}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
