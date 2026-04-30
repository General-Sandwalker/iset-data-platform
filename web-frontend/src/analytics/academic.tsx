import { useState, useCallback, useEffect } from 'react';
import {
  Card, Typography, theme, Row, Col, Select, Spin, Statistic, Space, Tag, Table, message, Empty,
} from 'antd';
import {
  TeamOutlined, UserOutlined, TrophyOutlined, BookOutlined,
  CalendarOutlined, FallOutlined, RiseOutlined,
} from '@ant-design/icons';
import { Bar, Line, Pie } from '@ant-design/charts';
import { analyticsApi } from '../core/api/analytics';
import { useAuthStore } from '../core/stores/auth.store';

const { Title, Text } = Typography;

interface FilterState {
  annee?: string;
  filiere?: string;
  niveau?: string;
  genre?: string;
}

export default function AcademicAnalyticsPage() {
  const { token } = theme.useToken();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  const [filters, setFilters] = useState<FilterState>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [enrollments, setEnrollments] = useState<any>(null);
  const [successRates, setSuccessRates] = useState<any>(null);
  const [teacherStats, setTeacherStats] = useState<any>(null);
  const [formationStats, setFormationStats] = useState<any>(null);
  const [eventStats, setEventStats] = useState<any>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [enrollRes, successRes, teacherRes, formationRes, eventRes] = await Promise.allSettled([
        analyticsApi.getEnrollmentsSummary(filters),
        analyticsApi.getSuccessRates(filters),
        analyticsApi.getTeacherStats({ annee: filters.annee, genre: filters.genre }),
        analyticsApi.getFormationStats({ annee: filters.annee }),
        analyticsApi.getEventStats({ annee: filters.annee }),
      ]);

      if (enrollRes.status === 'fulfilled' && enrollRes.value.success) setEnrollments(enrollRes.value.data);
      if (successRes.status === 'fulfilled' && successRes.value.success) setSuccessRates(successRes.value.data);
      if (teacherRes.status === 'fulfilled' && teacherRes.value.success) setTeacherStats(teacherRes.value.data);
      if (formationRes.status === 'fulfilled' && formationRes.value.success) setFormationStats(formationRes.value.data);
      if (eventRes.status === 'fulfilled' && eventRes.value.success) setEventStats(eventRes.value.data);

      const rejected = [enrollRes, successRes, teacherRes, formationRes, eventRes].find(
        (r) => r.status === 'rejected'
      );
      if (rejected && rejected.status === 'rejected') {
        const rej = rejected as PromiseRejectedResult;
        const err: any = rej.reason;
        if (err?.response?.data?.error?.code === 'ANALYTICS_NOT_CONFIGURED') {
          setError(err.response.data.error.message);
        }
      }
    } catch {
      message.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateFilter = (key: keyof FilterState, value: string | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  };

  const barConfig = {
    xField: 'filiere',
    yField: 'effectif',
    colorField: 'filiere',
    label: { text: (d: any) => d.effectif, position: 'outside' as const },
    style: { borderRadius: 6 },
  };

  const successPieData = successRates
    ? Object.entries(successRates.statusCounts || {}).map(([statut, count]: [string, any]) => ({
        statut,
        count: parseInt(count),
      }))
    : [];

  const successRateValues = successRates
    ? Object.entries(successRates.rates || {}).map(([statut, rate]: [string, any]) => ({
        statut,
        rate: parseFloat(rate),
      }))
    : [];

  const teacherEvolutionData = teacherStats
    ? (teacherStats.evolution || []).map((r: any) => ({
        year: r.annee_universitaire,
        genre: r.genre,
        count: parseInt(r.count),
      }))
    : [];

  const formationStackedData = formationStats
    ? (formationStats.byYear || []).map((r: any) => ({
        year: r.annee_universitaire,
        type: r.type_formation || 'Unknown',
        count: parseInt(r.count),
      }))
    : [];

  const eventData = eventStats
    ? (eventStats.byType || []).map((r: any) => ({
        type: r.type_evenement,
        count: parseInt(r.count),
      }))
    : [];

  const eventTableData = eventStats
    ? (eventStats.participationStats || []).map((r: any, i: number) => ({
        key: i,
        type: r.type_evenement,
        totalParticipants: r.total_participants,
        avgParticipants: r.avg_participants,
      }))
    : [];

  const cardStyle = {
    borderRadius: 16,
    border: `1px solid ${token.colorBorderSecondary}`,
  };

  if (error) {
    return (
      <div>
        <div style={{ marginBottom: 28 }}>
          <Title level={3} style={{ marginBottom: 4, color: token.colorText, fontWeight: 700 }}>
            Academic Analytics
          </Title>
          <Text style={{ color: token.colorTextSecondary }}>
            Visualize enrollments, success rates, and academic performance.
          </Text>
        </div>
        <Card style={cardStyle}>
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Text type="danger" style={{ fontSize: 16 }}>{error}</Text>
            <br />
            <Text style={{ color: token.colorTextSecondary, marginTop: 8, display: 'inline-block' }}>
              Please configure the analytics table mappings in Settings to enable this dashboard.
            </Text>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <Title level={3} style={{ marginBottom: 4, color: token.colorText, fontWeight: 700 }}>
          Academic Analytics
        </Title>
        <Text style={{ color: token.colorTextSecondary }}>
          Visualize enrollments, success rates, and academic performance.
        </Text>
      </div>

      <Card style={{ ...cardStyle, marginBottom: 20 }}>
        <Row gutter={[16, 12]} align="middle">
          <Col>
            <Space>
              <CalendarOutlined style={{ color: token.colorPrimary }} />
              <Text strong>Filters:</Text>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={6} lg={5}>
            <Select
              placeholder="Academic Year"
              allowClear
              style={{ width: '100%' }}
              onChange={(v) => updateFilter('annee', v)}
              value={filters.annee}
              options={[
                { value: '2025-2026', label: '2025-2026' },
                { value: '2024-2025', label: '2024-2025' },
                { value: '2023-2024', label: '2023-2024' },
                { value: '2022-2023', label: '2022-2023' },
                { value: '2021-2022', label: '2021-2022' },
              ]}
            />
          </Col>
          <Col xs={24} sm={12} md={6} lg={5}>
            <Select
              placeholder="Filiere"
              allowClear
              style={{ width: '100%' }}
              onChange={(v) => updateFilter('filiere', v)}
              value={filters.filiere}
              options={enrollments?.byFiliere?.map((r: any) => ({ value: r.filiere, label: r.filiere })) || []}
            />
          </Col>
          <Col xs={24} sm={12} md={6} lg={5}>
            <Select
              placeholder="Niveau"
              allowClear
              style={{ width: '100%' }}
              onChange={(v) => updateFilter('niveau', v)}
              value={filters.niveau}
              options={[
                { value: 'L1', label: 'L1' },
                { value: 'L2', label: 'L2' },
                { value: 'L3', label: 'L3' },
                { value: 'M1', label: 'M1' },
                { value: 'M2', label: 'M2' },
              ]}
            />
          </Col>
          <Col xs={24} sm={12} md={6} lg={5}>
            <Select
              placeholder="Genre"
              allowClear
              style={{ width: '100%' }}
              onChange={(v) => updateFilter('genre', v)}
              value={filters.genre}
              options={[
                { value: 'M', label: 'Male' },
                { value: 'F', label: 'Female' },
              ]}
            />
          </Col>
        </Row>
      </Card>

      <Spin spinning={loading}>
        <Row gutter={[20, 20]} style={{ marginBottom: 20 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card style={cardStyle} styles={{ body: { padding: '20px 24px' } }}>
              <Statistic
                title="Total Students"
                value={enrollments?.total || 0}
                prefix={<TeamOutlined style={{ color: token.colorPrimary }} />}
                valueStyle={{ color: token.colorText, fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card style={cardStyle} styles={{ body: { padding: '20px 24px' } }}>
              <Statistic
                title="Success Rate"
                value={successRateValues.find((r) => r.statut.toLowerCase().includes('reuss') || r.statut.toLowerCase() === 'success')?.rate || 0}
                suffix="%"
                prefix={<TrophyOutlined style={{ color: '#10b981' }} />}
                valueStyle={{ color: '#10b981', fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card style={cardStyle} styles={{ body: { padding: '20px 24px' } }}>
              <Statistic
                title="Total Teachers"
                value={teacherStats?.total || 0}
                prefix={<UserOutlined style={{ color: '#f59e0b' }} />}
                valueStyle={{ color: token.colorText, fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card style={cardStyle} styles={{ body: { padding: '20px 24px' } }}>
              <Statistic
                title="Total Events"
                value={eventStats?.total || 0}
                prefix={<CalendarOutlined style={{ color: '#6366f1' }} />}
                valueStyle={{ color: token.colorText, fontWeight: 700 }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[20, 20]} style={{ marginBottom: 20 }}>
          <Col xs={24} lg={14}>
            <Card
              title={<Space><BarChartIcon color={token.colorPrimary} /> Enrollments by Filiere</Space>}
              style={cardStyle}
            >
              {enrollments?.byFiliere?.length > 0 ? (
                <Bar
                  data={enrollments.byFiliere.map((r: any) => ({
                    filiere: r.filiere,
                    effectif: parseInt(r.effectif),
                  }))}
                  {...barConfig}
                  height={300}
                />
              ) : (
                <Empty description="No enrollment data available" />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card
              title={<Space><PieChartIcon color={token.colorPrimary} /> Success / Failure Rates</Space>}
              style={cardStyle}
            >
              {successPieData.length > 0 ? (
                <Pie
                  data={successPieData}
                  angleField="count"
                  colorField="statut"
                  innerRadius={0.5}
                  label={{
                    text: (d: any) => `${d.statut}: ${d.count}`,
                    position: 'outside' as const,
                  }}
                  legend={{ color: { position: 'bottom' as const } }}
                  height={300}
                />
              ) : (
                <Empty description="No success rate data available" />
              )}
            </Card>
          </Col>
        </Row>

        <Row gutter={[20, 20]} style={{ marginBottom: 20 }}>
          <Col xs={24} lg={14}>
            <Card
              title={<Space><LineChartIcon color={token.colorPrimary} /> Student Evolution by Gender</Space>}
              style={cardStyle}
            >
              {enrollments?.byYear?.length > 0 ? (
                <Line
                  data={enrollments.byYear.map((r: any) => ({
                    year: r.annee_universitaire,
                    effectif: parseInt(r.effectif),
                  }))}
                  xField="year"
                  yField="effectif"
                  smooth
                  point={{ shapeField: 'square' as const, sizeField: 4 }}
                  height={300}
                />
              ) : (
                <Empty description="No evolution data available" />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card
              title={<Space><LineChartIcon color={token.colorPrimary} /> Teacher Evolution</Space>}
              style={cardStyle}
            >
              {teacherEvolutionData.length > 0 ? (
                <Line
                  data={teacherEvolutionData}
                  xField="year"
                  yField="count"
                  colorField="genre"
                  smooth
                  group
                  height={300}
                />
              ) : (
                <Empty description="No teacher evolution data available" />
              )}
            </Card>
          </Col>
        </Row>

        <Row gutter={[20, 20]} style={{ marginBottom: 20 }}>
          <Col xs={24} lg={14}>
            <Card
              title={<Space><BarChartIcon color={token.colorPrimary} /> Formations (Certifiant vs Non-Certifiant)</Space>}
              style={cardStyle}
            >
              {formationStackedData.length > 0 ? (
                <Bar
                  data={formationStackedData}
                  xField="year"
                  yField="count"
                  colorField="type"
                  stack
                  group
                  style={{ maxWidth: 40, borderRadius: 4 }}
                  height={300}
                />
              ) : (
                <Empty description="No formation data available" />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card
              title={<Space><BookOutlined style={{ color: token.colorPrimary }} /> Teacher Distribution</Space>}
              style={cardStyle}
            >
              {teacherStats?.bySpecialty?.length > 0 ? (
                <Bar
                  data={teacherStats.bySpecialty.map((r: any) => ({
                    specialite: r.specialite,
                    count: parseInt(r.count),
                  }))}
                  xField="count"
                  yField="specialite"
                  colorField="specialite"
                  style={{ borderRadius: 4 }}
                  height={300}
                />
              ) : (
                <Empty description="No teacher specialty data available" />
              )}
            </Card>
          </Col>
        </Row>

        <Row gutter={[20, 20]} style={{ marginBottom: 20 }}>
          <Col xs={24} lg={10}>
            <Card
              title={<Space><BarChartIcon color={token.colorPrimary} /> Events by Type</Space>}
              style={cardStyle}
            >
              {eventData.length > 0 ? (
                <Bar
                  data={eventData}
                  xField="type"
                  yField="count"
                  colorField="type"
                  style={{ borderRadius: 6 }}
                  label={{ text: (d: any) => d.count, position: 'outside' as const }}
                  height={250}
                />
              ) : (
                <Empty description="No event data available" />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={14}>
            <Card
              title={<Space><CalendarOutlined style={{ color: token.colorPrimary }} /> Event Participation Statistics</Space>}
              style={cardStyle}
            >
              {eventTableData.length > 0 ? (
                <Table
                  dataSource={eventTableData}
                  pagination={false}
                  size="small"
                  columns={[
                    { title: 'Event Type', dataIndex: 'type', key: 'type' },
                    { title: 'Total Participants', dataIndex: 'totalParticipants', key: 'totalParticipants', align: 'right' as const },
                    { title: 'Avg Participants', dataIndex: 'avgParticipants', key: 'avgParticipants', align: 'right' as const },
                  ]}
                />
              ) : (
                <Empty description="No event participation data available" />
              )}
            </Card>
          </Col>
        </Row>

        {successRates?.byFiliere?.length > 0 && (
          <Card
            title={<Space><TrophyOutlined style={{ color: token.colorPrimary }} /> Success Rates by Filiere</Space>}
            style={cardStyle}
          >
            <Row gutter={[20, 20]}>
              {successRates.byFiliere.reduce((acc: any[], curr: any) => {
                const existing = acc.find((a: any) => a.filiere === curr.filiere);
                if (existing) {
                  existing.statuses[curr.statut] = parseInt(curr.count);
                } else {
                  acc.push({ filiere: curr.filiere, statuses: { [curr.statut]: parseInt(curr.count) } });
                }
                return acc;
              }, []).map((item: any) => {
                const total = Object.values(item.statuses as Record<string, unknown>).reduce((s: number, c: unknown) => s + Number(c), 0) as number;
                return (
                  <Col xs={24} sm={12} md={8} lg={6} key={item.filiere}>
                    <Card size="small" style={{ borderRadius: 12, background: token.colorBgSpotlight }}>
                      <Text strong style={{ display: 'block', marginBottom: 8 }}>{item.filiere}</Text>
                      <Text style={{ color: token.colorTextSecondary, fontSize: 12 }}>Total: {total}</Text>
                      <div style={{ marginTop: 8 }}>
                        {Object.entries(item.statuses).map(([status, count]: [string, any]) => (
                          <Tag key={status} color={getStatusColor(status)} style={{ marginBottom: 4 }}>
                            {status}: {Number(count)} ({total > 0 ? ((Number(count) / total) * 100).toFixed(1) : 0}%)
                          </Tag>
                        ))}
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </Card>
        )}
      </Spin>
    </div>
  );
}

function BarChartIcon({ color }: { color: string }) {
  return <RiseOutlined style={{ color }} />;
}

function LineChartIcon({ color }: { color: string }) {
  return <FallOutlined style={{ color, transform: 'scaleX(-1)' }} />;
}

function PieChartIcon({ color }: { color: string }) {
  return <BookOutlined style={{ color }} />;
}

function getStatusColor(status: string): string {
  const s = status.toLowerCase();
  if (s.includes('reuss') || s === 'success' || s.includes('pass')) return 'green';
  if (s.includes('echec') || s === 'failure' || s.includes('fail')) return 'red';
  if (s.includes('abandon') || s === 'dropout') return 'orange';
  if (s.includes('diplom') || s === 'graduated') return 'blue';
  return 'default';
}
