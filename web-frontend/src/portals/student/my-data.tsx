import { useState, useEffect, useCallback } from 'react';
import { Card, Typography, Table, Spin, Empty, Tag, theme, Collapse, Row, Col, Statistic } from 'antd';
import { DatabaseOutlined } from '@ant-design/icons';
import { schemaApi, type DataRecord } from '../../core/api/schema';

const { Title, Text } = Typography;

interface MyRecordsData {
  cin: string;
  tablesCount: number;
  records: Record<string, DataRecord[]>;
}

export default function StudentMyDataPage() {
  const { token } = theme.useToken();
  const [data, setData] = useState<MyRecordsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const res = await schemaApi.getMyRecords();
      if (res.success && res.data) setData(res.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const tableNames = data ? Object.keys(data.records) : [];
  const totalRecords = data ? Object.values(data.records).reduce((sum, rows) => sum + rows.length, 0) : 0;

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <Title level={3} style={{ marginBottom: 4, color: token.colorText, fontWeight: 700 }}>My Data</Title>
        <Text style={{ color: token.colorTextSecondary }}>
          {data?.cin ? `CIN: ${data.cin}` : 'Records linked to your account'}
        </Text>
      </div>

      <Spin spinning={loading}>
        {!loading && totalRecords === 0 ? (
          <Empty description="No records found linked to your account" style={{ padding: 60 }} />
        ) : (
          <>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={12} sm={8}>
                <Card style={{ borderRadius: 12, border: `1px solid ${token.colorBorderSecondary}` }}>
                  <Statistic
                    title="Tables"
                    value={data?.tablesCount ?? 0}
                    prefix={<DatabaseOutlined style={{ color: token.colorPrimary }} />}
                    valueStyle={{ fontWeight: 700 }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={8}>
                <Card style={{ borderRadius: 12, border: `1px solid ${token.colorBorderSecondary}` }}>
                  <Statistic
                    title="Total Records"
                    value={totalRecords}
                    valueStyle={{ fontWeight: 700 }}
                  />
                </Card>
              </Col>
            </Row>

            {tableNames.length > 0 && (
              <Collapse
                defaultActiveKey={tableNames[0]}
                items={tableNames.map((tableName) => {
                  const rows = data!.records[tableName];
                  const columns = rows.length > 0
                    ? Object.keys(rows[0]).map((key) => ({
                        title: key,
                        dataIndex: key,
                        key,
                        ellipsis: true,
                        render: (val: unknown) => {
                          if (val === null || val === undefined) return <Text type="secondary">—</Text>;
                          if (typeof val === 'boolean') return <Tag color={val ? 'green' : 'red'}>{val ? 'Yes' : 'No'}</Tag>;
                          if (typeof val === 'object') return <Text code>{JSON.stringify(val)}</Text>;
                          return String(val);
                        },
                      }))
                    : [];
                  return {
                    key: tableName,
                    label: (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <DatabaseOutlined style={{ color: token.colorPrimary }} />
                        <Text strong>{tableName}</Text>
                        <Tag>{rows.length} record{rows.length !== 1 ? 's' : ''}</Tag>
                      </div>
                    ),
                    children: (
                      <Table
                        dataSource={rows}
                        columns={columns}
                        rowKey={(row) => (row as any).id || JSON.stringify(row)}
                        pagination={rows.length > 10 ? { pageSize: 10 } : false}
                        size="small"
                        scroll={{ x: true }}
                      />
                    ),
                  };
                })}
              />
            )}
          </>
        )}
      </Spin>
    </div>
  );
}
