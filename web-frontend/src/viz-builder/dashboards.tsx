import { useState, useEffect, useCallback } from 'react';
import {
  Card, Typography, theme, Button, Table, Tag, Space, Modal, Form,
  Input, Switch, message, Popconfirm, Tooltip, Row, Col, Spin,
  Empty, Select, Divider, Drawer
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, GlobalOutlined,
  LockOutlined, EyeOutlined, AppstoreOutlined, ReloadOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { vizApi, type Dashboard, type DashboardChart, type Chart, type ChartDataResult, type ChartType } from '../core/api/viz';

const { Title, Text } = Typography;

const CHART_TYPE_OPTIONS: Record<ChartType, string> = {
  bar: '📊 Bar', horizontal_bar: '📊 H-Bar', line: '📈 Line', area: '📈 Area',
  pie: '🥧 Pie', donut: '🍩 Donut', scatter: '⚬ Scatter', radar: '🕸️ Radar',
  metric: '🔢 Metric', table: '📋 Table',
};

function MiniChartPreview({ chart, data }: { chart: Chart; data: ChartDataResult | null }) {
  const { token } = theme.useToken();

  if (!data || data.rows.length === 0) {
    return <div style={{ textAlign: 'center', padding: 20, color: token.colorTextTertiary }}>No data</div>;
  }

  if (chart.chart_type === 'metric') {
    const value = data.rows[0]?.value ?? data.rows[0]?.count ?? 0;
    return (
      <div style={{ textAlign: 'center', padding: 16 }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: token.colorPrimary }}>{Number(value).toLocaleString()}</div>
        <Text type="secondary" style={{ fontSize: 12 }}>{chart.title}</Text>
      </div>
    );
  }

  if (chart.chart_type === 'table') {
    const cols = Object.keys(data.rows[0]).slice(0, 4);
    return (
      <div style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
          <thead>
            <tr>{cols.map(c => <th key={c} style={{ padding: '4px 8px', borderBottom: `1px solid ${token.colorBorderSecondary}`, textAlign: 'left', color: token.colorTextSecondary }}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {data.rows.slice(0, 5).map((row, i) => (
              <tr key={i}>{cols.map(c => <td key={c} style={{ padding: '4px 8px', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>{String(row[c] ?? '')}</td>)}</tr>
            ))}
          </tbody>
        </table>
        {data.totalCount > 5 && <Text type="secondary" style={{ fontSize: 11 }}>+{data.totalCount - 5} more rows</Text>}
      </div>
    );
  }

  const maxVal = Math.max(...data.rows.map(r => Number(r.value || 0)), 1);
  return (
    <div style={{ padding: '8px 0' }}>
      {data.rows.slice(0, 8).map((row, i) => {
        const label = String(row.label || '');
        const value = Number(row.value || 0);
        const pct = (value / maxVal) * 100;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Text style={{ width: 80, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={label}>{label}</Text>
            <div style={{ flex: 1, height: 16, background: token.colorBgContainer, borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: token.colorPrimary, borderRadius: 4, transition: 'width 0.3s' }} />
            </div>
            <Text style={{ fontSize: 11, width: 50, textAlign: 'right' }}>{value.toLocaleString()}</Text>
          </div>
        );
      })}
      {data.totalCount > 8 && <Text type="secondary" style={{ fontSize: 11 }}>+{data.totalCount - 8} more</Text>}
    </div>
  );
}

export default function DashboardsPage() {
  const { token } = theme.useToken();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [charts, setCharts] = useState<Chart[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [addChartModalOpen, setAddChartModalOpen] = useState(false);
  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | null>(null);
  const [dashboardCharts, setDashboardCharts] = useState<DashboardChart[]>([]);
  const [chartDataMap, setChartDataMap] = useState<Record<string, ChartDataResult>>({});
  const [viewLoading, setViewLoading] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  const loadDashboards = useCallback(async () => {
    try {
      const res = await vizApi.listDashboards();
      if (res.success && res.data) setDashboards(res.data);
    } catch { message.error('Failed to load dashboards'); }
  }, []);

  const loadCharts = useCallback(async () => {
    try {
      const res = await vizApi.listCharts();
      if (res.success && res.data) setCharts(res.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { setLoading(true); Promise.all([loadDashboards(), loadCharts()]).finally(() => setLoading(false)); }, [loadDashboards, loadCharts]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await vizApi.createDashboard({ title: values.title, description: values.description, isPublic: values.isPublic || false });
      message.success('Dashboard created');
      setCreateModalOpen(false);
      form.resetFields();
      loadDashboards();
    } catch (err: any) {
      if (err?.response?.data?.error?.message) message.error(err.response.data.error.message);
      else message.error('Failed to create dashboard');
    }
  };

  const handleUpdate = async () => {
    if (!selectedDashboard) return;
    try {
      const values = await editForm.validateFields();
      await vizApi.updateDashboard(selectedDashboard.id, { title: values.title, description: values.description, isPublic: values.isPublic });
      message.success('Dashboard updated');
      setEditModalOpen(false);
      setSelectedDashboard(null);
      loadDashboards();
    } catch (err: any) {
      if (err?.response?.data?.error?.message) message.error(err.response.data.error.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await vizApi.deleteDashboard(id);
      message.success('Dashboard deleted');
      loadDashboards();
    } catch { message.error('Failed to delete dashboard'); }
  };

  const handlePublish = async (id: string) => {
    try {
      const res = await vizApi.publishDashboard(id);
      if (res.success) {
        message.success('Dashboard published');
        loadDashboards();
      }
    } catch { message.error('Failed to publish'); }
  };

  const handleUnpublish = async (id: string) => {
    try {
      const res = await vizApi.unpublishDashboard(id);
      if (res.success) {
        message.success('Dashboard unpublished');
        loadDashboards();
      }
    } catch { message.error('Failed to unpublish'); }
  };

  const openViewDrawer = async (dashboard: Dashboard) => {
    setSelectedDashboard(dashboard);
    setViewDrawerOpen(true);
    setViewLoading(true);
    setDashboardCharts([]);
    setChartDataMap({});
    try {
      const res = await vizApi.getDashboard(dashboard.id);
      if (res.success && res.data?.charts) {
        setDashboardCharts(res.data.charts);
        const dataMap: Record<string, ChartDataResult> = {};
        for (const dc of res.data.charts) {
          try {
            const chartRes = await vizApi.executeChart(dc.chart_id, 100);
            if (chartRes.success && chartRes.data) dataMap[dc.chart_id] = chartRes.data;
          } catch { /* skip failed charts */ }
        }
        setChartDataMap(dataMap);
      }
    } catch { message.error('Failed to load dashboard details'); }
    finally { setViewLoading(false); }
  };

  const handleAddChart = async (chartId: string) => {
    if (!selectedDashboard) return;
    try {
      await vizApi.addChartToDashboard(selectedDashboard.id, { chartId });
      message.success('Chart added to dashboard');
      setAddChartModalOpen(false);
      openViewDrawer(selectedDashboard);
      loadDashboards();
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || 'Failed to add chart');
    }
  };

  const handleRemoveChart = async (dcId: string) => {
    try {
      await vizApi.removeChartFromDashboard(dcId);
      message.success('Chart removed');
      if (selectedDashboard) openViewDrawer(selectedDashboard);
    } catch { message.error('Failed to remove chart'); }
  };

  const openEditModal = (dashboard: Dashboard) => {
    setSelectedDashboard(dashboard);
    editForm.setFieldsValue({ title: dashboard.title, description: dashboard.description, isPublic: dashboard.is_public });
    setEditModalOpen(true);
  };

  const existingChartIds = new Set(dashboardCharts.map(dc => dc.chart_id));
  const availableCharts = charts.filter(c => !existingChartIds.has(c.id));

  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: Dashboard) => (
        <div>
          <Text strong>{title}</Text>
          {record.description && <div><Text type="secondary" style={{ fontSize: 12 }}>{record.description}</Text></div>}
        </div>
      ),
    },
    {
      title: 'Charts',
      key: 'charts_count',
      width: 80,
      render: (_: unknown, record: Dashboard) => record.charts?.length ?? 0,
    },
    {
      title: 'Visibility',
      dataIndex: 'is_public',
      key: 'is_public',
      width: 100,
      render: (v: boolean) => v ? <Tag color="green" icon={<GlobalOutlined />}>Public</Tag> : <Tag icon={<LockOutlined />}>Private</Tag>,
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
      width: 260,
      render: (_: unknown, record: Dashboard) => (
        <Space size="small">
          <Tooltip title="View">
            <Button size="small" icon={<EyeOutlined />} onClick={() => openViewDrawer(record)} />
          </Tooltip>
          <Tooltip title="Edit">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)} />
          </Tooltip>
          {record.is_public ? (
            <Tooltip title="Unpublish">
              <Button size="small" icon={<LockOutlined />} onClick={() => handleUnpublish(record.id)} />
            </Tooltip>
          ) : (
            <Tooltip title="Publish">
              <Button size="small" icon={<GlobalOutlined />} onClick={() => handlePublish(record.id)} />
            </Tooltip>
          )}
          <Popconfirm title="Delete this dashboard?" onConfirm={() => handleDelete(record.id)}>
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
          <Title level={3} style={{ marginBottom: 4, color: token.colorText, fontWeight: 700 }}>Dashboards</Title>
          <Text style={{ color: token.colorTextSecondary }}>Build interactive dashboards by combining charts and filters.</Text>
        </div>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setCreateModalOpen(true); form.resetFields(); }}>Create Dashboard</Button>
          <Button icon={<ReloadOutlined />} onClick={loadDashboards}>Refresh</Button>
        </Space>
      </div>

      <Card style={{ borderRadius: 16, border: `1px solid ${token.colorBorderSecondary}` }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : dashboards.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <Text style={{ color: token.colorTextSecondary, display: 'block', marginBottom: 8 }}>No dashboards created yet</Text>
                <Text style={{ color: token.colorTextTertiary, fontSize: 12 }}>Combine charts into interactive dashboard views</Text>
              </div>
            }
            style={{ padding: '60px 0' }}
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setCreateModalOpen(true); form.resetFields(); }}>
              Create First Dashboard
            </Button>
          </Empty>
        ) : (
          <Table dataSource={dashboards} columns={columns} rowKey="id" pagination={{ pageSize: 10 }} />
        )}
      </Card>

      <Modal title="Create Dashboard" open={createModalOpen} onOk={handleCreate} onCancel={() => setCreateModalOpen(false)} okText="Create">
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input placeholder="e.g., Academic Overview" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Optional description" />
          </Form.Item>
          <Form.Item name="isPublic" label="Public" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Edit Dashboard" open={editModalOpen} onOk={handleUpdate} onCancel={() => { setEditModalOpen(false); setSelectedDashboard(null); }} okText="Save">
        <Form form={editForm} layout="vertical">
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="isPublic" label="Public" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={selectedDashboard ? `Dashboard: ${selectedDashboard.title}` : 'Dashboard'}
        open={viewDrawerOpen}
        onClose={() => { setViewDrawerOpen(false); setSelectedDashboard(null); setDashboardCharts([]); setChartDataMap({}); }}
        width={900}
        extra={
          <Space>
            <Button icon={<PlusOutlined />} onClick={() => setAddChartModalOpen(true)}>Add Chart</Button>
            {selectedDashboard?.is_public ? (
              <Button icon={<LockOutlined />} onClick={() => { if (selectedDashboard) handleUnpublish(selectedDashboard.id); }}>Unpublish</Button>
            ) : (
              <Button icon={<GlobalOutlined />} onClick={() => { if (selectedDashboard) handlePublish(selectedDashboard.id); }}>Publish</Button>
            )}
          </Space>
        }
      >
        {viewLoading ? <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div> : (
          <div>
            {selectedDashboard?.description && <Text style={{ display: 'block', marginBottom: 16, color: token.colorTextSecondary }}>{selectedDashboard.description}</Text>}
            {dashboardCharts.length === 0 ? (
              <Empty description="No charts in this dashboard">
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddChartModalOpen(true)}>Add Chart</Button>
              </Empty>
            ) : (
              <Row gutter={[16, 16]}>
                {dashboardCharts.map(dc => {
                  const chartData = chartDataMap[dc.chart_id];
                  const chart = dc.chart;
                  if (!chart) return null;
                  return (
                    <Col key={dc.id} span={dc.width >= 8 ? 24 : dc.width >= 6 ? 12 : 8}>
                      <Card
                        size="small"
                        title={
                          <Space>
                            <Text>{CHART_TYPE_OPTIONS[chart.chart_type] || chart.chart_type}</Text>
                            <Text strong>{chart.title}</Text>
                          </Space>
                        }
                        extra={
                          <Popconfirm title="Remove chart from dashboard?" onConfirm={() => handleRemoveChart(dc.id)}>
                            <Button size="small" danger icon={<DeleteOutlined />} type="text" />
                          </Popconfirm>
                        }
                        style={{ borderRadius: 12, border: `1px solid ${token.colorBorderSecondary}` }}
                      >
                        <MiniChartPreview chart={chart} data={chartData || null} />
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            )}
          </div>
        )}
      </Drawer>

      <Modal
        title="Add Chart to Dashboard"
        open={addChartModalOpen}
        onCancel={() => setAddChartModalOpen(false)}
        footer={null}
        width={600}
      >
        {availableCharts.length === 0 ? (
          <Empty description="All existing charts are already added, or no charts exist yet" />
        ) : (
          <Table
            dataSource={availableCharts}
            columns={[
              { title: 'Title', dataIndex: 'title', key: 'title' },
              {
                title: 'Type', dataIndex: 'chart_type', key: 'chart_type', width: 100,
                render: (t: ChartType) => <Tag>{CHART_TYPE_OPTIONS[t] || t}</Tag>,
              },
              { title: 'Table', dataIndex: 'table_display_name', key: 'table', width: 120 },
              {
                title: 'Action', key: 'action', width: 80,
                render: (_: unknown, record: Chart) => <Button type="primary" size="small" onClick={() => handleAddChart(record.id)}>Add</Button>,
              },
            ]}
            rowKey="id"
            size="small"
            pagination={false}
          />
        )}
      </Modal>
    </div>
  );
}
