import { useState, useEffect, useCallback } from 'react';
import {
  Card, Typography, theme, Button, Table, Tag, Space, Modal, Form,
  Input, Select, Switch, message, Popconfirm, Tooltip, Row, Col,
  Spin, Alert, Empty, Tabs, Divider
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, PlayCircleOutlined,
  RobotOutlined, BarChartOutlined, EyeOutlined, CopyOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { vizApi, type Chart, type ChartType, type ChartSuggestion, type ChartDataResult } from '../core/api/viz';
import { schemaApi, type DynamicTable, type DynamicField } from '../core/api/schema';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const CHART_TYPE_OPTIONS: { value: ChartType; label: string; icon: string }[] = [
  { value: 'bar', label: 'Bar Chart', icon: '📊' },
  { value: 'horizontal_bar', label: 'Horizontal Bar', icon: '📊' },
  { value: 'line', label: 'Line Chart', icon: '📈' },
  { value: 'area', label: 'Area Chart', icon: '📈' },
  { value: 'pie', label: 'Pie Chart', icon: '🥧' },
  { value: 'donut', label: 'Donut Chart', icon: '🍩' },
  { value: 'scatter', label: 'Scatter Plot', icon: '⚬' },
  { value: 'radar', label: 'Radar Chart', icon: '🕸️' },
  { value: 'metric', label: 'Metric Card', icon: '🔢' },
  { value: 'table', label: 'Data Table', icon: '📋' },
];

function ChartPreview({ chart, data }: { chart: Chart; data: ChartDataResult | null }) {
  const { token } = theme.useToken();

  if (!data) {
    return <div style={{ padding: 40, textAlign: 'center', color: token.colorTextSecondary }}>Click "Execute" to preview</div>;
  }

  if (chart.chart_type === 'metric' && data.rows.length > 0) {
    const config = chart.config_json as Record<string, unknown>;
    const value = data.rows[0]?.value ?? data.rows[0]?.count ?? 0;
    const prefix = (config?.prefix as string) || '';
    const suffix = (config?.suffix as string) || '';
    const decimals = (config?.decimals as number) ?? 0;
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: 48, fontWeight: 700, color: token.colorPrimary }}>
          {prefix}{Number(value).toFixed(decimals)}{suffix}
        </div>
        <div style={{ fontSize: 16, color: token.colorTextSecondary, marginTop: 8 }}>{chart.title}</div>
      </div>
    );
  }

  if (chart.chart_type === 'table') {
    if (data.rows.length === 0) return <Empty description="No data" />;
    const columns = Object.keys(data.rows[0]).map(key => ({
      title: key,
      dataIndex: key,
      key,
      ellipsis: true,
    }));
    return (
      <Table
        dataSource={data.rows.map((r, i) => ({ ...r, _key: i }))}
        columns={columns}
        rowKey="_key"
        size="small"
        pagination={{ pageSize: 10 }}
        scroll={{ x: true }}
      />
    );
  }

  if (['bar', 'horizontal_bar', 'line', 'area', 'pie', 'donut', 'radar'].includes(chart.chart_type)) {
    if (data.rows.length === 0) return <Empty description="No data" />;
    return (
      <div style={{ padding: '10px 0' }}>
        <Table
          dataSource={data.rows.map((r, i) => ({ ...r, _key: i }))}
          columns={[
            { title: 'Label', dataIndex: 'label', key: 'label' },
            { title: 'Value', dataIndex: 'value', key: 'value', render: (v: unknown) => typeof v === 'number' ? v.toLocaleString() : String(v ?? '') },
          ]}
          rowKey="_key"
          size="small"
          pagination={false}
        />
        <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
          {data.totalCount} total rows | Chart type: {chart.chart_type}
        </Text>
      </div>
    );
  }

  if (chart.chart_type === 'scatter') {
    if (data.rows.length === 0) return <Empty description="No data" />;
    return (
      <Table
        dataSource={data.rows.map((r, i) => ({ ...r, _key: i }))}
        columns={[
          { title: 'X', dataIndex: 'x', key: 'x' },
          { title: 'Y', dataIndex: 'y', key: 'y' },
        ]}
        rowKey="_key"
        size="small"
        pagination={false}
      />
    );
  }

  return <div style={{ padding: 20, textAlign: 'center' }}><Text>Preview not available for this chart type</Text></div>;
}

export default function ChartsPage() {
  const { token } = theme.useToken();
  const [charts, setCharts] = useState<Chart[]>([]);
  const [tables, setTables] = useState<DynamicTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedChart, setSelectedChart] = useState<Chart | null>(null);
  const [previewData, setPreviewData] = useState<ChartDataResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<ChartSuggestion | null>(null);
  const [selectedTableFields, setSelectedTableFields] = useState<DynamicField[]>([]);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [aiForm] = Form.useForm();
  const [createMode, setCreateMode] = useState<'manual' | 'ai'>('manual');

  const loadCharts = useCallback(async () => {
    try {
      const res = await vizApi.listCharts();
      if (res.success && res.data) setCharts(res.data);
    } catch { message.error('Failed to load charts'); }
  }, []);

  const loadTables = useCallback(async () => {
    try {
      const res = await schemaApi.listTables();
      if (res.success && res.data) setTables(res.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { setLoading(true); Promise.all([loadCharts(), loadTables()]).finally(() => setLoading(false)); }, [loadCharts, loadTables]);

  const loadFieldsForTable = async (tableId: string) => {
    try {
      const res = await schemaApi.listFields(tableId);
      if (res.success && res.data) setSelectedTableFields(res.data);
    } catch { setSelectedTableFields([]); }
  };

  const handleCreateChart = async () => {
    try {
      const values = await form.validateFields();
      await vizApi.createChart({
        title: values.title,
        description: values.description,
        chartType: values.chartType,
        tableId: values.tableId,
        sqlQuery: values.sqlQuery,
        isPublic: values.isPublic || false,
      });
      message.success('Chart created');
      setCreateModalOpen(false);
      form.resetFields();
      loadCharts();
    } catch (err: any) {
      if (err?.response?.data?.error?.message) message.error(err.response.data.error.message);
      else if (err?.errorFields) message.error('Please fill all required fields');
      else message.error('Failed to create chart');
    }
  };

  const handleUpdateChart = async () => {
    if (!selectedChart) return;
    try {
      const values = await editForm.validateFields();
      await vizApi.updateChart(selectedChart.id, {
        title: values.title,
        description: values.description,
        chartType: values.chartType,
        sqlQuery: values.sqlQuery,
        isPublic: values.isPublic,
      });
      message.success('Chart updated');
      setEditModalOpen(false);
      setSelectedChart(null);
      loadCharts();
    } catch (err: any) {
      if (err?.response?.data?.error?.message) message.error(err.response.data.error.message);
      else message.error('Failed to update chart');
    }
  };

  const handleDeleteChart = async (id: string) => {
    try {
      await vizApi.deleteChart(id);
      message.success('Chart deleted');
      loadCharts();
    } catch { message.error('Failed to delete chart'); }
  };

  const handleExecuteChart = async (chart: Chart) => {
    setSelectedChart(chart);
    setPreviewModalOpen(true);
    setPreviewData(null);
    setPreviewLoading(true);
    try {
      const res = await vizApi.executeChart(chart.id);
      if (res.success && res.data) setPreviewData(res.data);
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || 'Failed to execute chart query');
    } finally { setPreviewLoading(false); }
  };

  const handleAIGenerate = async () => {
    try {
      const values = await aiForm.validateFields();
      setAiLoading(true);
      const res = await vizApi.generateChart(values.description, values.tableId);
      if (res.success && res.data) {
        setAiSuggestion(res.data);
        message.success('AI suggestion generated');
      }
    } catch (err: any) {
      if (err?.response?.data?.error?.message) message.error(err.response.data.error.message);
      else message.error('Failed to generate chart suggestion');
    } finally { setAiLoading(false); }
  };

  const handleApplyAiSuggestion = () => {
    if (!aiSuggestion) return;
    setCreateModalOpen(true);
    setCreateMode('manual');
    setTimeout(() => {
      form.setFieldsValue({
        title: aiSuggestion.title,
        chartType: aiSuggestion.chartType,
        sqlQuery: aiSuggestion.sqlQuery,
      });
    }, 100);
    setAiModalOpen(false);
    setAiSuggestion(null);
  };

  const openEditModal = (chart: Chart) => {
    setSelectedChart(chart);
    editForm.setFieldsValue({
      title: chart.title,
      description: chart.description,
      chartType: chart.chart_type,
      sqlQuery: chart.sql_query,
      isPublic: chart.is_public,
    });
    setEditModalOpen(true);
  };

  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: Chart) => (
        <div>
          <Text strong>{title}</Text>
          {record.description && <div><Text type="secondary" style={{ fontSize: 12 }}>{record.description}</Text></div>}
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'chart_type',
      key: 'chart_type',
      width: 120,
      render: (type: ChartType) => {
        const opt = CHART_TYPE_OPTIONS.find(o => o.value === type);
        return <Tag>{opt?.icon} {opt?.label || type}</Tag>;
      },
    },
    {
      title: 'Table',
      key: 'table',
      width: 150,
      render: (_: unknown, record: Chart) => record.table_display_name || record.table_name || '-',
    },
    {
      title: 'Public',
      dataIndex: 'is_public',
      key: 'is_public',
      width: 80,
      render: (v: boolean) => v ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>,
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (v: string) => new Date(v).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_: unknown, record: Chart) => (
        <Space size="small">
          <Tooltip title="Preview">
            <Button size="small" icon={<PlayCircleOutlined />} onClick={() => handleExecuteChart(record)} />
          </Tooltip>
          <Tooltip title="Edit">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)} />
          </Tooltip>
          <Tooltip title="Copy SQL">
            <Button size="small" icon={<CopyOutlined />} onClick={() => { navigator.clipboard.writeText(record.sql_query); message.success('SQL copied'); }} />
          </Tooltip>
          <Popconfirm title="Delete this chart?" onConfirm={() => handleDeleteChart(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Title level={3} style={{ marginBottom: 4, color: token.colorText, fontWeight: 700 }}>Chart Editor</Title>
          <Text style={{ color: token.colorTextSecondary }}>Create and manage visualizations with AI-powered assistance.</Text>
        </div>
        <Space>
          <Button icon={<RobotOutlined />} onClick={() => { setAiModalOpen(true); setAiSuggestion(null); aiForm.resetFields(); }}>
            AI Generate
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setCreateModalOpen(true); setCreateMode('manual'); form.resetFields(); setSelectedTableFields([]); }}>
            Create Chart
          </Button>
          <Button icon={<ReloadOutlined />} onClick={loadCharts}>Refresh</Button>
        </Space>
      </div>

      <Card style={{ borderRadius: 16, border: `1px solid ${token.colorBorderSecondary}` }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : charts.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <Text style={{ color: token.colorTextSecondary, display: 'block', marginBottom: 8 }}>No charts created yet</Text>
                <Text style={{ color: token.colorTextTertiary, fontSize: 12 }}>Create your first chart to visualize your data</Text>
              </div>
            }
            style={{ padding: '60px 0' }}
          >
            <Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { setCreateModalOpen(true); setCreateMode('manual'); form.resetFields(); }}>
                Create First Chart
              </Button>
              <Button icon={<RobotOutlined />} onClick={() => { setAiModalOpen(true); setAiSuggestion(null); aiForm.resetFields(); }}>
                AI Generate
              </Button>
            </Space>
          </Empty>
        ) : (
          <Table dataSource={charts} columns={columns} rowKey="id" pagination={{ pageSize: 10 }} />
        )}
      </Card>

      <Modal
        title="Create Chart"
        open={createModalOpen}
        onOk={handleCreateChart}
        onCancel={() => setCreateModalOpen(false)}
        width={700}
        okText="Create"
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Required' }]}>
                <Input placeholder="e.g., Students by Level" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="chartType" label="Chart Type" rules={[{ required: true, message: 'Required' }]}>
                <Select options={CHART_TYPE_OPTIONS.map(o => ({ value: o.value, label: `${o.icon} ${o.label}` }))} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Description">
            <Input placeholder="Optional description" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="tableId" label="Source Table" rules={[{ required: true, message: 'Required' }]}>
                <Select
                  placeholder="Select table"
                  options={tables.map(t => ({ value: t.id, label: `${t.display_name} (${t.name})` }))}
                  onChange={(val: string) => {
                    const tbl = tables.find(t => t.id === val);
                    if (tbl) {
                      const prefix = `SELECT * FROM ${tbl.name}`;
                      form.setFieldValue('sqlQuery', prefix);
                      loadFieldsForTable(val);
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="isPublic" label="Public" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
          {selectedTableFields.length > 0 && (
            <div style={{ marginBottom: 16, padding: 12, background: token.colorBgContainer, borderRadius: 8, border: `1px solid ${token.colorBorderSecondary}` }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>Available fields:</Text>
              <Space wrap>
                {selectedTableFields.map(f => (
                  <Tag key={f.id} color="blue">{f.name} ({f.field_type})</Tag>
                ))}
                <Tag>id</Tag><Tag>created_at</Tag>
              </Space>
            </div>
          )}
          <Form.Item name="sqlQuery" label="SQL Query" rules={[{ required: true, message: 'Required' }]}>
            <TextArea rows={6} placeholder="SELECT column AS label, COUNT(*) AS value FROM dt_table GROUP BY column" style={{ fontFamily: 'monospace' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Edit Chart"
        open={editModalOpen}
        onOk={handleUpdateChart}
        onCancel={() => { setEditModalOpen(false); setSelectedChart(null); }}
        width={700}
        okText="Save"
      >
        <Form form={editForm} layout="vertical">
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="title" label="Title" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="chartType" label="Chart Type" rules={[{ required: true }]}>
                <Select options={CHART_TYPE_OPTIONS.map(o => ({ value: o.value, label: `${o.icon} ${o.label}` }))} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Description">
            <Input />
          </Form.Item>
          <Row gutter={16}>
            <Col span={16}>
              <div />
            </Col>
            <Col span={8}>
              <Form.Item name="isPublic" label="Public" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="sqlQuery" label="SQL Query" rules={[{ required: true }]}>
            <TextArea rows={6} style={{ fontFamily: 'monospace' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="AI Chart Generator"
        open={aiModalOpen}
        onCancel={() => { setAiModalOpen(false); setAiSuggestion(null); }}
        width={700}
        footer={aiSuggestion ? [
          <Button key="cancel" onClick={() => { setAiModalOpen(false); setAiSuggestion(null); }}>Cancel</Button>,
          <Button key="regenerate" onClick={() => { setAiSuggestion(null); }}>Regenerate</Button>,
          <Button key="apply" type="primary" onClick={handleApplyAiSuggestion}>Apply & Create</Button>,
        ] : [
          <Button key="cancel" onClick={() => setAiModalOpen(false)}>Cancel</Button>,
          <Button key="generate" type="primary" loading={aiLoading} onClick={handleAIGenerate}>Generate</Button>,
        ]}
      >
        {!aiSuggestion ? (
          <Form form={aiForm} layout="vertical">
            <Form.Item name="tableId" label="Source Table" rules={[{ required: true, message: 'Select a table' }]}>
              <Select
                placeholder="Select table"
                options={tables.map(t => ({ value: t.id, label: `${t.display_name} (${t.name})` }))}
              />
            </Form.Item>
            <Form.Item name="description" label="Describe the chart you want" rules={[{ required: true, message: 'Describe what you want to visualize' }]}>
              <TextArea rows={4} placeholder="e.g., Show the number of students per academic level as a bar chart" />
            </Form.Item>
          </Form>
        ) : (
          <div>
            <Alert type="success" title="AI Suggestion Generated" style={{ marginBottom: 16 }} />
            <div style={{ marginBottom: 12 }}>
              <Text strong>Title: </Text><Text>{aiSuggestion.title}</Text>
            </div>
            <div style={{ marginBottom: 12 }}>
              <Text strong>Type: </Text><Tag>{aiSuggestion.chartType}</Tag>
            </div>
            <div style={{ marginBottom: 12 }}>
              <Text strong>Description: </Text><Text>{aiSuggestion.description}</Text>
            </div>
            <div style={{ marginBottom: 12 }}>
              <Text strong>SQL Query:</Text>
              <pre style={{ background: token.colorBgContainer, padding: 12, borderRadius: 8, marginTop: 4, border: `1px solid ${token.colorBorderSecondary}`, fontSize: 13, overflow: 'auto' }}>
                {aiSuggestion.sqlQuery}
              </pre>
            </div>
            {aiSuggestion.configJson && Object.keys(aiSuggestion.configJson).length > 0 && (
              <div>
                <Text strong>Config:</Text>
                <pre style={{ background: token.colorBgContainer, padding: 12, borderRadius: 8, marginTop: 4, border: `1px solid ${token.colorBorderSecondary}`, fontSize: 13 }}>
                  {JSON.stringify(aiSuggestion.configJson, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        title={selectedChart ? `Preview: ${selectedChart.title}` : 'Preview'}
        open={previewModalOpen}
        onCancel={() => { setPreviewModalOpen(false); setSelectedChart(null); setPreviewData(null); }}
        width={800}
        footer={[
          <Button key="close" onClick={() => { setPreviewModalOpen(false); setSelectedChart(null); setPreviewData(null); }}>Close</Button>,
          selectedChart && <Button key="refresh" icon={<ReloadOutlined />} loading={previewLoading} onClick={async () => {
            if (!selectedChart) return;
            setPreviewLoading(true);
            try {
              const res = await vizApi.executeChart(selectedChart.id);
              if (res.success && res.data) setPreviewData(res.data);
            } catch { message.error('Failed to refresh'); }
            finally { setPreviewLoading(false); }
          }}>Refresh</Button>,
        ]}
      >
        {selectedChart && (
          <div>
            <Space style={{ marginBottom: 16 }}>
              <Tag>{CHART_TYPE_OPTIONS.find(o => o.value === selectedChart.chart_type)?.icon} {selectedChart.chart_type}</Tag>
              <Tag color={selectedChart.is_public ? 'green' : 'default'}>{selectedChart.is_public ? 'Public' : 'Private'}</Tag>
              <Text type="secondary">Table: {selectedChart.table_display_name || selectedChart.table_name}</Text>
            </Space>
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>SQL:</Text>
              <pre style={{ background: token.colorBgContainer, padding: 8, borderRadius: 6, fontSize: 12, margin: '4px 0', overflow: 'auto', border: `1px solid ${token.colorBorderSecondary}` }}>
                {selectedChart.sql_query}
              </pre>
            </div>
            <Divider style={{ margin: '12px 0' }} />
            {previewLoading ? <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div> : <ChartPreview chart={selectedChart} data={previewData} />}
          </div>
        )}
      </Modal>
    </div>
  );
}
