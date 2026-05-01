import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, Typography, Row, Col, Spin, message, theme, Empty, Tag, Breadcrumb, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { apiClient, type ApiResponse } from '../core/api/client';
import type { Dashboard, DashboardChart, ChartDataResult, ChartType } from '../core/api/viz';

const { Title, Text } = Typography;

const CHART_TYPE_LABELS: Record<ChartType, string> = {
  bar: '📊 Bar', horizontal_bar: '📊 H-Bar', line: '📈 Line', area: '📈 Area',
  pie: '🥧 Pie', donut: '🍩 Donut', scatter: '⚬ Scatter', radar: '🕸️ Radar',
  metric: '🔢 Metric', table: '📋 Table',
};

function PublicChartPreview({ chart, data }: { chart: DashboardChart; data: ChartDataResult | null }) {
  const { token } = theme.useToken();
  if (!chart.chart) return null;
  const chartType = chart.chart.chart_type;

  if (!data || data.rows.length === 0) {
    return <div style={{ textAlign: 'center', padding: 20, color: token.colorTextTertiary }}>No data available</div>;
  }

  if (chartType === 'metric') {
    const value = data.rows[0]?.value ?? data.rows[0]?.count ?? 0;
    return (
      <div style={{ textAlign: 'center', padding: 24 }}>
        <div style={{ fontSize: 42, fontWeight: 700, color: token.colorPrimary }}>{Number(value).toLocaleString()}</div>
        <Text type="secondary" style={{ fontSize: 14, marginTop: 8, display: 'block' }}>{chart.chart.title}</Text>
      </div>
    );
  }

  if (chartType === 'table') {
    const cols = Object.keys(data.rows[0]);
    return (
      <div style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead><tr>{cols.map(c => <th key={c} style={{ padding: '6px 10px', borderBottom: `2px solid ${token.colorBorderSecondary}`, textAlign: 'left', color: token.colorTextSecondary }}>{c}</th>)}</tr></thead>
          <tbody>{data.rows.slice(0, 20).map((row, i) => <tr key={i}>{cols.map(c => <td key={c} style={{ padding: '6px 10px', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>{String(row[c] ?? '')}</td>)}</tr>)}</tbody>
        </table>
        {data.totalCount > 20 && <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>+{data.totalCount - 20} more rows</Text>}
      </div>
    );
  }

  const maxVal = Math.max(...data.rows.map(r => Number(r.value || 0)), 1);
  return (
    <div style={{ padding: '8px 0' }}>
      {data.rows.slice(0, 12).map((row, i) => {
        const label = String(row.label || '');
        const value = Number(row.value || 0);
        const pct = (value / maxVal) * 100;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Text style={{ width: 100, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={label}>{label}</Text>
            <div style={{ flex: 1, height: 20, background: token.colorBgContainer, borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: `hsl(${(i * 30) % 360}, 60%, 55%)`, borderRadius: 6, transition: 'width 0.3s' }} />
            </div>
            <Text style={{ fontSize: 13, width: 60, textAlign: 'right', fontWeight: 500 }}>{value.toLocaleString()}</Text>
          </div>
        );
      })}
      {data.totalCount > 12 && <Text type="secondary" style={{ fontSize: 12 }}>+{data.totalCount - 12} more</Text>}
    </div>
  );
}

export default function PublicDashboardPage() {
  const { slug } = useParams<{ slug: string }>();
  const { token } = theme.useToken();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [chartData, setChartData] = useState<Record<string, ChartDataResult>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const res = await apiClient.get<ApiResponse<Dashboard>>(`/public/dashboards/${slug}`);
        if (res.data.success && res.data.data) {
          setDashboard(res.data.data);
          const dataMap: Record<string, ChartDataResult> = {};
          const charts = (res.data.data as any).charts || [];
          for (const dc of charts) {
            if (dc.data) dataMap[dc.chart_id] = dc.data;
          }
          setChartData(dataMap);
        }
      } catch { message.error('Dashboard not found'); }
      finally { setLoading(false); }
    })();
  }, [slug]);

  if (loading) return <div style={{ padding: 60, textAlign: 'center' }}><Spin size="large" /></div>;
  if (!dashboard) return <div style={{ padding: 60 }}><Empty description="Dashboard not found" /></div>;

  const dbCharts = (dashboard as any).charts || [];

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <Breadcrumb
        style={{ marginBottom: 20 }}
        items={[
          { title: <Link to="/">Home</Link> },
          { title: 'Dashboard' },
          { title: dashboard.title },
        ]}
      />

      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ marginBottom: 4 }}>{dashboard.title}</Title>
        {dashboard.description && <Text style={{ color: token.colorTextSecondary, fontSize: 16 }}>{dashboard.description}</Text>}
      </div>
      <Row gutter={[16, 16]}>
        {dbCharts.map((dc: DashboardChart) => {
          if (!dc.chart) return null;
          return (
            <Col key={dc.id} span={dc.width >= 8 ? 24 : dc.width >= 6 ? 12 : 8}>
              <Card
                size="small"
                title={
                  <Space>
                    <Tag>{CHART_TYPE_LABELS[dc.chart.chart_type] || dc.chart.chart_type}</Tag>
                    <Text strong>{dc.chart.title}</Text>
                  </Space>
                }
                style={{ borderRadius: 12, border: `1px solid ${token.colorBorderSecondary}` }}
              >
                <PublicChartPreview chart={dc} data={chartData[dc.chart_id] || null} />
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
}

function Space({ children }: { children: React.ReactNode }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>{children}</span>;
}
