import { useState, useCallback } from 'react';
import {
  Typography,
  Steps,
  Button,
  Space,
  Upload,
  Table,
  Select,
  Alert,
  Progress,
  Tag,
  Card,
  Spin,
  Result,
  Input,
  Switch,
  message,
  theme,
  Tooltip,
  Radio,
} from 'antd';
import {
  InboxOutlined,
  UploadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  DeleteOutlined,
  DatabaseOutlined,
  PlusOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { importApi, type ColumnMapping, type TransformType, type UploadResult, type PreviewResult, type ExecuteResult } from '../../core/api/import';
import { schemaApi, type DynamicTable, type DynamicField } from '../../core/api/schema';
import AiSuggestionModal from './AiSuggestionModal';
import type { TableSuggestion } from '../../core/api/ai';

const { Title, Text } = Typography;
const { Dragger } = Upload;

interface ImportWizardProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

const TRANSFORM_OPTIONS: { value: TransformType; label: string }[] = [
  { value: 'uppercase', label: 'UPPERCASE' },
  { value: 'lowercase', label: 'lowercase' },
  { value: 'trim', label: 'Trim spaces' },
  { value: 'date_iso', label: 'Date → ISO (YYYY-MM-DD)' },
  { value: 'date_fr', label: 'Date → FR (DD/MM/YYYY)' },
  { value: 'number', label: 'Cast to Number' },
  { value: 'boolean', label: 'Cast to Boolean' },
];

export default function ImportWizard({ onComplete, onCancel }: ImportWizardProps) {
  const { token } = theme.useToken();
  const [step, setStep] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [targetFields, setTargetFields] = useState<DynamicField[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [executeResult, setExecuteResult] = useState<ExecuteResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [importMode, setImportMode] = useState<'existing' | 'new'>('existing');

  const [newTableName, setNewTableName] = useState('');
  const [newTableDisplayName, setNewTableDisplayName] = useState('');
  const [newTableDescription, setNewTableDescription] = useState('');
  const [newTableIsUserLinked, setNewTableIsUserLinked] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiFields, setAiFields] = useState<Map<string, { fieldType: string; displayName: string; isRequired: boolean; configJson?: Record<string, unknown> }>>(new Map());

  const { data: tablesData } = useQuery({
    queryKey: ['schema-tables'],
    queryFn: () => schemaApi.listTables(),
  });

  const tables: DynamicTable[] = (tablesData?.data as DynamicTable[]) || [];

  const fetchFieldsForTable = useCallback(async (tableId: string) => {
    const result = await schemaApi.getTable(tableId);
    if (result.success && result.data) {
      const fields = (result.data as DynamicTable).fields || [];
      setTargetFields(fields);
      return fields;
    }
    return [];
  }, []);

  const handleUpload = async (file: File) => {
    try {
      const result = await importApi.upload(file);
      if (result.success && result.data) {
        setUploadResult(result.data);
        const initialMappings: ColumnMapping[] = result.data.columns.map((col) => ({
          sourceColumn: col,
          targetField: '',
          transform: undefined,
        }));
        setMappings(initialMappings);
        setStep(1);
        message.success(`File uploaded: ${result.data.totalRows} rows detected`);
      }
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || 'Upload failed');
    }
    return false;
  };

  const handleSelectTable = async (tableId: string) => {
    setSelectedTableId(tableId);
    await fetchFieldsForTable(tableId);
  };

  const handleMappingChange = (sourceColumn: string, field: 'targetField' | 'transform', value: string | undefined) => {
    setMappings((prev) =>
      prev.map((m) => (m.sourceColumn === sourceColumn ? { ...m, [field]: value || undefined } : m))
    );
  };

  const autoMatchFields = () => {
    setMappings((prev) =>
      prev.map((m) => {
        if (m.targetField) return m;
        const normalizedName = m.sourceColumn.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        const matchedField = targetFields.find(
          (f) => f.name === normalizedName || f.display_name.toLowerCase() === m.sourceColumn.toLowerCase()
        );
        return matchedField ? { ...m, targetField: matchedField.name } : m;
      })
    );
    message.info('Auto-matched columns by name');
  };

  const handlePreview = async () => {
    const validMappings = mappings.filter((m) => m.targetField);
    if (validMappings.length === 0) {
      message.warning('Please map at least one column');
      return;
    }
    if (importMode === 'existing') {
      if (!selectedTableId) {
        message.warning('Please select a target table');
        return;
      }
      setIsPreviewLoading(true);
      try {
        const result = await importApi.preview(uploadResult!.id, selectedTableId, validMappings);
        if (result.success && result.data) {
          setPreviewResult(result.data);
          setStep(3);
        }
      } catch (err: any) {
        message.error(err?.response?.data?.error?.message || 'Preview failed');
      } finally {
        setIsPreviewLoading(false);
      }
    } else {
      if (!newTableName) {
        message.warning('Please enter a table name');
        return;
      }
      setIsPreviewLoading(true);
      try {
        const result = await importApi.previewNewTable(uploadResult!.id, validMappings);
        if (result.success && result.data) {
          setPreviewResult(result.data);
          setStep(3);
        }
      } catch (err: any) {
        message.error(err?.response?.data?.error?.message || 'Preview failed');
      } finally {
        setIsPreviewLoading(false);
      }
    }
  };

  const handleExecute = async () => {
    if (!uploadResult || !selectedTableId) return;
    const validMappings = mappings.filter((m) => m.targetField);
    setIsExecuting(true);

    try {
      let result;
      if (importMode === 'new' && newTableName) {
        result = await importApi.createTableAndImport(
          uploadResult.id,
          newTableName,
          newTableDisplayName || newTableName,
          newTableDescription,
          newTableIsUserLinked,
          validMappings,
        );
      } else {
        result = await importApi.execute(uploadResult.id, selectedTableId, validMappings);
      }

      if (result.success && result.data) {
        setExecuteResult(result.data);
        setStep(4);
        message.success('Import completed');
      }
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || 'Import execution failed');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleDownloadErrors = () => {
    if (!executeResult?.errors?.length) return;
    const csvContent = [
      'Row,Error',
      ...executeResult.errors.map((e) => `${e.row},"${e.error.replace(/"/g, '""')}"`),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `import_errors_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setStep(0);
    setUploadResult(null);
    setSelectedTableId(null);
    setTargetFields([]);
    setMappings([]);
    setPreviewResult(null);
    setExecuteResult(null);
    setIsExecuting(false);
    setImportMode('existing');
    setNewTableName('');
    setNewTableDisplayName('');
    setNewTableDescription('');
    setNewTableIsUserLinked(false);
    setAiFields(new Map());
  };

  const handleApplyAiSuggestion = (suggestion: TableSuggestion) => {
    setImportMode('new');
    setNewTableName(suggestion.tableName);
    setNewTableDisplayName(suggestion.displayName);
    setNewTableDescription(suggestion.description);
    setNewTableIsUserLinked(suggestion.isUserLinked);

    const aiFieldMap = new Map<string, { fieldType: string; displayName: string; isRequired: boolean; configJson?: Record<string, unknown> }>();
    suggestion.fields.forEach((field) => {
      aiFieldMap.set(field.name, {
        fieldType: field.fieldType,
        displayName: field.displayName,
        isRequired: field.isRequired,
        configJson: field.configJson as Record<string, unknown> | undefined,
      });
    });
    setAiFields(aiFieldMap);

    const aiMappings: ColumnMapping[] = suggestion.fields.map((field) => {
      const sourceColumn = uploadResult?.columns.find((col) => {
        const normalizedCol = col.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        return normalizedCol === field.name || col.toLowerCase() === field.displayName.toLowerCase();
      }) || field.name;
      return {
        sourceColumn,
        targetField: field.name,
        transform: undefined,
        fieldType: field.fieldType,
        displayName: field.displayName,
        isRequired: field.isRequired,
        configJson: field.configJson as Record<string, unknown> | undefined,
      };
    });

    setMappings(aiMappings);
    message.success('AI suggestion applied. Review and edit as needed.');
  };

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    showUploadList: false,
    accept: '.csv,.xlsx,.xls,.json',
    beforeUpload: (file) => {
      handleUpload(file);
      return false;
    },
  };

  const renderStep0Upload = () => (
    <div
      style={{
        padding: '60px 24px',
        textAlign: 'center',
        background: token.colorBgSpotlight,
        borderRadius: 16,
        border: `2px dashed ${token.colorBorder}`,
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 20,
          background: `${token.colorPrimary}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
        }}
      >
        <InboxOutlined style={{ fontSize: 32, color: token.colorPrimary }} />
      </div>
      <Title level={4} style={{ marginBottom: 8, color: token.colorText }}>
        Upload Your File
      </Title>
      <Text style={{ color: token.colorTextSecondary, display: 'block', marginBottom: 24 }}>
        Drag and drop a CSV, Excel, or JSON file here to get started
      </Text>
      <Dragger {...uploadProps} style={{ background: 'transparent', border: 'none' }}>
        <Button type="primary" icon={<UploadOutlined />} style={{ borderRadius: 10 }}>
          Browse Files
        </Button>
      </Dragger>
    <Alert
      title="Supported Formats"
      description="CSV (.csv), Excel (.xlsx, .xls), JSON (.json) - Maximum file size: 50MB"
      type="info"
      showIcon
      style={{
        marginTop: 24,
        borderRadius: 12,
        background: `${token.colorPrimary}08`,
        border: `1px solid ${token.colorPrimary}20`,
        textAlign: 'left',
      }}
    />
    </div>
  );

  const renderStep1Preview = () => {
    if (!uploadResult) return null;
    const previewColumns = uploadResult.columns.map((col) => ({
      title: col,
      dataIndex: col,
      key: col,
      ellipsis: true,
      width: 150,
    }));

    return (
      <div>
        <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Tag color="blue">{uploadResult.fileType.toUpperCase()}</Tag>
          <Tag>{uploadResult.filename}</Tag>
          <Tag>{uploadResult.totalRows} total rows</Tag>
          <Tag>{uploadResult.columns.length} columns</Tag>
        </div>
        <Text style={{ color: token.colorTextSecondary, display: 'block', marginBottom: 12 }}>
          Showing first {Math.min(uploadResult.sampleRows.length, 10)} rows
        </Text>
        <Table
          columns={previewColumns}
          dataSource={uploadResult.sampleRows.slice(0, 10).map((row, i) => ({ ...row, _key: i }))}
          rowKey="_key"
          scroll={{ x: 'max-content' }}
          size="small"
          pagination={false}
        />
      </div>
    );
  };

  const renderStep2Mapping = () => {
    if (!uploadResult) return null;

    return (
      <div>
        <div style={{ marginBottom: 20 }}>
          <Title level={5}>Import Destination</Title>
          <Radio.Group
            value={importMode}
            onChange={(e) => setImportMode(e.target.value)}
            style={{ marginBottom: 16 }}
          >
            <Radio.Button value="existing">
              <DatabaseOutlined style={{ marginRight: 6 }} />
              Existing Table
            </Radio.Button>
          <Radio.Button value="new">
            <PlusOutlined style={{ marginRight: 6 }} />
            Create New Table
          </Radio.Button>
        </Radio.Group>

        {importMode === 'new' && uploadResult && (
          <Button
            icon={<RobotOutlined />}
            onClick={() => setAiModalOpen(true)}
            style={{ marginLeft: 12 }}
          >
            Auto-generate with AI
          </Button>
        )}

          {importMode === 'existing' ? (
            <div>
              <Select
                placeholder="Select target table..."
                value={selectedTableId || undefined}
                onChange={handleSelectTable}
                style={{ width: '100%', maxWidth: 400 }}
                size="large"
                options={tables.map((t) => ({
                  value: t.id,
                  label: `${t.display_name} (${t.name})`,
                }))}
              />
            </div>
          ) : (
            <Card
              size="small"
              style={{ maxWidth: 500, border: `1px solid ${token.colorBorderSecondary}` }}
            >
              <Space orientation="vertical" style={{ width: '100%' }}>
                <Input
                  placeholder="Table name (e.g., students)"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                />
                <Input
                  placeholder="Display name (e.g., Students)"
                  value={newTableDisplayName}
                  onChange={(e) => setNewTableDisplayName(e.target.value)}
                />
                <Input.TextArea
                  placeholder="Description (optional)"
                  rows={2}
                  value={newTableDescription}
                  onChange={(e) => setNewTableDescription(e.target.value)}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Switch
                    checked={newTableIsUserLinked}
                    onChange={setNewTableIsUserLinked}
                    size="small"
                  />
                  <Text>Link to users (adds CIN column)</Text>
                </div>
              </Space>
            </Card>
          )}
        </div>

        {((importMode === 'existing' && targetFields.length > 0) || importMode === 'new') && (
          <>
            <div
              style={{
                marginBottom: 12,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Title level={5} style={{ margin: 0 }}>Column Mapping</Title>
              {importMode === 'existing' && (
                <Button size="small" onClick={autoMatchFields}>
                  Auto-match by name
                </Button>
              )}
            </div>

            <Table
              dataSource={mappings.map((m, i) => ({ ...m, _key: i }))}
              rowKey="_key"
              size="small"
              pagination={false}
              columns={[
                {
                  title: 'Source Column',
                  dataIndex: 'sourceColumn',
                  key: 'sourceColumn',
                  width: 200,
                  render: (val: string) => (
                    <Tag style={{ fontSize: 13 }}>{val}</Tag>
                  ),
                },
                {
                  title: 'Arrow',
                  key: 'arrow',
                  width: 50,
                  align: 'center',
                  render: () => <Text style={{ color: token.colorTextSecondary }}>→</Text>,
                },
                {
                  title: 'Target Field',
                  key: 'targetField',
                  width: 220,
          render: (_: unknown, record: ColumnMapping) => (
            importMode === 'new' ? (
              <Space>
                <Input
                  placeholder="field_name"
                  value={record.targetField}
                  onChange={(e) =>
                    handleMappingChange(record.sourceColumn, 'targetField', e.target.value)
                  }
                  style={{ width: 130 }}
                />
                {aiFields.size > 0 && aiFields.get(record.targetField) && (
                  <Tag color="purple" style={{ fontSize: 11 }}>
                    {aiFields.get(record.targetField)!.fieldType}
                  </Tag>
                )}
              </Space>
            ) : (
                      <Select
                        allowClear
                        placeholder="Select field..."
                        value={record.targetField || undefined}
                        onChange={(val: string) =>
                          handleMappingChange(record.sourceColumn, 'targetField', val)
                        }
                        style={{ width: '100%' }}
                        options={targetFields
                          .filter((f) => f.name !== 'id' && f.name !== 'created_at' && f.name !== 'updated_at' && f.name !== 'created_by')
                          .map((f) => ({
                            value: f.name,
                            label: `${f.display_name} (${f.field_type})`,
                          }))}
                      />
                    )
                  ),
                },
                {
                  title: 'Transform',
                  key: 'transform',
                  width: 200,
                  render: (_: unknown, record: ColumnMapping) => (
                    <Select
                      allowClear
                      placeholder="None"
                      value={record.transform || undefined}
                      onChange={(val: TransformType) =>
                        handleMappingChange(record.sourceColumn, 'transform', val)
                      }
                      style={{ width: '100%' }}
                      options={TRANSFORM_OPTIONS}
                    />
                  ),
                },
              ]}
            />
          </>
        )}
      </div>
    );
  };

  const renderStep3Validation = () => {
    if (!previewResult) return null;
    const { stats, validRows, invalidRows } = previewResult;
    const validPct = stats.totalRows > 0 ? Math.round((stats.validCount / stats.totalRows) * 100) : 0;

    const validColumns = uploadResult?.columns.map((col) => ({
      title: col,
      dataIndex: col,
      key: col,
      ellipsis: true,
      width: 150,
    })) || [];

    return (
      <div>
        <div style={{ marginBottom: 20, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Card size="small" style={{ flex: 1, minWidth: 120, textAlign: 'center' }}>
            <Statistic
              value={stats.totalRows}
              label="Total Rows"
              valueStyle={{ color: token.colorText }}
            />
          </Card>
          <Card size="small" style={{ flex: 1, minWidth: 120, textAlign: 'center' }}>
            <Statistic
              value={stats.validCount}
              label="Valid"
              valueStyle={{ color: token.colorSuccess }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
          <Card size="small" style={{ flex: 1, minWidth: 120, textAlign: 'center' }}>
            <Statistic
              value={stats.invalidCount}
              label="Invalid"
              valueStyle={{ color: stats.invalidCount > 0 ? token.colorError : token.colorTextSecondary }}
              prefix={stats.invalidCount > 0 ? <CloseCircleOutlined /> : undefined}
            />
          </Card>
        </div>

        <Progress
          percent={validPct}
          status={stats.invalidCount > 0 ? 'exception' : 'success'}
          style={{ marginBottom: 20 }}
          format={() => `${validPct}% valid`}
        />

        {stats.invalidCount > 0 && invalidRows.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <Title level={5} style={{ color: token.colorError }}>
              Invalid Rows (showing first {Math.min(invalidRows.length, 10)})
            </Title>
            <Table
              dataSource={invalidRows.slice(0, 10).map((r, i) => ({
                ...r.data,
                _key: i,
                _row: r.row,
                _errors: r.errors,
              }))}
              rowKey="_key"
              size="small"
              scroll={{ x: 'max-content' }}
              pagination={false}
              columns={[
                { title: 'Row #', dataIndex: '_row', key: '_row', width: 70, render: (v: number) => <Tag color="red">{v}</Tag> },
                ...validColumns,
                {
                  title: 'Errors',
                  dataIndex: '_errors',
                  key: '_errors',
                  width: 250,
                  render: (errors: string[]) => (
                    <div>
                      {errors.map((e, i) => (
                        <Text key={i} style={{ color: token.colorError, display: 'block', fontSize: 12 }}>
                          {e}
                        </Text>
                      ))}
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}

        {validRows.length > 0 && (
          <div>
            <Title level={5} style={{ color: token.colorSuccess }}>
              Valid Rows (showing first {Math.min(validRows.length, 10)})
            </Title>
            <Table
              dataSource={validRows.slice(0, 10).map((r, i) => ({ ...r, _key: i }))}
              rowKey="_key"
              size="small"
              scroll={{ x: 'max-content' }}
              pagination={false}
              columns={validColumns}
            />
          </div>
        )}
      </div>
    );
  };

  const renderStep4Execute = () => {
    if (!executeResult) {
      return (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text>Importing data...</Text>
          </div>
          <Progress percent={100} status="active" />
        </div>
      );
    }

    const successPct = executeResult.totalRows > 0
      ? Math.round((executeResult.importedRows / executeResult.totalRows) * 100)
      : 0;
    const hasErrors = executeResult.errorCount > 0;

    return (
      <div>
        <Result
          status={hasErrors ? 'warning' : 'success'}
          title={hasErrors ? 'Import Completed with Errors' : 'Import Successful'}
          subTitle={`${executeResult.importedRows} of ${executeResult.totalRows} rows imported${hasErrors ? ` (${executeResult.errorCount} errors)` : ''}`}
        >
          <div style={{ maxWidth: 400, margin: '0 auto' }}>
            <Progress
              type="circle"
              percent={successPct}
              status={hasErrors ? 'exception' : 'success'}
              style={{ marginBottom: 20 }}
            />
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 20 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: token.colorSuccess }}>
                  {executeResult.importedRows}
                </div>
                <Text type="secondary">Imported</Text>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: hasErrors ? token.colorError : token.colorTextSecondary }}>
                  {executeResult.errorCount}
                </div>
                <Text type="secondary">Errors</Text>
              </div>
            </div>

            {hasErrors && (
              <Button
                icon={<DownloadOutlined />}
                onClick={handleDownloadErrors}
                style={{ width: '100%' }}
              >
                Download Error Log ({executeResult.errors.length} errors shown)
              </Button>
            )}
          </div>
        </Result>
      </div>
    );
  };

  const steps = [
  { title: 'Upload', content: 'Select file' },
  { title: 'Preview', content: 'Review data' },
  { title: 'Mapping', content: 'Map columns' },
  { title: 'Validation', content: 'Check errors' },
  { title: 'Execute', content: 'Import data' },
  ];

  const canGoNext = (): boolean => {
    switch (step) {
      case 0: return !!uploadResult;
      case 1: return true;
      case 2:
        if (importMode === 'existing') return !!selectedTableId && mappings.some((m) => m.targetField);
        return !!newTableName && mappings.some((m) => m.targetField);
      case 3: return true;
      default: return false;
    }
  };

  return (
    <div>
      <Steps current={step} items={steps} style={{ marginBottom: 24 }} size="small" />

      <div style={{ minHeight: 300 }}>
        {step === 0 && renderStep0Upload()}
        {step === 1 && renderStep1Preview()}
        {step === 2 && renderStep2Mapping()}
        {step === 3 && renderStep3Validation()}
        {step === 4 && renderStep4Execute()}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 24,
          borderTop: `1px solid ${token.colorBorderSecondary}`,
          paddingTop: 16,
        }}
      >
        <Button onClick={step === 0 ? onCancel : handleReset}>
          {step === 0 ? 'Cancel' : 'Start Over'}
        </Button>
        <Space>
          {step > 0 && step < 4 && (
            <Button onClick={() => setStep(step - 1)}>Previous</Button>
          )}
          {step === 1 && (
            <Button type="primary" onClick={() => setStep(2)}>
              Next: Map Columns
            </Button>
          )}
          {step === 2 && (
            <Button
              type="primary"
              onClick={handlePreview}
              loading={isPreviewLoading}
              disabled={!canGoNext()}
            >
              Next: Validate
            </Button>
          )}
          {step === 3 && (
            <Button
              type="primary"
              onClick={handleExecute}
              disabled={!canGoNext()}
            >
              Execute Import
            </Button>
          )}
          {step === 4 && (
            <Button type="primary" onClick={onComplete}>
              Done
            </Button>
          )}
        </Space>
      </div>

      {uploadResult && (
        <AiSuggestionModal
          open={aiModalOpen}
          fileId={uploadResult.id}
          onCancel={() => setAiModalOpen(false)}
          onApply={handleApplyAiSuggestion}
        />
      )}
    </div>
  );
}

function Statistic({ value, label, valueStyle, prefix }: {
  value: number;
  label: string;
  valueStyle?: React.CSSProperties;
  prefix?: React.ReactNode;
}) {
  const { token } = theme.useToken();
  return (
    <div>
      <div style={{ fontSize: 28, fontWeight: 700, ...valueStyle }}>
        {prefix} {value}
      </div>
      <Text type="secondary" style={{ fontSize: 12 }}>{label}</Text>
    </div>
  );
}
