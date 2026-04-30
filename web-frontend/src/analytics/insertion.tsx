import { useState, useCallback, useEffect } from 'react';
import {
  Card, Typography, theme, Row, Col, Select, Spin, Statistic, Space, Tag, message, Empty,
} from 'antd';
import {
  TeamOutlined, CheckCircleOutlined, ClockCircleOutlined,
  FallOutlined, RiseOutlined, BookOutlined,
} from '@ant-design/icons';
import { Bar, Line, Pie } from '@ant-design/charts';
import { analyticsApi } from '../core/api/analytics';

const { Title, Text } = Typography;

interface FilterState {
  promotion?: string;
  filiere?: string;
  anneeDebut?: string;
  anneeFin?: string;
}

export default function InsertionAnalyticsPage() {
  const { token } = theme.useToken();

  const [filters, setFilters] = useState<FilterState>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [insertionRates, setInsertionRates] = useState<any>(null);
  const [insertionDelays, setInsertionDelays] = useState<any>(null);
  const [insertionSectors, setInsertionSectors] = useState<any>(null);
  const [insertionContracts, setInsertionContracts] = useState<any>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ratesRes, delaysRes, sectorsRes, contractsRes] = await Promise.allSettled([
        analyticsApi.getInsertionRates(filters),
        analyticsApi.getInsertionDelays(filters),
        analyticsApi.getInsertionSectors(filters),
        analyticsApi.getInsertionContracts(filters),
      ]);

      if (ratesRes.status === 'fulfilled' && ratesRes.value.success) setInsertionRates(ratesRes.value.data);
      if (delaysRes.status === 'fulfilled' && delaysRes.value.success) setInsertionDelays(delaysRes.value.data);
      if (sectorsRes.status === 'fulfilled' && sectorsRes.value.success) setInsertionSectors(sectorsRes.value.data);
      if (contractsRes.status === 'fulfilled' && contractsRes.value.success) setInsertionContracts(contractsRes.value.data);

      const rejected = [ratesRes, delaysRes, sectorsRes, contractsRes].find(
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
      message.error('Failed to load insertion analytics data');
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

  const ratesByPromotionData = insertionRates
    ? (insertionRates.byPromotion || []).flatMap((r: any) => [
        { promotion: r.promotion, metric: '6 months', rate: r.rate_6m },
        { promotion: r.promotion, metric: '12 months', rate: r.rate_12m },
      ])
    : [];

  const ratesByFiliereData = insertionRates
    ? (insertionRates.byFiliere || []).flatMap((r: any) => [
        { filiere: r.filiere, metric: '6 months', rate: r.rate_6m },
        { filiere: r.filiere, metric: '12 months', rate: r.rate_12m },
      ])
    : [];

  const ratesByYearData = insertionRates
    ? (insertionRates.byYear || []).flatMap((r: any) => [
        { year: r.annee_universitaire, metric: '6 months', rate: r.rate_6m },
        { year: r.annee_universitaire, metric: '12 months', rate: r.rate_12m },
      ])
    : [];

  const delayDistributionData = insertionDelays
    ? (insertionDelays.distribution || []).map((r: any) => ({
        delai: r.delai,
        count: r.count,
      }))
    : [];

  const delayByFiliereData = insertionDelays
    ? (insertionDelays.byFiliere || []).map((r: any) => ({
        filiere: r.filiere,
        avgDelay: r.avgDelay,
        minDelay: r.minDelay,
        maxDelay: r.maxDelay,
        count: r.count,
      }))
    : [];

  const sectorPieData = insertionSectors
    ? (insertionSectors.bySector || []).map((r: any) => ({
        secteur: r.secteur,
        count: r.count,
      }))
    : [];

  const sectorByFiliereData = insertionSectors
    ? (insertionSectors.byFiliere || []).map((r: any) => ({
        filiere: r.filiere,
        secteur: r.secteur,
        count: r.count,
      }))
    : [];

  const contractPieData = insertionContracts
    ? (insertionContracts.byContract || []).map((r: any) => ({
      typeContrat: r.typeContrat,
      count: r.count,
    }))
    : [];

  const contractByFiliereData = insertionContracts
    ? (insertionContracts.byFiliere || []).map((r: any) => ({
        filiere: r.filiere,
        typeContrat: r.typeContrat,
        count: r.count,
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
            Insertion Analytics
          </Title>
          <Text style={{ color: token.colorTextSecondary }}>
            Track professional insertion rates and career outcomes.
          </Text>
        </div>
        <Card style={cardStyle}>
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Text type="danger" style={{ fontSize: 16 }}>{error}</Text>
            <br />
            <Text style={{ color: token.colorTextSecondary, marginTop: 8, display: 'inline-block' }}>
              Please configure the analytics alumni table mapping in Settings to enable this dashboard.
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
          Insertion Analytics
        </Title>
        <Text style={{ color: token.colorTextSecondary }}>
          Track professional insertion rates and career outcomes.
        </Text>
      </div>

      <Card style={{ ...cardStyle, marginBottom: 20 }}>
        <Row gutter={[16, 12]} align="middle">
          <Col>
            <Space>
              <ClockCircleOutlined style={{ color: token.colorPrimary }} />
              <Text strong>Filters:</Text>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={6} lg={5}>
            <Select
              placeholder="Promotion"
              allowClear
              style={{ width: '100%' }}
              onChange={(v) => updateFilter('promotion', v)}
              value={filters.promotion}
              options={insertionRates?.byPromotion?.map((r: any) => ({ value: r.promotion, label: r.promotion })) || []}
            />
          </Col>
          <Col xs={24} sm={12} md={6} lg={5}>
            <Select
              placeholder="Filiere"
              allowClear
              style={{ width: '100%' }}
              onChange={(v) => updateFilter('filiere', v)}
              value={filters.filiere}
              options={insertionRates?.byFiliere?.map((r: any) => ({ value: r.filiere, label: r.filiere })) || []}
            />
          </Col>
          <Col xs={24} sm={12} md={6} lg={5}>
            <Select
              placeholder="Year From"
              allowClear
              style={{ width: '100%' }}
              onChange={(v) => updateFilter('anneeDebut', v)}
              value={filters.anneeDebut}
              options={[
                { value: '2020', label: '2020' },
                { value: '2021', label: '2021' },
                { value: '2022', label: '2022' },
                { value: '2023', label: '2023' },
                { value: '2024', label: '2024' },
                { value: '2025', label: '2025' },
              ]}
            />
          </Col>
          <Col xs={24} sm={12} md={6} lg={5}>
            <Select
              placeholder="Year To"
              allowClear
              style={{ width: '100%' }}
              onChange={(v) => updateFilter('anneeFin', v)}
              value={filters.anneeFin}
              options={[
                { value: '2020', label: '2020' },
                { value: '2021', label: '2021' },
                { value: '2022', label: '2022' },
                { value: '2023', label: '2023' },
                { value: '2024', label: '2024' },
                { value: '2025', label: '2025' },
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
                title="Total Alumni"
                value={insertionRates?.total || 0}
                prefix={<TeamOutlined style={{ color: token.colorPrimary }} />}
                valueStyle={{ color: token.colorText, fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card style={cardStyle} styles={{ body: { padding: '20px 24px' } }}>
              <Statistic
                title="Insertion Rate (6m)"
                value={insertionRates?.rate6m || 0}
                suffix="%"
                prefix={<CheckCircleOutlined style={{ color: '#10b981' }} />}
                valueStyle={{ color: '#10b981', fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card style={cardStyle} styles={{ body: { padding: '20px 24px' } }}>
              <Statistic
                title="Insertion Rate (12m)"
                value={insertionRates?.rate12m || 0}
                suffix="%"
                prefix={<CheckCircleOutlined style={{ color: '#3b82f6' }} />}
                valueStyle={{ color: '#3b82f6', fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card style={cardStyle} styles={{ body: { padding: '20px 24px' } }}>
              <Statistic
                title="Avg Employment Delay"
                value={insertionDelays?.overall?.avgDelay ?? '-'}
                suffix={insertionDelays?.overall?.avgDelay != null ? ' months' : ''}
                prefix={<ClockCircleOutlined style={{ color: '#f59e0b' }} />}
                valueStyle={{ color: '#f59e0b', fontWeight: 700 }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[20, 20]} style={{ marginBottom: 20 }}>
          <Col xs={24} lg={14}>
            <Card
              title={<Space><BarChartIcon color={token.colorPrimary} /> Insertion Rates by Promotion</Space>}
              style={cardStyle}
            >
              {ratesByPromotionData.length > 0 ? (
                <Bar
                  data={ratesByPromotionData}
                  xField="promotion"
                  yField="rate"
                  colorField="metric"
                  group
                  style={{ maxWidth: 40, borderRadius: 4 }}
                  axis={{ y: { title: 'Rate (%)' } }}
                  height={300}
                />
              ) : (
                <Empty description="No insertion rate data available" />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card
              title={<Space><PieChartIcon color={token.colorPrimary} /> Activity Sectors</Space>}
              style={cardStyle}
            >
              {sectorPieData.length > 0 ? (
                <Pie
                  data={sectorPieData}
                  angleField="count"
                  colorField="secteur"
                  innerRadius={0.5}
                  label={{
                    text: (d: any) => `${d.secteur}: ${d.count}`,
                    position: 'outside' as const,
                  }}
                  legend={{ color: { position: 'bottom' as const } }}
                  height={300}
                />
              ) : (
                <Empty description="No sector data available" />
              )}
            </Card>
          </Col>
        </Row>

        <Row gutter={[20, 20]} style={{ marginBottom: 20 }}>
          <Col xs={24} lg={14}>
            <Card
              title={<Space><LineChartIcon color={token.colorPrimary} /> Insertion Rate Trends</Space>}
              style={cardStyle}
            >
              {ratesByYearData.length > 0 ? (
                <Line
                  data={ratesByYearData}
                  xField="year"
                  yField="rate"
                  colorField="metric"
                  smooth
                  point={{ shapeField: 'square' as const, sizeField: 4 }}
                  axis={{ y: { title: 'Rate (%)' } }}
                  height={300}
                />
              ) : (
                <Empty description="No trend data available" />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card
              title={<Space><PieChartIcon color={token.colorPrimary} /> Contract Types</Space>}
              style={cardStyle}
            >
              {contractPieData.length > 0 ? (
                <Pie
                  data={contractPieData}
                  angleField="count"
                  colorField="typeContrat"
                  innerRadius={0.6}
                  label={{
                    text: (d: any) => `${d.typeContrat}: ${d.count}`,
                    position: 'outside' as const,
                  }}
                  legend={{ color: { position: 'bottom' as const } }}
                  height={300}
                />
              ) : (
                <Empty description="No contract data available" />
              )}
            </Card>
          </Col>
        </Row>

        <Row gutter={[20, 20]} style={{ marginBottom: 20 }}>
          <Col xs={24} lg={14}>
            <Card
              title={<Space><BarChartIcon color={token.colorPrimary} /> Employment Delay Distribution</Space>}
              style={cardStyle}
            >
              {delayDistributionData.length > 0 ? (
                <Bar
                  data={delayDistributionData}
                  xField="delai"
                  yField="count"
                  colorField="delai"
                  style={{ borderRadius: 4 }}
                  axis={{ x: { title: 'Delay (months)' }, y: { title: 'Alumni Count' } }}
                  label={{ text: (d: any) => d.count, position: 'outside' as const }}
                  height={300}
                />
              ) : (
                <Empty description="No delay distribution data available" />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card
              title={<Space><BarChartIcon color={token.colorPrimary} /> Avg Delay by Filiere</Space>}
              style={cardStyle}
            >
              {delayByFiliereData.length > 0 ? (
                <Bar
                  data={delayByFiliereData.filter((r: any) => r.avgDelay != null)}
                  xField="avgDelay"
                  yField="filiere"
                  colorField="filiere"
                  style={{ borderRadius: 4 }}
                  axis={{ x: { title: 'Avg Delay (months)' } }}
                  height={300}
                />
              ) : (
                <Empty description="No delay by filiere data available" />
              )}
            </Card>
          </Col>
        </Row>

        <Row gutter={[20, 20]} style={{ marginBottom: 20 }}>
          <Col xs={24} lg={14}>
            <Card
              title={<Space><BarChartIcon color={token.colorPrimary} /> Insertion Rates by Filiere</Space>}
              style={cardStyle}
            >
              {ratesByFiliereData.length > 0 ? (
                <Bar
                  data={ratesByFiliereData}
                  xField="filiere"
                  yField="rate"
                  colorField="metric"
                  group
                  style={{ maxWidth: 40, borderRadius: 4 }}
                  axis={{ y: { title: 'Rate (%)' } }}
                  height={300}
                />
              ) : (
                <Empty description="No filiere rate data available" />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card
              title={<Space><BookOutlined style={{ color: token.colorPrimary }} /> Sectors by Filiere</Space>}
              style={cardStyle}
            >
              {sectorByFiliereData.length > 0 ? (
                <Bar
                  data={sectorByFiliereData}
                  xField="filiere"
                  yField="count"
                  colorField="secteur"
                  stack
                  style={{ borderRadius: 4 }}
                  height={300}
                />
              ) : (
                <Empty description="No sector by filiere data available" />
              )}
            </Card>
          </Col>
        </Row>

        {insertionContracts?.byFiliere?.length > 0 && (
          <Card
            title={<Space><BookOutlined style={{ color: token.colorPrimary }} /> Contract Types by Filiere</Space>}
            style={cardStyle}
          >
            <Row gutter={[20, 20]}>
              {contractByFiliereData.reduce((acc: any[], curr: any) => {
                const existing = acc.find((a: any) => a.filiere === curr.filiere);
                if (existing) {
                  existing.contracts[curr.typeContrat] = curr.count;
                } else {
                  acc.push({ filiere: curr.filiere, contracts: { [curr.typeContrat]: curr.count } });
                }
                return acc;
              }, []).map((item: any) => {
                const total = Object.values(item.contracts as Record<string, unknown>).reduce((s: number, c: unknown) => s + Number(c), 0) as number;
                return (
                  <Col xs={24} sm={12} md={8} lg={6} key={item.filiere}>
                    <Card size="small" style={{ borderRadius: 12, background: token.colorBgSpotlight }}>
                      <Text strong style={{ display: 'block', marginBottom: 8 }}>{item.filiere}</Text>
                      <Text style={{ color: token.colorTextSecondary, fontSize: 12 }}>Total: {total}</Text>
                      <div style={{ marginTop: 8 }}>
                        {Object.entries(item.contracts).map(([contractType, count]: [string, any]) => (
                          <Tag key={contractType} color={getContractColor(contractType)} style={{ marginBottom: 4 }}>
                            {contractType}: {Number(count)} ({total > 0 ? ((Number(count) / total) * 100).toFixed(1) : 0}%)
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

function getContractColor(contract: string): string {
  const c = contract.toLowerCase();
  if (c.includes('cdi') || c.includes('permanent')) return 'green';
  if (c.includes('cdd') || c.includes('temporary') || c.includes('contract')) return 'blue';
  if (c.includes('stage') || c.includes('intern')) return 'orange';
  if (c.includes('interim') || c.includes('freelance') || c.includes('independant')) return 'purple';
  return 'default';
}
