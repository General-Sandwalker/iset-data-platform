import { useState } from 'react';
import {
  Table,
  Tag,
  Button,
  Popconfirm,
  message,
  Typography,
  Card,
  Space,
  theme,
  Modal,
  Tooltip,
} from 'antd';
import {
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { TableProps } from 'antd';
import { importApi, type ImportListItem, type ImportDetail, type ImportStatus } from '../../core/api/import';

const { Text } = Typography;

const statusColors: Record<ImportStatus, string> = {
  pending: 'default',
  processing: 'processing',
  completed: 'success',
  failed: 'error',
};

const statusLabels: Record<ImportStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImportHistory() {
  const { token } = theme.useToken();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [detailModal, setDetailModal] = useState<ImportDetail | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['imports', page, limit],
    queryFn: () => importApi.list(page, limit),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => importApi.delete(id),
    onSuccess: () => {
      message.success('Import deleted');
      queryClient.invalidateQueries({ queryKey: ['imports'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.error?.message || 'Delete failed');
    },
  });

  const handleViewDetail = async (id: string) => {
    try {
      const result = await importApi.get(id);
      if (result.success && result.data) {
        setDetailModal(result.data);
      }
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || 'Failed to load details');
    }
  };

  const handleDownloadErrors = (imp: ImportDetail) => {
    const errors = (imp.errors as { row: number; error: string }[]) || [];
    if (errors.length === 0) {
      message.info('No errors to download');
      return;
    }
    const csvContent = [
      'Row,Error',
      ...errors.map((e) => `${e.row},"${e.error.replace(/"/g, '""')}"`),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `import_errors_${imp.id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const imports: ImportListItem[] = (data?.data as ImportListItem[]) || [];
  const meta = data?.meta || { total: 0, page: 1, limit: 20 };

  const columns: TableProps<ImportListItem>['columns'] = [
    {
      title: 'File',
      key: 'file',
      render: (_: unknown, record: ImportListItem) => (
        <div>
          <Text strong>{record.filename}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.fileType.toUpperCase()} · {formatFileSize(record.fileSize)}
          </Text>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: ImportStatus) => (
        <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>
      ),
    },
    {
      title: 'Rows',
      key: 'rows',
      width: 140,
      render: (_: unknown, record: ImportListItem) => (
        <div>
          <Text>{record.totalRows ?? '-'}</Text>
          {record.importedRows > 0 && (
            <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
              {record.importedRows} imported
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Errors',
      dataIndex: 'errorCount',
      key: 'errorCount',
      width: 80,
      render: (count: number) => (
        count > 0 ? <Tag color="error">{count}</Tag> : <Text type="secondary">0</Text>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (date: string) => new Date(date).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: ImportListItem) => (
        <Space size="small">
          <Tooltip title="View details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handleViewDetail(record.id)}
            />
          </Tooltip>
          {record.errorCount > 0 && (
            <Tooltip title="Download errors">
              <Button
                type="text"
                icon={<DownloadOutlined />}
                size="small"
                onClick={() => {
                  importApi.get(record.id).then((result) => {
                    if (result.success && result.data) {
                      handleDownloadErrors(result.data);
                    }
                  });
                }}
              />
            </Tooltip>
          )}
          <Popconfirm
            title="Delete this import record?"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text type="secondary">{meta.total} import(s) total</Text>
        <Button icon={<ReloadOutlined />} size="small" onClick={() => refetch()}>
          Refresh
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={imports}
        rowKey="id"
        loading={isLoading}
        size="small"
        pagination={{
          current: page,
          pageSize: limit,
          total: meta.total,
          showSizeChanger: true,
          showTotal: (total) => `${total} imports`,
          onChange: (p, l) => {
            setPage(p);
            setLimit(l);
          },
        }}
      />

      <Modal
        title="Import Details"
        open={!!detailModal}
        onCancel={() => setDetailModal(null)}
        footer={detailModal?.errorCount && detailModal.errorCount > 0 ? (
          <Space>
            <Button onClick={() => setDetailModal(null)}>Close</Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => detailModal && handleDownloadErrors(detailModal)}
            >
              Download Errors
            </Button>
          </Space>
        ) : null}
        width={600}
      >
        {detailModal && (
          <div>
            <Card size="small" style={{ marginBottom: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div><Text type="secondary">Filename:</Text> {detailModal.filename}</div>
                <div><Text type="secondary">Type:</Text> {detailModal.fileType.toUpperCase()}</div>
                <div><Text type="secondary">Status:</Text> <Tag color={statusColors[detailModal.status as ImportStatus]}>{statusLabels[detailModal.status as ImportStatus]}</Tag></div>
                <div><Text type="secondary">Size:</Text> {formatFileSize(detailModal.fileSize)}</div>
                <div><Text type="secondary">Total Rows:</Text> {detailModal.totalRows ?? '-'}</div>
                <div><Text type="secondary">Imported:</Text> {detailModal.importedRows}</div>
                <div><Text type="secondary">Errors:</Text> {detailModal.errorCount}</div>
                <div><Text type="secondary">Date:</Text> {new Date(detailModal.createdAt).toLocaleString('fr-FR')}</div>
              </div>
            </Card>
            {detailModal.columns && detailModal.columns.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary">Columns: </Text>
                {detailModal.columns.map((col, i) => (
                  <Tag key={i} style={{ marginBottom: 4 }}>{String(col)}</Tag>
                ))}
              </div>
            )}
            {detailModal.errorCount > 0 && (detailModal.errors as { row: number; error: string }[])?.length > 0 && (
              <div>
                <Text type="secondary">Errors (first 10):</Text>
                <div style={{ marginTop: 8, maxHeight: 200, overflow: 'auto' }}>
                  {(detailModal.errors as { row: number; error: string }[]).slice(0, 10).map((e, i) => (
                    <div key={i} style={{ marginBottom: 4 }}>
                      <Tag color="error">Row {e.row}</Tag>
                      <Text style={{ fontSize: 12 }}>{e.error}</Text>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
