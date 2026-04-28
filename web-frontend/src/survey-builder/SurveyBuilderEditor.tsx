import { useState, useEffect, useCallback } from 'react';
import {
  Card, Typography, Button, Space, Tag, Input, Select, Switch, Modal,
  Form, Empty, Spin, message, theme, Popconfirm, Tooltip, Drawer,
  Alert, List, InputNumber,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined,
  RobotOutlined, LinkOutlined, CopyOutlined, CheckOutlined,
  EditOutlined, SendOutlined, CloseOutlined, BarChartOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import {
  surveyApi, questionTypes, type SurveyWithQuestions, type SurveyQuestion,
  type QuestionType, type SurveySuggestion, type AddQuestionInput,
} from '../core/api/survey';
import { schemaApi, type DynamicTable } from '../core/api/schema';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const questionTypeLabels: Record<QuestionType, string> = {
  multiple_choice: 'Multiple Choice',
  text: 'Short Text',
  rating: 'Rating Scale',
  dropdown: 'Dropdown',
  checkbox: 'Checkboxes',
  date: 'Date',
  number: 'Number',
};

export default function SurveyBuilderEditor() {
  const { token } = theme.useToken();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<SurveyWithQuestions | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tables, setTables] = useState<DynamicTable[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);

  const fetchSurvey = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const result = await surveyApi.get(id);
      if (result.success && result.data) {
        const sorted = {
          ...result.data,
          questions: [...result.data.questions].sort((a, b) => a.order_index - b.order_index),
        };
        setSurvey(sorted);
        if (!selectedQuestionId && sorted.questions.length > 0) {
          setSelectedQuestionId(sorted.questions[0].id);
        }
      }
    } catch {
      message.error('Failed to load survey');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchTables = useCallback(async () => {
    try {
      const result = await schemaApi.listTables();
      if (result.success && result.data) {
        setTables(result.data);
      }
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => { fetchSurvey(); }, [fetchSurvey]);
  useEffect(() => { fetchTables(); }, [fetchTables]);

  const selectedQuestion = survey?.questions.find(q => q.id === selectedQuestionId) || null;

  const handleAddQuestion = async (type: QuestionType = 'text') => {
    if (!survey) return;
    setSaving(true);
    try {
      const input: AddQuestionInput = {
        type,
        label: `Question ${survey.questions.length + 1}`,
        isRequired: false,
        autoCreateField: !!survey.target_table_id,
      };
      if (type === 'multiple_choice' || type === 'dropdown' || type === 'checkbox') {
        input.configJson = { options: ['Option 1', 'Option 2', 'Option 3'] };
      }
      if (type === 'rating') {
        input.configJson = { min: 1, max: 5 };
      }
      const result = await surveyApi.addQuestion(survey.id, input);
      if (result.success && result.data) {
        setSelectedQuestionId(result.data.id);
        await fetchSurvey();
      }
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || 'Failed to add question');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateQuestion = async (questionId: string, updates: Partial<SurveyQuestion>) => {
    try {
      const result = await surveyApi.updateQuestion(questionId, {
        ...updates,
        configJson: updates.config_json,
        isRequired: updates.is_required,
        orderIndex: updates.order_index,
        targetFieldId: updates.target_field_id,
      } as any);
      if (result.success) {
        await fetchSurvey();
      }
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || 'Failed to update question');
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      await surveyApi.deleteQuestion(questionId);
      if (selectedQuestionId === questionId) {
        setSelectedQuestionId(survey?.questions.find(q => q.id !== questionId)?.id || null);
      }
      await fetchSurvey();
      message.success('Question deleted');
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || 'Failed to delete question');
    }
  };

  const handleReorder = async (questionId: string, direction: 'up' | 'down') => {
    if (!survey) return;
    const questions = [...survey.questions].sort((a, b) => a.order_index - b.order_index);
    const idx = questions.findIndex(q => q.id === questionId);
    if (idx < 0) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === questions.length - 1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const reordered = [...questions];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
    const updates = reordered.map((q, i) => ({ id: q.id, orderIndex: i }));

    try {
      await surveyApi.reorderQuestions(survey.id, updates);
      await fetchSurvey();
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || 'Failed to reorder');
    }
  };

  const handleUpdateSurvey = async (updates: Record<string, any>) => {
    if (!survey) return;
    try {
      const result = await surveyApi.update(survey.id, updates);
      if (result.success && result.data) {
        setSurvey(prev => prev ? { ...prev, ...result.data!, questions: prev.questions } : prev);
      }
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || 'Failed to update survey');
    }
  };

  const handleLinkTable = async (tableId: string) => {
    if (!survey) return;
    try {
      const result = await surveyApi.linkTable(survey.id, tableId);
      if (result.success && result.data) {
        setSurvey(prev => prev ? { ...prev, ...result.data!, questions: prev.questions } : prev);
        message.success('Table linked');
      }
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || 'Failed to link table');
    }
  };

  const handleAutoCreateFields = async () => {
    if (!survey) return;
    setSaving(true);
    try {
      await surveyApi.autoCreateFields(survey.id);
      await fetchSurvey();
      message.success('Fields auto-created in target table');
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || 'Failed to auto-create fields');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!survey) return;
    if (survey.questions.length === 0) {
      message.warning('Add at least one question before publishing');
      return;
    }
    setSaving(true);
    try {
      const result = await surveyApi.publish(survey.id);
      if (result.success && result.data) {
        setSurvey(prev => prev ? { ...prev, ...result.data!, questions: prev.questions } : prev);
        setPublishModalOpen(true);
        message.success('Survey published!');
      }
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || 'Failed to publish');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async () => {
    if (!survey) return;
    try {
      const result = await surveyApi.close(survey.id);
      if (result.success && result.data) {
        setSurvey(prev => prev ? { ...prev, ...result.data!, questions: prev.questions } : prev);
        message.success('Survey closed');
      }
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || 'Failed to close survey');
    }
  };

  const handleCopyLink = () => {
    if (!survey?.published_slug) return;
    const url = `${window.location.origin}/public/surveys/${survey.published_slug}`;
    navigator.clipboard.writeText(url);
    message.success('Link copied to clipboard!');
  };

  const handleApplyAISuggestion = async (suggestion: SurveySuggestion) => {
    if (!survey) return;
    setSaving(true);
    try {
      if (suggestion.title && survey.status === 'draft') {
        await surveyApi.update(survey.id, {
          title: suggestion.title,
          description: suggestion.description,
        });
      }
      for (const q of suggestion.questions) {
        const input: AddQuestionInput = {
          type: q.type,
          label: q.label,
          isRequired: q.isRequired,
          autoCreateField: !!survey.target_table_id,
        };
        if (q.options) {
          input.configJson = { options: q.options };
        }
        if (q.type === 'rating' && q.min !== undefined) {
          input.configJson = { min: q.min, max: q.max || 5 };
        }
        await surveyApi.addQuestion(survey.id, input);
      }
      await fetchSurvey();
      message.success(`Applied ${suggestion.questions.length} AI-generated questions`);
      setAiDrawerOpen(false);
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || 'Failed to apply AI suggestion');
    } finally {
      setSaving(false);
    }
  };

  const statusColor: Record<string, string> = { draft: 'default', published: 'green', closed: 'red' };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  }

  if (!survey) {
    return <Empty description="Survey not found" />;
  }

  const publicUrl = survey.published_slug
    ? `${window.location.origin}/public/surveys/${survey.published_slug}`
    : '';

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <Space align="center" size={12} style={{ marginBottom: 4 }}>
              <Button type="text" onClick={() => navigate('/admin/surveys')} style={{ padding: 0 }}>&#8592; Back</Button>
              <Tag color={statusColor[survey.status]}>{survey.status}</Tag>
              <Tag>{survey.access_type}</Tag>
            </Space>
            <Input
              value={survey.title}
              onChange={e => handleUpdateSurvey({ title: e.target.value })}
              onBlur={() => {}}
              style={{ fontSize: 22, fontWeight: 700, border: 'none', boxShadow: 'none', padding: 0, marginBottom: 4, color: token.colorText }}
              placeholder="Survey Title"
              disabled={survey.status !== 'draft'}
            />
            <TextArea
              value={survey.description || ''}
              onChange={e => handleUpdateSurvey({ description: e.target.value })}
              autoSize={{ minRows: 1, maxRows: 3 }}
              style={{ border: 'none', boxShadow: 'none', padding: 0, resize: 'none', color: token.colorTextSecondary }}
              placeholder="Add a description..."
              disabled={survey.status !== 'draft'}
            />
          </div>
          <Space>
            {survey.status === 'draft' && (
              <>
                <Button icon={<LinkOutlined />} onClick={() => {
                  if (!survey.target_table_id && tables.length > 0) {
                    Modal.confirm({
                      title: 'Link to Data Table',
                      content: (
                        <div>
                          <Text style={{ display: 'block', marginBottom: 8 }}>Responses will be stored in the linked table.</Text>
                          <Select
                            id="link-table-select"
                            style={{ width: '100%' }}
                            placeholder="Select a table"
                            value={survey.target_table_id || undefined}
                            options={tables.map(t => ({ value: t.id, label: t.display_name || t.name }))}
                            onChange={(val) => handleLinkTable(val)}
                            allowClear
                          />
                        </div>
                      ),
                      okText: 'Link',
                      onOk: () => {},
                    });
                  } else if (survey.target_table_id) {
                    Modal.info({
                      title: 'Linked Table',
                      content: (
                        <div>
                          <Text>This survey is linked to: <strong>{tables.find(t => t.id === survey.target_table_id)?.display_name || survey.target_table_id}</strong></Text>
                          <div style={{ marginTop: 12 }}>
                            <Button size="small" onClick={handleAutoCreateFields} loading={saving}>Auto-create fields</Button>
                          </div>
                        </div>
                      ),
                    });
                  }
                }}>
                  Table {survey.target_table_id ? 'Linked' : 'Link'}
                </Button>
                <Button icon={<RobotOutlined />} onClick={() => setAiDrawerOpen(true)}>AI Generate</Button>
                <Button type="primary" icon={<SendOutlined />} onClick={handlePublish} loading={saving}>Publish</Button>
              </>
            )}
            {survey.status === 'published' && (
              <>
                <Button icon={<CopyOutlined />} onClick={handleCopyLink}>Copy Link</Button>
                <Button icon={<BarChartOutlined />} onClick={() => navigate(`/admin/surveys/${survey.id}/stats`)}>Stats</Button>
                <Button danger icon={<CloseOutlined />} onClick={handleClose}>Close Survey</Button>
              </>
            )}
            {survey.status === 'closed' && (
              <Button icon={<BarChartOutlined />} onClick={() => navigate(`/admin/surveys/${survey.id}/stats`)}>Stats</Button>
            )}
          </Space>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24 }}>
        {/* Question List */}
        <div style={{ flex: 1 }}>
          <Card
            style={{ borderRadius: 12, border: `1px solid ${token.colorBorderSecondary}` }}
            styles={{ body: { padding: 0 } }}
          >
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${token.colorBorderSecondary}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong>Questions ({survey.questions.length})</Text>
              {survey.status === 'draft' && (
                <Select
                  value={undefined}
                  onChange={(type: QuestionType) => handleAddQuestion(type)}
                  style={{ width: 170 }}
                  placeholder="Add question"
                  options={questionTypes.map(t => ({ value: t, label: questionTypeLabels[t] }))}
                />
              )}
            </div>

            {survey.questions.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center' }}>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <div>
                      <Text style={{ display: 'block', marginBottom: 8 }}>No questions yet</Text>
                      <Space>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAddQuestion('text')}>Add Question</Button>
                        <Button icon={<RobotOutlined />} onClick={() => setAiDrawerOpen(true)}>Generate with AI</Button>
                      </Space>
                    </div>
                  }
                />
              </div>
            ) : (
              <div style={{ padding: 8 }}>
                {survey.questions.map((q, idx) => (
                  <div
                    key={q.id}
                    onClick={() => setSelectedQuestionId(q.id)}
                    style={{
                      padding: '12px 14px',
                      marginBottom: 4,
                      borderRadius: 8,
                      cursor: survey.status === 'draft' ? 'pointer' : 'default',
                      background: selectedQuestionId === q.id ? token.colorPrimaryBg : 'transparent',
                      border: selectedQuestionId === q.id ? `1px solid ${token.colorPrimaryBorder}` : '1px solid transparent',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                        background: selectedQuestionId === q.id ? token.colorPrimary : token.colorBgSpotlight,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: selectedQuestionId === q.id ? '#fff' : token.colorTextSecondary,
                        fontSize: 12, fontWeight: 700,
                      }}>
                        {idx + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text strong ellipsis style={{ fontSize: 14, flex: 1 }}>{q.label}</Text>
                          <Space size={4}>
                            <Tag style={{ margin: 0 }}>{questionTypeLabels[q.type]}</Tag>
                            {q.is_required && <Tag color="red" style={{ margin: 0 }}>Required</Tag>}
                          </Space>
                        </div>
                        {q.config_json && (q.config_json.options as string[])?.length > 0 && (
                          <div style={{ marginTop: 4 }}>
                            {(q.config_json.options as string[]).map((opt, oi) => (
                              <Tag key={oi} style={{ fontSize: 11, margin: '0 4px 2px 0' }}>{opt}</Tag>
                            ))}
                          </div>
                        )}
                        {q.type === 'rating' && q.config_json?.min !== undefined && (
                          <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                            Scale: {String(q.config_json.min)} - {String(q.config_json.max)}
                          </Text>
                        )}
                      </div>
                      {survey.status === 'draft' && (
                        <Space size={2} onClick={e => e.stopPropagation()}>
                          <Tooltip title="Move up">
                            <Button type="text" size="small" icon={<ArrowUpOutlined />}
                              disabled={idx === 0} onClick={() => handleReorder(q.id, 'up')} />
                          </Tooltip>
                          <Tooltip title="Move down">
                            <Button type="text" size="small" icon={<ArrowDownOutlined />}
                              disabled={idx === survey.questions.length - 1} onClick={() => handleReorder(q.id, 'down')} />
                          </Tooltip>
                          <Popconfirm title="Delete this question?" onConfirm={() => handleDeleteQuestion(q.id)} okButtonProps={{ danger: true }}>
                            <Tooltip title="Delete">
                              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                            </Tooltip>
                          </Popconfirm>
                        </Space>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Question Config Sidebar */}
        {selectedQuestion && survey.status === 'draft' && (
          <div style={{ width: 340, flexShrink: 0 }}>
            <Card
              title={<Space><EditOutlined />Question Settings</Space>}
              style={{ borderRadius: 12, border: `1px solid ${token.colorBorderSecondary}`, position: 'sticky', top: 96 }}
              styles={{ body: { padding: 16 } }}
            >
              <Form layout="vertical" size="small">
                <Form.Item label="Question Label" style={{ marginBottom: 14 }}>
                  <Input
                    value={selectedQuestion.label}
                    onChange={e => handleUpdateQuestion(selectedQuestion.id, { label: e.target.value } as any)}
                    placeholder="Enter question text"
                  />
                </Form.Item>

                <Form.Item label="Type" style={{ marginBottom: 14 }}>
                  <Select
                    value={selectedQuestion.type}
                    onChange={(type: QuestionType) => {
                      const updates: any = { type };
                      if ((type === 'multiple_choice' || type === 'dropdown' || type === 'checkbox') &&
                        !selectedQuestion.config_json?.options) {
                        updates.configJson = { options: ['Option 1', 'Option 2', 'Option 3'] };
                      }
                      if (type === 'rating' && !selectedQuestion.config_json?.min) {
                        updates.configJson = { min: 1, max: 5 };
                      }
                      handleUpdateQuestion(selectedQuestion.id, updates);
                    }}
                    options={questionTypes.map(t => ({ value: t, label: questionTypeLabels[t] }))}
                  />
                </Form.Item>

                <Form.Item label="Required" style={{ marginBottom: 14 }}>
                  <Switch
                    checked={selectedQuestion.is_required}
                    onChange={checked => handleUpdateQuestion(selectedQuestion.id, { is_required: checked } as any)}
                  />
                </Form.Item>

                {/* Options for choice types */}
                {(selectedQuestion.type === 'multiple_choice' || selectedQuestion.type === 'dropdown' || selectedQuestion.type === 'checkbox') && (
                  <Form.Item label="Options" style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {((selectedQuestion.config_json?.options as string[]) || []).map((opt, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: 4 }}>
                          <Input
                            value={opt}
                            size="small"
                            onChange={e => {
                              const options = [...(selectedQuestion.config_json?.options as string[] || [])];
                              options[idx] = e.target.value;
                              handleUpdateQuestion(selectedQuestion.id, { config_json: { ...selectedQuestion.config_json, options } } as any);
                            }}
                          />
                          <Button
                            type="text" size="small" danger icon={<DeleteOutlined />}
                            onClick={() => {
                              const options = (selectedQuestion.config_json?.options as string[] || []).filter((_, i) => i !== idx);
                              handleUpdateQuestion(selectedQuestion.id, { config_json: { ...selectedQuestion.config_json, options } } as any);
                            }}
                          />
                        </div>
                      ))}
                      <Button
                        type="dashed" size="small" icon={<PlusOutlined />} block
                        onClick={() => {
                          const options = [...(selectedQuestion.config_json?.options as string[] || []), `Option ${((selectedQuestion.config_json?.options as string[])?.length || 0) + 1}`];
                          handleUpdateQuestion(selectedQuestion.id, { config_json: { ...selectedQuestion.config_json, options } } as any);
                        }}
                      >
                        Add Option
                      </Button>
                    </div>
                  </Form.Item>
                )}

                {/* Rating scale config */}
                {selectedQuestion.type === 'rating' && (
                  <Form.Item label="Scale" style={{ marginBottom: 14 }}>
                    <Space>
                      <InputNumber
                        value={selectedQuestion.config_json?.min as number || 1}
                        min={0} max={10}
                        onChange={val => handleUpdateQuestion(selectedQuestion.id, { config_json: { ...selectedQuestion.config_json, min: val } } as any)}
                        addonBefore="Min"
                      />
                      <InputNumber
                        value={selectedQuestion.config_json?.max as number || 5}
                        min={2} max={10}
                        onChange={val => handleUpdateQuestion(selectedQuestion.id, { config_json: { ...selectedQuestion.config_json, max: val } } as any)}
                        addonBefore="Max"
                      />
                    </Space>
                  </Form.Item>
                )}

                {/* Auto-create field toggle */}
                {survey.target_table_id && (
                  <Form.Item label="Target Field" style={{ marginBottom: 14 }}>
                    <Select
                      value={selectedQuestion.target_field_id || undefined}
                      onChange={(fieldId: string) => handleUpdateQuestion(selectedQuestion.id, { target_field_id: fieldId } as any)}
                      placeholder="Map to field (optional)"
                      allowClear
                      style={{ width: '100%' }}
                      options={
                        tables
                          .find(t => t.id === survey.target_table_id)
                          ?.fields?.map(f => ({ value: f.id, label: f.display_name || f.name })) || []
                      }
                    />
                  </Form.Item>
                )}
              </Form>
            </Card>
          </div>
        )}
      </div>

      {/* AI Assistant Drawer */}
      <Drawer
        title={<Space><RobotOutlined style={{ color: token.colorPrimary }} /> AI Survey Generator</Space>}
        open={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
        width={480}
      >
        <AiPanel onApply={handleApplyAISuggestion} loading={saving} />
      </Drawer>

      {/* Publish Success Modal */}
      <Modal
        title={<Space><SendOutlined style={{ color: token.colorSuccess }} /> Survey Published!</Space>}
        open={publishModalOpen}
        onCancel={() => setPublishModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setPublishModalOpen(false)}>Close</Button>,
          <Button key="copy" type="primary" icon={<CopyOutlined />} onClick={handleCopyLink}>Copy Link</Button>,
        ]}
      >
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <CheckOutlined style={{ fontSize: 48, color: token.colorSuccess, marginBottom: 16 }} />
          <Paragraph>Your survey is now live and accepting responses.</Paragraph>
          {publicUrl && (
            <div style={{ marginTop: 12 }}>
              <Input
                value={publicUrl}
                readOnly
                addonAfter={<CopyOutlined style={{ cursor: 'pointer' }} onClick={handleCopyLink} />}
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

function AiPanel({ onApply, loading }: { onApply: (suggestion: SurveySuggestion) => void; loading: boolean }) {
  const { token } = theme.useToken();
  const [description, setDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [generating, setGenerating] = useState(false);
  const [suggestion, setSuggestion] = useState<SurveySuggestion | null>(null);

  const handleGenerate = async () => {
    if (!description.trim()) {
      message.warning('Please describe the survey you want');
      return;
    }
    setGenerating(true);
    setSuggestion(null);
    try {
      const result = await surveyApi.generateWithAI(description, targetAudience || undefined);
      if (result.success && result.data) {
        setSuggestion(result.data);
      } else {
        message.error(result.error?.message || 'Failed to generate survey');
      }
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || 'AI generation failed. Check GROQ_API_KEY configuration.');
    } finally {
      setGenerating(false);
    }
  };

  const handleApply = () => {
    if (!suggestion) return;
    onApply(suggestion);
  };

  return (
    <div>
      <Paragraph type="secondary" style={{ marginBottom: 16 }}>
        Describe the survey you want to create and AI will generate a complete survey structure with questions.
      </Paragraph>

      <Form layout="vertical">
        <Form.Item label="Survey Description" style={{ marginBottom: 12 }}>
          <TextArea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            placeholder="e.g., A survey for recent alumni about their employment status, job satisfaction, and career progression 6 months after graduation..."
          />
        </Form.Item>
        <Form.Item label="Target Audience (optional)" style={{ marginBottom: 12 }}>
          <Input
            value={targetAudience}
            onChange={e => setTargetAudience(e.target.value)}
            placeholder="e.g., Alumni who graduated in 2024-2025"
          />
        </Form.Item>
        <Button
          type="primary"
          icon={<RobotOutlined />}
          onClick={handleGenerate}
          loading={generating}
          block
          style={{ marginBottom: 20 }}
        >
          Generate Survey
        </Button>
      </Form>

      {generating && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
          <div style={{ marginTop: 12 }}><Text>AI is generating your survey...</Text></div>
        </div>
      )}

      {suggestion && (
        <div>
          <Alert
            message="Review the AI suggestion below before applying"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Card
            size="small"
            style={{ marginBottom: 12, borderRadius: 8 }}
            styles={{ body: { padding: 12 } }}
          >
            <Text strong style={{ fontSize: 15 }}>{suggestion.title}</Text>
            {suggestion.description && (
              <Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 4 }}>{suggestion.description}</Paragraph>
            )}
          </Card>

          <List
            size="small"
            dataSource={suggestion.questions}
            renderItem={(q, idx) => (
              <List.Item style={{ padding: '8px 12px' }}>
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text>
                      <span style={{ color: token.colorPrimary, fontWeight: 700, marginRight: 8 }}>{idx + 1}.</span>
                      {q.label}
                    </Text>
                    <Space size={4}>
                      <Tag>{questionTypeLabels[q.type]}</Tag>
                      {q.isRequired && <Tag color="red">Required</Tag>}
                    </Space>
                  </div>
                  {q.options && q.options.length > 0 && (
                    <div style={{ marginTop: 4, paddingLeft: 22 }}>
                      {q.options.map((opt, oi) => (
                        <Tag key={oi} style={{ margin: '0 4px 2px 0', fontSize: 11 }}>{opt}</Tag>
                      ))}
                    </div>
                  )}
                  {q.type === 'rating' && q.min !== undefined && (
                    <Text type="secondary" style={{ fontSize: 12, paddingLeft: 22 }}>Scale: {q.min} - {q.max}</Text>
                  )}
                </div>
              </List.Item>
            )}
          />

          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <Button icon={<RobotOutlined />} onClick={handleGenerate} loading={generating}>Regenerate</Button>
            <Button type="primary" icon={<CheckOutlined />} onClick={handleApply} loading={loading}>
              Apply to Builder ({suggestion.questions.length} questions)
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
