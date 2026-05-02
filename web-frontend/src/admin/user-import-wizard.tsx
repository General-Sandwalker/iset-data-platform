import { useState, useCallback } from 'react';
import {
  Card,
  Steps,
  Upload,
  Button,
  Table,
  Select,
  Typography,
  Alert,
  Progress,
  Space,
  Result,
  message,
  theme,
} from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd/es/upload/interface';
import { apiClient } from '../core/api/client';

const { Dragger } = Upload;
const { Title, Text } = Typography;

interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  sampleValues: string[];
}

interface ImportResult {
  imported: number;
  failed: number;
  errors: string[];
}

const targetFields = [
  { value: 'cin', label: 'CIN' },
  { value: 'email', label: 'Email' },
  { value: 'firstName', label: 'First Name' },
  { value: 'lastName', label: 'Last Name' },
  { value: 'role', label: 'Role' },
  { value: 'phone', label: 'Phone' },
  { value: 'skip', label: 'Skip this column' },
];

type Step = 'upload' | 'mapping' | 'validation' | 'execute';

export default function UserImportWizard({
  onComplete,
}: {
  onComplete?: () => void;
}) {
  const { token: themeToken } = theme.useToken();
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  const parseCSV = (text: string): { columns: string[]; rows: string[][] } => {
    const lines = text.trim().split('\n');
    if (lines.length === 0) return { columns: [], rows: [] };
    const headers = lines[0]
      .split(',')
      .map((h) => h.trim().replace(/"/g, ''));
    const rows = lines
      .slice(1)
      .map((line) =>
        line.split(',').map((cell) => cell.trim().replace(/"/g, ''))
      );
    return { columns: headers, rows: rows.slice(0, 10) };
  };

  const handleFile: UploadProps['customRequest'] = useCallback(
    async (options) => {
      const file = options.file as File;
      const text = await file.text();
      const { columns: cols, rows } = parseCSV(text);
      setColumns(cols);
      setPreviewData(rows);
      setFile(file);
      setMappings(
        cols.map((col) => ({
          sourceColumn: col,
          targetField: 'skip',
          sampleValues: rows
            .slice(0, 3)
            .map((r) => r[cols.indexOf(col)] || ''),
        }))
      );
      setCurrentStep('mapping');
      options.onSuccess?.({});
    },
    []
  );

  const handleMappingChange = (
    sourceColumn: string,
    targetField: string
  ) => {
    setMappings((prev) =>
      prev.map((m) =>
        m.sourceColumn === sourceColumn ? { ...m, targetField } : m
      )
    );
  };

  const canProceed = mappings.some((m) => m.targetField !== 'skip');

  const executeImport = async () => {
    setCurrentStep('execute');
    setIsExecuting(true);
    setProgress(0);

    const userObjects = previewData.map((row) => {
      const obj: Record<string, string> = {};
      mappings.forEach((mapping) => {
        if (mapping.targetField !== 'skip') {
          obj[mapping.targetField] =
            row[columns.indexOf(mapping.sourceColumn)] || '';
        }
      });
      return obj;
    });

    try {
      const response = await apiClient.post('/users/import', {
        users: userObjects,
      });
      const data = response.data;

      setProgress(100);
      setResult(data.data || { imported: 0, failed: 0, errors: [] });
      if (data.data?.imported > 0) {
        message.success(`Imported ${data.data.imported} users`);
      }
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.error?.message || 'Import failed';
      setResult({
        imported: 0,
        failed: userObjects.length,
        errors: [errorMsg],
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const stepIndex = {
    upload: 0,
    mapping: 1,
    validation: 2,
    execute: 3,
  }[currentStep];

  return (
    <div>
      <Title level={4}>Import Users</Title>
      <Card>
        <Steps
          current={stepIndex}
          items={[
            { title: 'Upload' },
            { title: 'Mapping' },
            { title: 'Validation' },
            { title: 'Execute' },
          ]}
          style={{ marginBottom: 24 }}
        />

        {currentStep === 'upload' && (
          <Dragger
            accept=".csv,.xlsx,.xls"
            customRequest={handleFile as any}
            showUploadList={false}
            maxCount={1}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Click or drag file to upload</p>
            <Text type="secondary">Supports CSV and Excel files</Text>
          </Dragger>
        )}

        {currentStep === 'mapping' && (
          <div>
            <Alert
              message={`File: ${file?.name} (${previewData.length + 1} rows)`}
              type="info"
              style={{ marginBottom: 16 }}
            />
            <Title level={5}>Column Mapping</Title>
            <Text type="secondary">
              Map each source column to a user field
            </Text>
<Space
          orientation="vertical"
          style={{ width: '100%', marginTop: 16 }}
          size="middle"
        >
              {columns.map((col, idx) => (
                <div
                  key={col}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '8px 12px',
                    background: themeToken.colorBgContainer,
                    border: `1px solid ${themeToken.colorBorderSecondary}`,
                    borderRadius: themeToken.borderRadius,
                  }}
                >
                  <Text strong style={{ width: 180 }}>
                    {col}
                  </Text>
                  <Select
                    placeholder="Select target field"
                    style={{ width: 200 }}
                    value={mappings[idx]?.targetField}
                    onChange={(v) => handleMappingChange(col, v)}
                    options={targetFields}
                  />
                  <Text
                    type="secondary"
                    ellipsis
                    style={{ maxWidth: 200 }}
                  >
                    {previewData
                      .slice(0, 3)
                      .map((r) => r[idx])
                      .join(', ')}
                  </Text>
                </div>
              ))}
            </Space>
            <Space style={{ marginTop: 24 }}>
              <Button onClick={() => setCurrentStep('upload')}>Back</Button>
              <Button
                type="primary"
                disabled={!canProceed}
                onClick={() => setCurrentStep('validation')}
              >
                Next
              </Button>
            </Space>
          </div>
        )}

        {currentStep === 'validation' && (
          <div>
            <Alert
              message="Validation Preview"
              type="info"
              style={{ marginBottom: 16 }}
            />
            <Table
              dataSource={previewData.map((row, rowIdx) =>
                columns.reduce(
                  (acc, col, colIdx) => ({
                    ...acc,
                    [col]: row[colIdx],
                  }),
                  { key: rowIdx }
                )
              )}
              columns={columns.map((col) => ({
                title: col,
                dataIndex: col,
                key: col,
              }))}
              pagination={false}
              size="small"
            />
            <Space style={{ marginTop: 24 }}>
              <Button onClick={() => setCurrentStep('mapping')}>Back</Button>
              <Button type="primary" onClick={executeImport}>
                Start Import
              </Button>
            </Space>
          </div>
        )}

        {currentStep === 'execute' && (
          <div>
            {isExecuting ? (
              <div style={{ textAlign: 'center', padding: 48 }}>
                <Progress type="circle" percent={progress} />
                <Title level={4} style={{ marginTop: 16 }}>
                  Importing users...
                </Title>
              </div>
            ) : result ? (
              <Result
                status={result.failed === 0 ? 'success' : 'warning'}
                title={
                  result.failed === 0
                    ? 'Import Complete'
                    : 'Import Complete with Errors'
                }
                subTitle={
                  <div>
                    <div>Imported: {result.imported}</div>
                    <div>Failed: {result.failed}</div>
                  </div>
                }
                extra={[
                  <Button key="close" type="primary" onClick={onComplete}>
                    Close
                  </Button>,
                ]}
              />
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
}
