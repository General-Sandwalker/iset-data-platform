import { useState, useCallback, useEffect } from 'react';
import {
  Card, Typography, theme, Row, Col, Table, Button, Space, Modal, Form,
  Input, Select, Tag, message, Spin, Empty, Popconfirm, Tooltip, Progress,
} from 'antd';
import {
  PlusOutlined, FileTextOutlined, RobotOutlined, EyeOutlined,
  DeleteOutlined, EditOutlined, ReloadOutlined, SearchOutlined,
  ThunderboltOutlined, CopyOutlined, TeamOutlined, DownloadOutlined,
} from '@ant-design/icons';
import { reportsApi, type ReportTemplate, type GeneratedReport, type ReportSection } from '../core/api/reports';
import { schemaApi, type DynamicTable } from '../core/api/schema';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function ReportsPage() {
  const { token } = theme.useToken();

  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [tables, setTables] = useState<DynamicTable[]>([]);
  const [loading, setLoading] = useState(true);

  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);
  const [templateForm] = Form.useForm();

  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [generateForm] = Form.useForm();
  const [generating, setGenerating] = useState(false);

  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchForm] = Form.useForm();
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ total: number; succeeded: number; failed: number; results: { cin: string; status: string; error?: string }[] } | null>(null);

  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);

  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewReport, setPreviewReport] = useState<GeneratedReport | null>(null);
  const [editingSections, setEditingSections] = useState<ReportSection[]>([]);

  const [activeTab, setActiveTab] = useState<'templates' | 'history'>('templates');

  const cardStyle = { borderRadius: 16, border: `1px solid ${token.colorBorderSecondary}` };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tmplRes, reportsRes, tablesRes] = await Promise.allSettled([
        reportsApi.listTemplates(),
        reportsApi.listReports({ limit: 100 }),
        schemaApi.listTables(),
      ]);
      if (tmplRes.status === 'fulfilled' && tmplRes.value.success) setTemplates(tmplRes.value.data || []);
      if (reportsRes.status === 'fulfilled' && reportsRes.value.success) {
        const rd = (reportsRes.value as any).data;
        setReports(Array.isArray(rd) ? rd : rd?.data || []);
      }
      if (tablesRes.status === 'fulfilled' && tablesRes.value.success) setTables(tablesRes.value.data || []);
    } catch {
      message.error('Failed to load reports data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    templateForm.resetFields();
    setTemplateModalOpen(true);
  };

  const handleEditTemplate = (template: ReportTemplate) => {
    setEditingTemplate(template);
    templateForm.setFieldsValue({
      name: template.name,
      description: template.description || '',
      promptTemplate: template.prompt_template,
      targetTableId: template.target_table_id || undefined,
    });
    setTemplateModalOpen(true);
  };

  const handleSaveTemplate = async () => {
    try {
      const values = await templateForm.validateFields();
      if (editingTemplate) {
        const res = await reportsApi.updateTemplate(editingTemplate.id, {
          name: values.name,
          description: values.description || undefined,
          promptTemplate: values.promptTemplate,
          targetTableId: values.targetTableId || null,
        });
        if (res.success) { message.success('Template updated'); setTemplateModalOpen(false); loadData(); }
      } else {
        const res = await reportsApi.createTemplate({
          name: values.name,
          description: values.description || undefined,
          promptTemplate: values.promptTemplate,
          targetTableId: values.targetTableId || undefined,
        });
        if (res.success) { message.success('Template created'); setTemplateModalOpen(false); loadData(); }
      }
    } catch (err: any) {
      if (err?.response?.data?.error?.message) message.error(err.response.data.error.message);
      else if (!err?.errorFields) message.error('Failed to save template');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      const res = await reportsApi.deleteTemplate(id);
      if (res.success) { message.success('Template deleted'); loadData(); }
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || 'Failed to delete template');
    }
  };

  const handleOpenGenerate = (templateId?: string) => {
    generateForm.resetFields();
    if (templateId) generateForm.setFieldsValue({ templateId });
    setGenerateModalOpen(true);
  };

  const handleGenerate = async () => {
    try {
      const values = await generateForm.validateFields();
      setGenerating(true);
      const filterEntries: Array<[string, string]> = (values.filters || [])
        .filter((f: any) => f?.key && f?.value)
        .map((f: any) => [f.key, f.value]);
      const res = await reportsApi.generateReport({
        templateId: values.templateId,
        cin: values.cin,
        filters: filterEntries.length > 0 ? Object.fromEntries(filterEntries) : undefined,
      });
      if (res.success && res.data) {
        message.success('Report generated successfully');
        setGenerateModalOpen(false);
        setPreviewReport(res.data);
        setEditingSections(res.data.content?.sections || []);
        setPreviewModalOpen(true);
        loadData();
      }
    } catch (err: any) {
      if (err?.response?.data?.error?.message) message.error(err.response.data.error.message);
      else if (!err?.errorFields) message.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const handlePreviewReport = async (report: GeneratedReport) => {
    let r = report;
    if (!r.content && r.id) {
      try {
        const res = await reportsApi.getReport(r.id);
        if (res.success && res.data) r = res.data;
      } catch { /* use cached */ }
    }
    setPreviewReport(r);
    setEditingSections(r.content?.sections || []);
    setPreviewModalOpen(true);
  };

  const handleExportPDF = () => {
    if (!previewReport) return;
    const sectionsHtml = editingSections
      .map((s) => `<h2>${s.title}</h2><p>${s.content.replace(/\n/g, '<br>')}</p><hr/>`)
      .join('');
    const html = [
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Report</title>',
      '<style>',
      'body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#333}',
      'h1{color:#1a1a1a;border-bottom:2px solid #1677ff;padding-bottom:10px}',
      'h2{color:#1677ff;margin-top:30px}p{line-height:1.7}',
      '.meta{color:#888;font-size:12px;margin-bottom:30px}',
      'hr{border:none;border-top:1px solid #eee;margin:30px 0}',
      '</style></head><body>',
      `<h1>Report</h1>`,
      `<p class="meta">CIN: ${previewReport.user_cin || 'N/A'} | Generated: ${new Date(previewReport.created_at).toLocaleString()} | Status: ${previewReport.status}</p>`,
      sectionsHtml,
      '</body></html>',
    ].join('');
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) { win.onload = () => { win.print(); }; }
  };

  const handleExportExcel = () => {
    if (!previewReport) return;
    const header = 'Section Title\tContent\n';
    const rows = editingSections
      .map((s) => `"${s.title}"\t"${s.content.replace(/"/g, '""')}"`)
      .join('\n');
    const csv = header + rows;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${previewReport.user_cin || 'export'}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('Exported as CSV');
  };

  const handleOpenBatch = () => {
    batchForm.resetFields();
    setBatchProgress(null);
    setBatchModalOpen(true);
  };

  const handleBatchGenerate = async () => {
    try {
      const values = await batchForm.validateFields();
      const cins: string[] = values.cins
        .split(/[\n,;]+/)
        .map((c: string) => c.trim())
        .filter((c: string) => c.length > 0);
      if (cins.length === 0) { message.warning('Enter at least one CIN'); return; }
      if (cins.length > 50) { message.warning('Maximum 50 CINs per batch'); return; }
      setBatchRunning(true);
      setBatchProgress({ total: cins.length, succeeded: 0, failed: 0, results: [] });
      const res = await reportsApi.batchGenerateReports({
        templateId: values.templateId,
        cins,
      });
      if (res.success && res.data) {
        setBatchProgress(res.data);
        if (res.data.succeeded > 0) message.success(`${res.data.succeeded} reports generated`);
        if (res.data.failed > 0) message.warning(`${res.data.failed} reports failed`);
        loadData();
      }
    } catch (err: any) {
      if (err?.response?.data?.error?.message) message.error(err.response.data.error.message);
      else if (!err?.errorFields) message.error('Batch generation failed');
    } finally {
      setBatchRunning(false);
    }
  };

  const handleBatchZip = async () => {
    if (selectedReportIds.length === 0) { message.warning('Select reports to export'); return; }
    try {
      const res = await reportsApi.batchExportZip(selectedReportIds);
      if (res.success && res.data) {
        const a = document.createElement('a');
        a.href = res.data.downloadUrl;
        a.download = res.data.fileName;
        a.click();
        message.success('ZIP download started');
      }
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || 'ZIP export failed');
    }
  };

  const extractPlaceholders = (template: string): string[] => {
    const matches = template.match(/\{\{(\w+)\}\}/g);
    if (!matches) return [];
    return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, '')))];
  };

  const templateColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: ReportTemplate) => (
        <Space>
          <FileTextOutlined style={{ color: token.colorPrimary }} />
          <div>
            <Text strong>{name}</Text>
            {record.description && (
              <Text style={{ display: 'block', fontSize: 12, color: token.colorTextTertiary }}>
                {record.description.length > 60 ? record.description.slice(0, 60) + '...' : record.description}
              </Text>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'Prompt Preview',
      dataIndex: 'prompt_template',
      key: 'prompt_template',
      width: 300,
      render: (pt: string) => (
        <Text style={{ fontSize: 12, color: token.colorTextSecondary }} ellipsis>
          {pt.length > 100 ? pt.slice(0, 100) + '...' : pt}
        </Text>
      ),
    },
    {
      title: 'Placeholders',
      key: 'placeholders',
      width: 180,
      render: (_: unknown, record: ReportTemplate) => {
        const phs = extractPlaceholders(record.prompt_template);
        return phs.length > 0 ? (
          <Space size={[4, 4]} wrap>
            {phs.map((p) => <Tag key={p} color="blue">{`{{${p}}}`}</Tag>)}
          </Space>
        ) : <Text type="secondary">None</Text>;
      },
    },
    {
      title: 'Target Table',
      dataIndex: 'target_table_id',
      key: 'target_table_id',
      width: 140,
      render: (tableId: string | null) => {
        if (!tableId) return <Tag>Any</Tag>;
        const t = tables.find((tbl) => tbl.id === tableId);
        return <Tag color="geekblue">{t?.display_name || t?.name || tableId.slice(0, 8)}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_: unknown, record: ReportTemplate) => (
        <Space>
          <Tooltip title="Generate Report">
            <Button type="primary" size="small" icon={<ThunderboltOutlined />} onClick={() => handleOpenGenerate(record.id)} />
          </Tooltip>
          <Tooltip title="Edit Template">
            <Button size="small" icon={<EditOutlined />} onClick={() => handleEditTemplate(record)} />
          </Tooltip>
          <Popconfirm title="Delete this template?" onConfirm={() => handleDeleteTemplate(record.id)} okText="Delete" cancelText="Cancel">
            <Tooltip title="Delete Template">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const reportColumns = [
    {
      title: 'CIN',
      dataIndex: 'user_cin',
      key: 'user_cin',
      render: (cin: string | null) => cin || <Text type="secondary">N/A</Text>,
    },
    {
      title: 'Template',
      dataIndex: 'template_id',
      key: 'template_id',
      render: (tid: string) => {
        const tmpl = templates.find((t) => t.id === tid);
        return tmpl?.name || tid.slice(0, 8);
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = status === 'generated' ? 'green' : status === 'exported' ? 'blue' : 'red';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: 'Sections',
      key: 'sections',
      render: (_: unknown, record: GeneratedReport) => record.content?.sections?.length || 0,
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: GeneratedReport) => (
        <Tooltip title="Preview Report">
          <Button type="primary" size="small" icon={<EyeOutlined />} onClick={() => handlePreviewReport(record)} />
        </Tooltip>
      ),
    },
  ];

  const currentPrompt = Form.useWatch('promptTemplate', templateForm) || '';

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <Title level={3} style={{ marginBottom: 4, color: token.colorText, fontWeight: 700 }}>
          Report Center
        </Title>
        <Text style={{ color: token.colorTextSecondary }}>
          Generate AI-powered reports from your data.
        </Text>
      </div>

      <Card style={{ ...cardStyle, marginBottom: 20 }}>
        <Row gutter={[16, 12]} align="middle" justify="space-between">
          <Col>
            <Space>
              <Button
                type={activeTab === 'templates' ? 'primary' : 'default'}
                icon={<FileTextOutlined />}
                onClick={() => setActiveTab('templates')}
              >
                Templates
              </Button>
              <Button
                type={activeTab === 'history' ? 'primary' : 'default'}
                icon={<SearchOutlined />}
                onClick={() => setActiveTab('history')}
              >
                Report History
              </Button>
            </Space>
          </Col>
          <Col>
            <Space>
              {activeTab === 'templates' && (
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateTemplate} style={{ borderRadius: 10 }}>
                  New Template
                </Button>
              )}
        {activeTab === 'history' && (
          <Button icon={<RobotOutlined />} onClick={() => handleOpenGenerate()} style={{ borderRadius: 10 }}>
            Generate Report
          </Button>
        )}
        {activeTab === 'history' && (
          <Button icon={<TeamOutlined />} onClick={handleOpenBatch} style={{ borderRadius: 10 }}>
            Batch Generate
          </Button>
        )}
        {activeTab === 'history' && selectedReportIds.length > 0 && (
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleBatchZip} style={{ borderRadius: 10 }}>
            Download ZIP ({selectedReportIds.length})
          </Button>
        )}
              <Button icon={<ReloadOutlined />} onClick={loadData} />
            </Space>
          </Col>
        </Row>
      </Card>

      <Spin spinning={loading}>
        {activeTab === 'templates' && (
          <Card style={cardStyle}>
            {templates.length > 0 ? (
              <Table dataSource={templates} columns={templateColumns} rowKey="id" pagination={{ pageSize: 10 }} />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div>
                    <Text style={{ color: token.colorTextSecondary, display: 'block', marginBottom: 8 }}>
                      No report templates created
                    </Text>
                    <Text style={{ color: token.colorTextTertiary, fontSize: 12 }}>
                      Create report templates and generate AI-powered summaries
                    </Text>
                  </div>
                }
                style={{ padding: '60px 0' }}
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateTemplate} style={{ borderRadius: 10 }}>
                  Create First Template
                </Button>
              </Empty>
            )}
          </Card>
        )}

        {activeTab === 'history' && (
      <Card style={cardStyle}>
        {reports.length > 0 ? (
          <Table
            dataSource={reports}
            columns={reportColumns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            rowSelection={{
              selectedRowKeys: selectedReportIds,
              onChange: (keys) => setSelectedReportIds(keys as string[]),
            }}
          />

            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No generated reports yet"
                style={{ padding: '60px 0' }}
              >
                <Button type="primary" icon={<RobotOutlined />} onClick={() => handleOpenGenerate()} style={{ borderRadius: 10 }}>
                  Generate Your First Report
                </Button>
              </Empty>
            )}
          </Card>
        )}
      </Spin>

      <Modal
        title={editingTemplate ? 'Edit Template' : 'Create Template'}
        open={templateModalOpen}
        onCancel={() => setTemplateModalOpen(false)}
        onOk={handleSaveTemplate}
        okText={editingTemplate ? 'Update' : 'Create'}
        width={720}
        destroyOnClose
      >
        <Form form={templateForm} layout="vertical">
          <Form.Item name="name" label="Template Name" rules={[{ required: true, message: 'Name is required' }]}>
            <Input placeholder="e.g. Student Performance Report" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input placeholder="Brief description of this template" />
          </Form.Item>
          <Form.Item name="targetTableId" label="Target Table">
            <Select
              placeholder="Select a target table (optional)"
              allowClear
              options={tables.map((t) => ({ value: t.id, label: t.display_name || t.name }))}
            />
          </Form.Item>
          <Form.Item
            name="promptTemplate"
            label="Prompt Template"
            rules={[{ required: true, message: 'Prompt template is required' }]}
            extra="Use {{placeholder}} syntax for dynamic values (e.g. {{cin}}, {{studentName}})"
          >
            <TextArea rows={8} placeholder="Write the report prompt template. Use {{placeholder}} for dynamic values..." />
          </Form.Item>
          {currentPrompt && extractPlaceholders(currentPrompt).length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Detected placeholders: </Text>
              <Space size={[4, 4]} wrap>
                {extractPlaceholders(currentPrompt).map((p) => (
                  <Tag key={p} color="blue">{`{{${p}}}`}</Tag>
                ))}
              </Space>
            </div>
          )}
        </Form>
      </Modal>

      <Modal
        title={<Space><RobotOutlined style={{ color: token.colorPrimary }} /> Generate Report with AI</Space>}
        open={generateModalOpen}
        onCancel={() => setGenerateModalOpen(false)}
        onOk={handleGenerate}
        okText={generating ? 'Generating...' : 'Generate'}
        confirmLoading={generating}
        width={520}
        destroyOnClose
      >
        <Form form={generateForm} layout="vertical">
          <Form.Item name="templateId" label="Select Template" rules={[{ required: true, message: 'Select a template' }]}>
            <Select
              placeholder="Choose a report template"
              options={templates.map((t) => ({ value: t.id, label: t.name }))}
            />
          </Form.Item>
          <Form.Item name="cin" label="Student CIN" rules={[{ required: true, message: 'CIN is required' }]}>
            <Input placeholder="Enter student CIN (e.g. 12345678)" />
          </Form.Item>
          <Form.Item label="Additional Filters (optional)">
            <Form.List name="filters">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Row key={key} gutter={8} style={{ marginBottom: 8 }}>
                      <Col span={10}>
                        <Form.Item {...restField} name={[name, 'key']} style={{ marginBottom: 0 }}>
                          <Input placeholder="Key" />
                        </Form.Item>
                      </Col>
                      <Col span={10}>
                        <Form.Item {...restField} name={[name, 'value']} style={{ marginBottom: 0 }}>
                          <Input placeholder="Value" />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Button danger onClick={() => remove(name)} icon={<DeleteOutlined />} />
                      </Col>
                    </Row>
                  ))}
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    Add Filter
                  </Button>
                </>
              )}
            </Form.List>
          </Form.Item>
        </Form>
        {generating && (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <Spin size="large" />
            <Text style={{ display: 'block', marginTop: 12, color: token.colorTextSecondary }}>
              AI is analyzing student data and generating the report...
            </Text>
          </div>
        )}
      </Modal>

      <Modal
        title={
          <Space>
            <EyeOutlined style={{ color: token.colorPrimary }} />
            Report Preview
            {previewReport?.user_cin && <Tag>CIN: {previewReport.user_cin}</Tag>}
            {previewReport?.status && <Tag color={previewReport.status === 'generated' ? 'green' : 'blue'}>{previewReport.status}</Tag>}
          </Space>
        }
        open={previewModalOpen}
        onCancel={() => setPreviewModalOpen(false)}
        width={800}
        footer={
          <Space>
            <Button onClick={() => setPreviewModalOpen(false)}>Close</Button>
            <Button icon={<CopyOutlined />} onClick={handleExportExcel}>Export CSV</Button>
            <Button type="primary" onClick={handleExportPDF}>Export PDF</Button>
          </Space>
        }
        destroyOnClose
      >
      {previewReport && (
        <div>
          <div style={{ marginBottom: 16, color: token.colorTextTertiary, fontSize: 12 }}>
            Generated: {new Date(previewReport.created_at).toLocaleString()}
          </div>
          {editingSections.length > 0 ? (
            editingSections.map((section, idx) => (
              <Card
                key={idx}
                size="small"
                style={{
                  marginBottom: 16,
                  borderRadius: 12,
                  background: idx % 2 === 0 ? token.colorBgSpotlight : undefined,
                  border: `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                <Title level={5} style={{ color: token.colorPrimary, marginBottom: 8 }}>{section.title}</Title>
                <Paragraph style={{ color: token.colorText, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {section.content}
                </Paragraph>
              </Card>
            ))
          ) : (
            <Empty description="No report content available" />
          )}
        </div>
      )}
    </Modal>

    <Modal
      title={<Space><TeamOutlined style={{ color: token.colorPrimary }} /> Batch Report Generation</Space>}
      open={batchModalOpen}
      onCancel={() => { if (!batchRunning) setBatchModalOpen(false); }}
      onOk={handleBatchGenerate}
      okText={batchRunning ? 'Generating...' : 'Start Batch'}
      confirmLoading={batchRunning}
      width={640}
      destroyOnClose
    >
      <Form form={batchForm} layout="vertical">
        <Form.Item name="templateId" label="Select Template" rules={[{ required: true, message: 'Select a template' }]}>
          <Select
            placeholder="Choose a report template"
            options={templates.map((t) => ({ value: t.id, label: t.name }))}
          />
        </Form.Item>
        <Form.Item
          name="cins"
          label="Student CINs"
          rules={[{ required: true, message: 'Enter at least one CIN' }]}
          extra="Enter CINs separated by newlines, commas, or semicolons (max 50)"
        >
          <TextArea rows={6} placeholder="12345678&#10;87654321&#10;11223344" />
        </Form.Item>
      </Form>
      {batchProgress && (
        <Card size="small" style={{ marginTop: 16, borderRadius: 12 }}>
          <div style={{ marginBottom: 12 }}>
            <Progress
              percent={Math.round(((batchProgress.succeeded + batchProgress.failed) / batchProgress.total) * 100)}
              status={batchProgress.failed > 0 ? 'exception' : 'active'}
            />
          </div>
          <Space style={{ marginBottom: 12 }}>
            <Tag color="blue">Total: {batchProgress.total}</Tag>
            <Tag color="green">Succeeded: {batchProgress.succeeded}</Tag>
            <Tag color="red">Failed: {batchProgress.failed}</Tag>
          </Space>
          {batchProgress.results.filter((r) => r.status === 'failed').length > 0 && (
            <div style={{ marginTop: 8 }}>
              <Text type="danger" style={{ fontWeight: 600 }}>Failed CINs:</Text>
              <ul style={{ margin: '4px 0 0 16px', fontSize: 12 }}>
                {batchProgress.results.filter((r) => r.status === 'failed').map((r) => (
                  <li key={r.cin}>
                    <Text type="danger">{r.cin}</Text>: {r.error || 'Unknown error'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </Modal>
  </div>
  );
}
