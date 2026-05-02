import { useState, useCallback, useEffect } from 'react';
import {
  Card, Typography, Table, Button, Space, Tag, Empty, Modal, Form, Input,
  Select, Switch, Spin, message, theme, Popconfirm, Tooltip, Drawer, Tabs,
  Descriptions, Timeline, Row, Col,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, EditOutlined, SearchOutlined,
  SolutionOutlined, HistoryOutlined, EyeOutlined, ReloadOutlined,
} from '@ant-design/icons';
import {
  partnershipsApi, type Company, type Offer, type Collaboration,
} from '../core/api/partnerships';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function PartnershipsPage() {
  const { token } = theme.useToken();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyForm] = Form.useForm();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyOffers, setCompanyOffers] = useState<Offer[]>([]);
  const [companyCollabs, setCompanyCollabs] = useState<Collaboration[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [offerForm] = Form.useForm();

  const [collabModalOpen, setCollabModalOpen] = useState(false);
  const [editingCollab, setEditingCollab] = useState<Collaboration | null>(null);
  const [collabForm] = Form.useForm();

  const [offersTabFilter, setOffersTabFilter] = useState<string>('');

  const cardStyle = { borderRadius: 16, border: `1px solid ${token.colorBorderSecondary}` };

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (sectorFilter) params.sector = sectorFilter;
      if (statusFilter === 'active') params.isActive = true;
      else if (statusFilter === 'inactive') params.isActive = false;
      const res = await partnershipsApi.listCompanies(params);
      if (res.success && res.data) setCompanies(res.data);
    } catch {
      message.error('Failed to load companies');
    } finally {
      setLoading(false);
    }
  }, [search, sectorFilter, statusFilter]);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  const sectors = [...new Set(companies.map((c) => c.sector).filter(Boolean))] as string[];

  const openDrawer = async (company: Company) => {
    setSelectedCompany(company);
    setDrawerOpen(true);
    setDrawerLoading(true);
    try {
      const [offersRes, collabsRes] = await Promise.all([
        partnershipsApi.listOffers({ companyId: company.id }),
        partnershipsApi.listCollaborations({ companyId: company.id }),
      ]);
      if (offersRes.success && offersRes.data) setCompanyOffers(offersRes.data);
      if (collabsRes.success && collabsRes.data) setCompanyCollabs(collabsRes.data);
    } catch {
      message.error('Failed to load company details');
    } finally {
      setDrawerLoading(false);
    }
  };

  const refreshDrawer = async () => {
    if (!selectedCompany) return;
    try {
      const [offersRes, collabsRes] = await Promise.all([
        partnershipsApi.listOffers({ companyId: selectedCompany.id }),
        partnershipsApi.listCollaborations({ companyId: selectedCompany.id }),
      ]);
      if (offersRes.success && offersRes.data) setCompanyOffers(offersRes.data);
      if (collabsRes.success && collabsRes.data) setCompanyCollabs(collabsRes.data);
    } catch { /* ignore */ }
  };

  const handleAddCompany = () => {
    setEditingCompany(null);
    companyForm.resetFields();
    setCompanyModalOpen(true);
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    companyForm.setFieldsValue({
      name: company.name,
      sector: company.sector || undefined,
      address: company.address || undefined,
      contactName: company.contact_name || undefined,
      contactEmail: company.contact_email || undefined,
      contactPhone: company.contact_phone || undefined,
      partnershipStartDate: company.partnership_start_date || undefined,
      isActive: company.is_active,
    });
    setCompanyModalOpen(true);
  };

  const handleSaveCompany = async () => {
    try {
      const values = await companyForm.validateFields();
      const payload: any = {
        name: values.name,
        sector: values.sector || undefined,
        address: values.address || undefined,
        contactName: values.contactName || undefined,
        contactEmail: values.contactEmail || undefined,
        contactPhone: values.contactPhone || undefined,
        partnershipStartDate: values.partnershipStartDate || undefined,
        isActive: values.isActive,
      };
      if (editingCompany) {
        const res = await partnershipsApi.updateCompany(editingCompany.id, payload);
        if (res.success) {
          message.success('Company updated');
          setCompanyModalOpen(false);
          fetchCompanies();
          if (selectedCompany?.id === editingCompany.id) {
            setSelectedCompany(res.data || null);
          }
        }
      } else {
        const res = await partnershipsApi.createCompany(payload);
        if (res.success) {
          message.success('Company created');
          setCompanyModalOpen(false);
          fetchCompanies();
        }
      }
    } catch (err: any) {
      if (err?.response?.data?.error?.message) message.error(err.response.data.error.message);
      else if (!err?.errorFields) message.error('Failed to save company');
    }
  };

  const handleDeleteCompany = async (id: string) => {
    try {
      const res = await partnershipsApi.deleteCompany(id);
      if (res.success) {
        message.success('Company deleted');
        fetchCompanies();
        if (selectedCompany?.id === id) setDrawerOpen(false);
      }
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || 'Failed to delete company');
    }
  };

  const handleToggleCompany = async (company: Company) => {
    try {
      const res = await partnershipsApi.updateCompany(company.id, { isActive: !company.is_active });
      if (res.success) {
        message.success(company.is_active ? 'Company deactivated' : 'Company activated');
        fetchCompanies();
        if (selectedCompany?.id === company.id) setSelectedCompany(res.data || null);
      }
    } catch {
      message.error('Failed to toggle company status');
    }
  };

  const handleAddOffer = () => {
    setEditingOffer(null);
    offerForm.resetFields();
    if (selectedCompany) offerForm.setFieldsValue({ companyId: selectedCompany.id });
    setOfferModalOpen(true);
  };

  const handleEditOffer = (offer: Offer) => {
    setEditingOffer(offer);
    offerForm.setFieldsValue({
      companyId: offer.company_id,
      type: offer.type,
      title: offer.title,
      description: offer.description || undefined,
      requirements: offer.requirements || undefined,
      publishDate: offer.publish_date || undefined,
      expiryDate: offer.expiry_date || undefined,
      isActive: offer.is_active,
    });
    setOfferModalOpen(true);
  };

  const handleSaveOffer = async () => {
    try {
      const values = await offerForm.validateFields();
      const payload: any = {
        companyId: values.companyId,
        type: values.type,
        title: values.title,
        description: values.description || undefined,
        requirements: values.requirements || undefined,
        publishDate: values.publishDate || undefined,
        expiryDate: values.expiryDate || undefined,
        isActive: values.isActive,
      };
      if (editingOffer) {
        const res = await partnershipsApi.updateOffer(editingOffer.id, payload);
        if (res.success) { message.success('Offer updated'); setOfferModalOpen(false); refreshDrawer(); }
      } else {
        const res = await partnershipsApi.createOffer(payload);
        if (res.success) { message.success('Offer created'); setOfferModalOpen(false); refreshDrawer(); }
      }
    } catch (err: any) {
      if (err?.response?.data?.error?.message) message.error(err.response.data.error.message);
      else if (!err?.errorFields) message.error('Failed to save offer');
    }
  };

  const handleToggleOffer = async (offer: Offer) => {
    try {
      const res = await partnershipsApi.updateOffer(offer.id, { isActive: !offer.is_active });
      if (res.success) {
        message.success(offer.is_active ? 'Offer deactivated' : 'Offer activated');
        refreshDrawer();
      }
    } catch {
      message.error('Failed to toggle offer status');
    }
  };

  const handleDeleteOffer = async (id: string) => {
    try {
      const res = await partnershipsApi.deleteOffer(id);
      if (res.success) { message.success('Offer deleted'); refreshDrawer(); }
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || 'Failed to delete offer');
    }
  };

  const handleAddCollab = () => {
    setEditingCollab(null);
    collabForm.resetFields();
    if (selectedCompany) collabForm.setFieldsValue({ companyId: selectedCompany.id });
    setCollabModalOpen(true);
  };

  const handleEditCollab = (collab: Collaboration) => {
    setEditingCollab(collab);
    collabForm.setFieldsValue({
      companyId: collab.company_id,
      type: collab.type,
      description: collab.description || undefined,
      date: collab.date || undefined,
      academicYear: collab.academic_year || undefined,
    });
    setCollabModalOpen(true);
  };

  const handleSaveCollab = async () => {
    try {
      const values = await collabForm.validateFields();
      const payload: any = {
        companyId: values.companyId,
        type: values.type,
        description: values.description || undefined,
        date: values.date || undefined,
        academicYear: values.academicYear || undefined,
      };
      if (editingCollab) {
        const res = await partnershipsApi.updateCollaboration(editingCollab.id, payload);
        if (res.success) { message.success('Collaboration updated'); setCollabModalOpen(false); refreshDrawer(); }
      } else {
        const res = await partnershipsApi.createCollaboration(payload);
        if (res.success) { message.success('Collaboration created'); setCollabModalOpen(false); refreshDrawer(); }
      }
    } catch (err: any) {
      if (err?.response?.data?.error?.message) message.error(err.response.data.error.message);
      else if (!err?.errorFields) message.error('Failed to save collaboration');
    }
  };

  const handleDeleteCollab = async (id: string) => {
    try {
      const res = await partnershipsApi.deleteCollaboration(id);
      if (res.success) { message.success('Collaboration deleted'); refreshDrawer(); }
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || 'Failed to delete collaboration');
    }
  };

  const companyColumns = [
    {
      title: 'Company',
      key: 'name',
      render: (_: unknown, record: Company) => (
        <div>
          <Text strong>{record.name}</Text>
          {record.sector && (
            <Text style={{ display: 'block', fontSize: 12, color: token.colorTextTertiary }}>
              {record.sector}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (_: unknown, record: Company) => (
        <div>
          {record.contact_name && <Text style={{ display: 'block' }}>{record.contact_name}</Text>}
          {record.contact_email && (
            <Text style={{ display: 'block', fontSize: 12, color: token.colorTextSecondary }}>
              {record.contact_email}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'status',
      width: 100,
      render: (active: boolean, record: Company) => (
        <Switch
          size="small"
          checked={active}
          onChange={() => handleToggleCompany(record)}
          checkedChildren="Active"
          unCheckedChildren="Inactive"
        />
      ),
    },
    {
      title: 'Partnership Since',
      dataIndex: 'partnership_start_date',
      key: 'partnership_start_date',
      width: 140,
      render: (d: string | null) => d ? new Date(d).toLocaleDateString() : <Text type="secondary">&mdash;</Text>,
    },
    {
      title: '',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: Company) => (
        <Space size="small" onClick={(e) => e.stopPropagation()}>
          <Tooltip title="View Details">
            <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => openDrawer(record)} />
          </Tooltip>
          <Tooltip title="Edit">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEditCompany(record)} />
          </Tooltip>
          <Popconfirm title="Delete this company?" onConfirm={() => handleDeleteCompany(record.id)} okButtonProps={{ danger: true }}>
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const offerColumns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (t: string) => <Text strong>{t}</Text>,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => (
        <Tag color={type === 'stage' ? 'blue' : 'green'}>{type === 'stage' ? 'Internship' : 'Job'}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'status',
      width: 100,
      render: (active: boolean, record: Offer) => (
        <Switch
          size="small"
          checked={active}
          onChange={() => handleToggleOffer(record)}
          checkedChildren="Active"
          unCheckedChildren="Inactive"
        />
      ),
    },
    {
      title: 'Expires',
      dataIndex: 'expiry_date',
      key: 'expiry_date',
      width: 120,
      render: (d: string | null) => d ? new Date(d).toLocaleDateString() : <Text type="secondary">&mdash;</Text>,
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_: unknown, record: Offer) => (
        <Space size="small">
          <Tooltip title="Edit">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEditOffer(record)} />
          </Tooltip>
          <Popconfirm title="Delete this offer?" onConfirm={() => handleDeleteOffer(record.id)} okButtonProps={{ danger: true }}>
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const filteredOffers = companyOffers.filter((o) => {
    if (offersTabFilter === 'stage') return o.type === 'stage';
    if (offersTabFilter === 'emploi') return o.type === 'emploi';
    if (offersTabFilter === 'active') return o.is_active;
    if (offersTabFilter === 'inactive') return !o.is_active;
    return true;
  });

  const drawerTabs = [
    {
      key: 'info',
      label: 'Company Info',
      icon: <SolutionOutlined />,
      children: selectedCompany ? (
        <Spin spinning={drawerLoading}>
          <Descriptions bordered column={2} size="small" style={{ marginBottom: 24 }}>
            <Descriptions.Item label="Name" span={2}>{selectedCompany.name}</Descriptions.Item>
            <Descriptions.Item label="Sector">{selectedCompany.sector || '\u2014'}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={selectedCompany.is_active ? 'green' : 'red'}>
                {selectedCompany.is_active ? 'Active' : 'Inactive'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Address" span={2}>{selectedCompany.address || '\u2014'}</Descriptions.Item>
            <Descriptions.Item label="Contact Name">{selectedCompany.contact_name || '\u2014'}</Descriptions.Item>
            <Descriptions.Item label="Contact Email">{selectedCompany.contact_email || '\u2014'}</Descriptions.Item>
            <Descriptions.Item label="Contact Phone">{selectedCompany.contact_phone || '\u2014'}</Descriptions.Item>
            <Descriptions.Item label="Partnership Since">
              {selectedCompany.partnership_start_date
                ? new Date(selectedCompany.partnership_start_date).toLocaleDateString()
                : '\u2014'}
            </Descriptions.Item>
            <Descriptions.Item label="Created">
              {new Date(selectedCompany.created_at).toLocaleDateString()}
            </Descriptions.Item>
            <Descriptions.Item label="Updated">
              {new Date(selectedCompany.updated_at).toLocaleDateString()}
            </Descriptions.Item>
          </Descriptions>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title level={5} style={{ margin: 0 }}>Offers ({companyOffers.length})</Title>
            <Space>
              <Select
                placeholder="Filter offers"
                allowClear
                style={{ width: 140 }}
                value={offersTabFilter || undefined}
                onChange={(v) => setOffersTabFilter(v || '')}
                options={[
                  { value: 'stage', label: 'Internships' },
                  { value: 'emploi', label: 'Jobs' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAddOffer}>
                Add Offer
              </Button>
            </Space>
          </div>
          {filteredOffers.length > 0 ? (
            <Table
              dataSource={filteredOffers}
              columns={offerColumns}
              rowKey="id"
              size="small"
              pagination={false}
            />
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No offers" style={{ padding: '24px 0' }}>
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAddOffer}>
                Add First Offer
              </Button>
            </Empty>
          )}
        </Spin>
      ) : null,
    },
    {
      key: 'collaborations',
      label: 'Collaborations',
      icon: <HistoryOutlined />,
      children: (
        <Spin spinning={drawerLoading}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title level={5} style={{ margin: 0 }}>Collaboration History ({companyCollabs.length})</Title>
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAddCollab}>
              Add Collaboration
            </Button>
          </div>
          {companyCollabs.length > 0 ? (
            <Timeline
              items={companyCollabs.map((c) => ({
                color: 'blue',
                children: (
                  <Card
                    size="small"
                    style={{
                      borderRadius: 10,
                      border: `1px solid ${token.colorBorderSecondary}`,
                      marginBottom: 4,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <Text strong style={{ color: token.colorPrimary }}>{c.type}</Text>
                        {c.academic_year && (
                          <Tag style={{ marginLeft: 8 }}>{c.academic_year}</Tag>
                        )}
                        {c.description && (
                          <Text style={{ display: 'block', marginTop: 4, color: token.colorTextSecondary }}>
                            {c.description}
                          </Text>
                        )}
                        {c.date && (
                          <Text style={{ display: 'block', marginTop: 4, fontSize: 12, color: token.colorTextTertiary }}>
                            {new Date(c.date).toLocaleDateString()}
                          </Text>
                        )}
                      </div>
                      <Space size="small">
                        <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEditCollab(c)} />
                        <Popconfirm title="Delete this collaboration?" onConfirm={() => handleDeleteCollab(c.id)} okButtonProps={{ danger: true }}>
                          <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </Space>
                    </div>
                  </Card>
                ),
              }))}
            />
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No collaborations recorded" style={{ padding: '24px 0' }}>
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAddCollab}>
                Add First Collaboration
              </Button>
            </Empty>
          )}
        </Spin>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ marginBottom: 4, color: token.colorText, fontWeight: 700 }}>
            Partnerships
          </Title>
          <Text style={{ color: token.colorTextSecondary }}>
            Manage company partnerships, offers, and collaborations.
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchCompanies} />
          <Button type="primary" icon={<PlusOutlined />} style={{ borderRadius: 10 }} onClick={handleAddCompany}>
            Add Company
          </Button>
        </Space>
      </div>

      <Card style={cardStyle}>
        <Space style={{ marginBottom: 16, width: '100%' }} wrap>
          <Input.Search
            placeholder="Search companies..."
            prefix={<SearchOutlined />}
            style={{ width: 280 }}
            onSearch={setSearch}
            allowClear
          />
          <Select
            placeholder="Filter by sector"
            allowClear
            style={{ width: 200 }}
            onChange={setSectorFilter}
            value={sectorFilter || undefined}
            options={sectors.map((s) => ({ value: s, label: s }))}
          />
          <Select
            placeholder="Filter by status"
            allowClear
            style={{ width: 150 }}
            onChange={setStatusFilter}
            value={statusFilter || undefined}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        </Space>

        {companies.length === 0 && !loading ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <Text style={{ color: token.colorTextSecondary, display: 'block', marginBottom: 8 }}>
                  No partnerships registered
                </Text>
                <Text style={{ color: token.colorTextTertiary, fontSize: 12 }}>
                  Add companies to start managing partnerships and offers
                </Text>
              </div>
            }
            style={{ padding: '60px 0' }}
          >
            <Button type="primary" icon={<PlusOutlined />} style={{ marginTop: 16, borderRadius: 10 }} onClick={handleAddCompany}>
              Add First Company
            </Button>
          </Empty>
        ) : (
          <Table
            dataSource={companies}
            columns={companyColumns}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10, showTotal: (total) => `${total} companies` }}
            onRow={(record) => ({
              onClick: () => openDrawer(record),
              style: { cursor: 'pointer' },
            })}
          />
        )}
      </Card>

      <Drawer
        title={selectedCompany ? selectedCompany.name : 'Company Details'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={720}
        extra={
          selectedCompany ? (
            <Space>
              <Button icon={<EditOutlined />} onClick={() => handleEditCompany(selectedCompany)}>
                Edit
              </Button>
              <Popconfirm title="Delete this company?" onConfirm={() => handleDeleteCompany(selectedCompany.id)} okButtonProps={{ danger: true }}>
                <Button danger icon={<DeleteOutlined />}>Delete</Button>
              </Popconfirm>
            </Space>
          ) : null
        }
      >
        <Tabs items={drawerTabs} />
      </Drawer>

      <Modal
        title={editingCompany ? 'Edit Company' : 'Add Company'}
        open={companyModalOpen}
        onCancel={() => { setCompanyModalOpen(false); companyForm.resetFields(); }}
        onOk={handleSaveCompany}
        okText={editingCompany ? 'Update' : 'Create'}
        width={600}
        destroyOnClose
      >
        <Form form={companyForm} layout="vertical" initialValues={{ isActive: true }}>
          <Form.Item name="name" label="Company Name" rules={[{ required: true, message: 'Name is required' }]}>
            <Input placeholder="e.g. Tunisie Telecom" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="sector" label="Sector">
                <Input placeholder="e.g. Telecommunications" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="partnershipStartDate" label="Partnership Start Date">
                <Input type="date" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="address" label="Address">
            <Input placeholder="Company address" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="contactName" label="Contact Name">
                <Input placeholder="Contact person" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="contactEmail" label="Contact Email">
                <Input type="email" placeholder="email@company.com" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="contactPhone" label="Contact Phone">
                <Input placeholder="+216 XX XXX XXX" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="isActive" label="Active" valuePropName="checked">
                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title={editingOffer ? 'Edit Offer' : 'Add Offer'}
        open={offerModalOpen}
        onCancel={() => { setOfferModalOpen(false); offerForm.resetFields(); }}
        onOk={handleSaveOffer}
        okText={editingOffer ? 'Update' : 'Create'}
        width={600}
        destroyOnClose
      >
        <Form form={offerForm} layout="vertical" initialValues={{ isActive: true }}>
          <Form.Item name="companyId" label="Company" rules={[{ required: true, message: 'Company is required' }]}>
            <Select
              showSearch
              placeholder="Select company"
              optionFilterProp="label"
              options={companies.map((c) => ({ value: c.id, label: c.name }))}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="type" label="Type" rules={[{ required: true, message: 'Type is required' }]}>
                <Select
                  placeholder="Select type"
                  options={[
                    { value: 'stage', label: 'Internship (Stage)' },
                    { value: 'emploi', label: 'Job (Emploi)' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Title is required' }]}>
                <Input placeholder="e.g. Software Engineering Intern" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Description">
            <TextArea rows={3} placeholder="Offer description" />
          </Form.Item>
          <Form.Item name="requirements" label="Requirements">
            <TextArea rows={3} placeholder="Required qualifications" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="publishDate" label="Publish Date">
                <Input type="date" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="expiryDate" label="Expiry Date">
                <Input type="date" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="isActive" label="Active" valuePropName="checked">
                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title={editingCollab ? 'Edit Collaboration' : 'Add Collaboration'}
        open={collabModalOpen}
        onCancel={() => { setCollabModalOpen(false); collabForm.resetFields(); }}
        onOk={handleSaveCollab}
        okText={editingCollab ? 'Update' : 'Create'}
        width={560}
        destroyOnClose
      >
        <Form form={collabForm} layout="vertical">
          <Form.Item name="companyId" label="Company" rules={[{ required: true, message: 'Company is required' }]}>
            <Select
              showSearch
              placeholder="Select company"
              optionFilterProp="label"
              options={companies.map((c) => ({ value: c.id, label: c.name }))}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="type" label="Collaboration Type" rules={[{ required: true, message: 'Type is required' }]}>
                <Input placeholder="e.g. MOU, Workshop, Guest Lecture" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="academicYear" label="Academic Year">
                <Input placeholder="e.g. 2025-2026" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Description">
            <TextArea rows={3} placeholder="Collaboration details" />
          </Form.Item>
          <Form.Item name="date" label="Date">
            <Input type="date" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
