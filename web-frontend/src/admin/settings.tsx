import { useState, useCallback, useEffect } from 'react';
import {
  Card, Typography, Table, Button, Space, Tag, Empty, Modal, Form, Input,
  Select, Spin, message, theme, Popconfirm, Tooltip, Tabs, Descriptions,
  Row, Col,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, EditOutlined, SearchOutlined,
  CalendarOutlined, CloudUploadOutlined, HistoryOutlined,
  BgColorsOutlined, SettingOutlined, ReloadOutlined, CheckOutlined,
} from '@ant-design/icons';
import {
  systemApi, type AcademicYear, type SystemSetting, type ActivityLog,
} from '../core/api/system';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function SettingsPage() {
  const { token } = theme.useToken();

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [ayLoading, setAyLoading] = useState(true);
  const [ayModalOpen, setAyModalOpen] = useState(false);
  const [editingAy, setEditingAy] = useState<AcademicYear | null>(null);
  const [ayForm] = Form.useForm();

  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingModalOpen, setSettingModalOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<SystemSetting | null>(null);
  const [settingForm] = Form.useForm();

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsActionFilter, setLogsActionFilter] = useState('');
  const [logsUserFilter, setLogsUserFilter] = useState('');

  const cardStyle = { borderRadius: 16, border: `1px solid ${token.colorBorderSecondary}` };

  const fetchAcademicYears = useCallback(async () => {
    setAyLoading(true);
    try {
      const res = await systemApi.listAcademicYears();
      if (res.success && res.data) setAcademicYears(res.data);
    } catch {
      message.error('Failed to load academic years');
    } finally {
      setAyLoading(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await systemApi.listSettings();
      if (res.success && res.data) setSettings(res.data);
    } catch {
      message.error('Failed to load settings');
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const params: any = { page: logsPage, limit: 50 };
      if (logsActionFilter) params.action = logsActionFilter;
      if (logsUserFilter) params.userId = logsUserFilter;
      const res = await systemApi.listActivityLogs(params);
      if (res.success && res.data) {
        setLogs(res.data);
        setLogsTotal(res.meta?.total || 0);
      }
    } catch {
      message.error('Failed to load activity logs');
    } finally {
      setLogsLoading(false);
    }
  }, [logsPage, logsActionFilter, logsUserFilter]);

  useEffect(() => { fetchAcademicYears(); }, [fetchAcademicYears]);
  useEffect(() => { fetchSettings(); }, [fetchSettings]);
  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleAddAy = () => {
    setEditingAy(null);
    ayForm.resetFields();
    setAyModalOpen(true);
  };

  const handleEditAy = (ay: AcademicYear) => {
    setEditingAy(ay);
    ayForm.setFieldsValue({
      year: ay.year,
      startDate: ay.start_date,
      endDate: ay.end_date,
      isCurrent: ay.is_current,
    });
    setAyModalOpen(true);
  };

  const handleSaveAy = async () => {
    try {
      const values = await ayForm.validateFields();
      const payload = {
        year: values.year,
        startDate: values.startDate,
        endDate: values.endDate,
        isCurrent: values.isCurrent || false,
      };
      if (editingAy) {
        const res = await systemApi.updateAcademicYear(editingAy.id, payload);
        if (res.success) { message.success('Academic year updated'); setAyModalOpen(false); fetchAcademicYears(); }
      } else {
        const res = await systemApi.createAcademicYear(payload);
        if (res.success) { message.success('Academic year created'); setAyModalOpen(false); fetchAcademicYears(); }
      }
    } catch (err: any) {
      if (err?.response?.data?.error?.message) message.error(err.response.data.error.message);
      else if (!err?.errorFields) message.error('Failed to save academic year');
    }
  };

  const handleSetCurrentAy = async (ay: AcademicYear) => {
    try {
      const res = await systemApi.updateAcademicYear(ay.id, { isCurrent: true });
      if (res.success) { message.success('Current academic year updated'); fetchAcademicYears(); }
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || 'Failed to set current year');
    }
  };

  const handleDeleteAy = async (id: string) => {
    try {
      const res = await systemApi.deleteAcademicYear(id);
      if (res.success) { message.success('Academic year deleted'); fetchAcademicYears(); }
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || 'Failed to delete academic year');
    }
  };

  const handleAddSetting = () => {
    setEditingSetting(null);
    settingForm.resetFields();
    setSettingModalOpen(true);
  };

  const handleEditSetting = (setting: SystemSetting) => {
    setEditingSetting(setting);
    settingForm.setFieldsValue({
      key: setting.key,
      value: typeof setting.value === 'string' ? setting.value : JSON.stringify(setting.value, null, 2),
    });
    setSettingModalOpen(true);
  };

  const handleSaveSetting = async () => {
    try {
      const values = await settingForm.validateFields();
      let parsedValue = values.value;
      try { parsedValue = JSON.parse(values.value); } catch { /* keep as string */ }
      if (editingSetting) {
        const res = await systemApi.upsertSetting(values.key, parsedValue);
        if (res.success) { message.success('Setting updated'); setSettingModalOpen(false); fetchSettings(); }
      } else {
        const res = await systemApi.upsertSetting(values.key, parsedValue);
        if (res.success) { message.success('Setting created'); setSettingModalOpen(false); fetchSettings(); }
      }
    } catch (err: any) {
      if (err?.response?.data?.error?.message) message.error(err.response.data.error.message);
      else if (!err?.errorFields) message.error('Failed to save setting');
    }
  };

  const handleDeleteSetting = async (key: string) => {
    try {
      const res = await systemApi.deleteSetting(key);
      if (res.success) { message.success('Setting deleted'); fetchSettings(); }
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || 'Failed to delete setting');
    }
  };

  const ayColumns = [
    {
      title: 'Year',
      dataIndex: 'year',
      key: 'year',
      render: (y: string, record: AcademicYear) => (
        <Space>
          <Text strong>{y}</Text>
          {record.is_current && <Tag color="green">Current</Tag>}
        </Space>
      ),
    },
    {
      title: 'Start',
      dataIndex: 'start_date',
      key: 'start_date',
      width: 130,
      render: (d: string) => new Date(d).toLocaleDateString(),
    },
    {
      title: 'End',
      dataIndex: 'end_date',
      key: 'end_date',
      width: 130,
      render: (d: string) => new Date(d).toLocaleDateString(),
    },
    {
      title: '',
      key: 'actions',
      width: 160,
      render: (_: unknown, record: AcademicYear) => (
        <Space size="small">
          {!record.is_current && (
            <Tooltip title="Set as Current">
              <Button type="text" size="small" icon={<CheckOutlined />} onClick={() => handleSetCurrentAy(record)} />
            </Tooltip>
          )}
          <Tooltip title="Edit">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEditAy(record)} />
          </Tooltip>
          <Popconfirm title="Delete this academic year?" onConfirm={() => handleDeleteAy(record.id)} okButtonProps={{ danger: true }}>
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const settingsColumns = [
    {
      title: 'Key',
      dataIndex: 'key',
      key: 'key',
      render: (k: string) => <Text code>{k}</Text>,
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      render: (v: any) => (
        <Text style={{ maxWidth: 400, display: 'inline-block' }} ellipsis>
          {typeof v === 'string' ? v : JSON.stringify(v)}
        </Text>
      ),
    },
    {
      title: 'Updated',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 160,
      render: (d: string) => new Date(d).toLocaleString(),
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_: unknown, record: SystemSetting) => (
        <Space size="small">
          <Tooltip title="Edit">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEditSetting(record)} />
          </Tooltip>
          <Popconfirm title="Delete this setting?" onConfirm={() => handleDeleteSetting(record.key)} okButtonProps={{ danger: true }}>
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const logsColumns = [
    {
      title: 'Time',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (d: string) => new Date(d).toLocaleString(),
    },
    {
      title: 'User',
      key: 'user',
      width: 150,
      render: (_: unknown, record: ActivityLog) => (
        record.user_first_name
          ? `${record.user_first_name} ${record.user_last_name}`
          : <Text type="secondary">System</Text>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      render: (a: string) => <Tag color="blue">{a}</Tag>,
    },
    {
      title: 'Entity',
      key: 'entity',
      render: (_: unknown, record: ActivityLog) => (
        record.entity_type
          ? <Text>{record.entity_type}{record.entity_id ? ` / ${record.entity_id.slice(0, 8)}` : ''}</Text>
          : <Text type="secondary">\u2014</Text>
      ),
    },
    {
      title: 'IP',
      dataIndex: 'ip_address',
      key: 'ip_address',
      width: 130,
      render: (ip: string | null) => ip || <Text type="secondary">\u2014</Text>,
    },
  ];

  const tabItems = [
    {
      key: 'academic-years',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CalendarOutlined /> Academic Years
        </span>
      ),
      children: (
        <Spin spinning={ayLoading}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title level={5} style={{ margin: 0 }}>Academic Years</Title>
            <Space>
              <Button icon={<ReloadOutlined />} size="small" onClick={fetchAcademicYears} />
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAddAy}>
                Add Year
              </Button>
            </Space>
          </div>
          {academicYears.length > 0 ? (
            <Table dataSource={academicYears} columns={ayColumns} rowKey="id" size="small" pagination={false} />
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No academic years configured" style={{ padding: '40px 0' }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddAy}>Add First Year</Button>
            </Empty>
          )}
        </Spin>
      ),
    },
    {
      key: 'settings',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SettingOutlined /> Settings
        </span>
      ),
      children: (
        <Spin spinning={settingsLoading}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title level={5} style={{ margin: 0 }}>System Settings</Title>
            <Space>
              <Button icon={<ReloadOutlined />} size="small" onClick={fetchSettings} />
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAddSetting}>
                Add Setting
              </Button>
            </Space>
          </div>
          {settings.length > 0 ? (
            <Table dataSource={settings} columns={settingsColumns} rowKey="key" size="small" pagination={false} />
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No settings configured" style={{ padding: '40px 0' }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddSetting}>Add First Setting</Button>
            </Empty>
          )}
        </Spin>
      ),
    },
    {
      key: 'activity',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <HistoryOutlined /> Activity Logs
        </span>
      ),
      children: (
        <Spin spinning={logsLoading}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title level={5} style={{ margin: 0 }}>Activity Logs</Title>
            <Button icon={<ReloadOutlined />} size="small" onClick={fetchLogs} />
          </div>
          <Space style={{ marginBottom: 16, width: '100%' }} wrap>
            <Input.Search
              placeholder="Filter by action..."
              style={{ width: 250 }}
              onSearch={setLogsActionFilter}
              allowClear
            />
          </Space>
          <Table
            dataSource={logs}
            columns={logsColumns}
            rowKey="id"
            size="small"
            pagination={{
              current: logsPage,
              pageSize: 50,
              total: logsTotal,
              showTotal: (total) => `${total} entries`,
              onChange: setLogsPage,
            }}
          />
        </Spin>
      ),
    },
    {
      key: 'backup',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CloudUploadOutlined /> Backup
        </span>
      ),
      children: (
        <div>
          <Title level={5} style={{ color: token.colorText, marginBottom: 24 }}>
            System Backup
          </Title>
          <Card size="small" style={{ borderRadius: 12, background: token.colorBgSpotlight, marginBottom: 16 }}>
            <Space direction="vertical" size="small">
              <Text strong>Database Backup</Text>
              <Text style={{ color: token.colorTextSecondary, fontSize: 13 }}>
                Create a full backup of the PostgreSQL database. The backup will be available for download.
              </Text>
              <Button
                icon={<CloudUploadOutlined />}
                style={{ borderRadius: 10, marginTop: 8 }}
                onClick={() => message.info('Backup functionality requires pg_dump access on the server. Configure via environment variables.')}
              >
                Create Backup Now
              </Button>
            </Space>
          </Card>
          <Text style={{ color: token.colorTextSecondary, fontSize: 13 }}>
            Backups are stored securely and can be downloaded at any time. Configure automated backups via the server cron schedule.
          </Text>
        </div>
      ),
    },
    {
      key: 'theme',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BgColorsOutlined /> Theme
        </span>
      ),
      children: (
        <div>
          <Title level={5} style={{ color: token.colorText, marginBottom: 24 }}>
            Theme Customization
          </Title>
          <Card size="small" style={{ borderRadius: 12, background: token.colorBgSpotlight, marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>Dark Mode</Text>
            <Text style={{ color: token.colorTextSecondary, fontSize: 12, display: 'block', marginBottom: 12 }}>
              Toggle between light and dark themes using the switch in the header.
            </Text>
          </Card>
          <Card size="small" style={{ borderRadius: 12, background: token.colorBgSpotlight }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>Primary Color</Text>
            <Text style={{ color: token.colorTextSecondary, fontSize: 12, display: 'block', marginBottom: 12 }}>
              Customize the primary brand color through the theme settings in the application header.
            </Text>
          </Card>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <Title level={3} style={{ marginBottom: 4, color: token.colorText, fontWeight: 700 }}>
          System Settings
        </Title>
        <Text style={{ color: token.colorTextSecondary }}>
          Configure your observatory preferences and system options.
        </Text>
      </div>

      <Card
        style={{ ...cardStyle }}
        styles={{ body: { padding: '8px 24px 24px' } }}
      >
        <Tabs
          tabPosition="left"
          style={{ minHeight: 500 }}
          tabBarStyle={{ width: 200, marginRight: 24 }}
          items={tabItems}
        />
      </Card>

      <Modal
        title={editingAy ? 'Edit Academic Year' : 'Add Academic Year'}
        open={ayModalOpen}
        onCancel={() => { setAyModalOpen(false); ayForm.resetFields(); }}
        onOk={handleSaveAy}
        okText={editingAy ? 'Update' : 'Create'}
        width={480}
        destroyOnClose
      >
        <Form form={ayForm} layout="vertical">
          <Form.Item name="year" label="Year Label" rules={[{ required: true, message: 'Year is required' }]}>
            <Input placeholder="e.g. 2025-2026" maxLength={9} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="startDate" label="Start Date" rules={[{ required: true, message: 'Required' }]}>
                <Input type="date" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endDate" label="End Date" rules={[{ required: true, message: 'Required' }]}>
                <Input type="date" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="isCurrent" label="Set as Current" valuePropName="checked">
            <Select
              placeholder="Set as current?"
              options={[
                { value: true, label: 'Yes - this is the current academic year' },
                { value: false, label: 'No' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingSetting ? 'Edit Setting' : 'Add Setting'}
        open={settingModalOpen}
        onCancel={() => { setSettingModalOpen(false); settingForm.resetFields(); }}
        onOk={handleSaveSetting}
        okText={editingSetting ? 'Update' : 'Create'}
        width={560}
        destroyOnClose
      >
        <Form form={settingForm} layout="vertical">
          <Form.Item name="key" label="Setting Key" rules={[{ required: true, message: 'Key is required' }]}>
            <Input placeholder="e.g. default_language" disabled={!!editingSetting} />
          </Form.Item>
          <Form.Item name="value" label="Value (JSON or string)" rules={[{ required: true, message: 'Value is required' }]}>
            <TextArea rows={4} placeholder='e.g. "fr" or {"tableId": "uuid"}' />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
