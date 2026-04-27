import { query } from '../config/database.js';
import { HttpError } from '../middleware/auth.js';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

export interface ImportFile {
  id: string;
  filename: string;
  original_name: string;
  file_type: string;
  file_size: number;
  status: string;
  columns: string[] | null;
  total_rows: number | null;
  imported_rows: number;
  error_count: number;
  errors: object[];
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface ParsedFileResult {
  columns: string[];
  sampleRows: Record<string, unknown>[];
  totalRows?: number;
}

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'imports');

function ensureUploadDir(): void {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

function detectFileType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'csv': return 'csv';
    case 'xlsx':
    case 'xls': return 'excel';
    case 'json': return 'json';
    default: return 'unknown';
  }
}

function generateFileId(): string {
  return `import_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

function parseCSVSimple(filePath: string): ParsedFileResult {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  if (lines.length === 0) {
    return { columns: [], sampleRows: [] };
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows: Record<string, unknown>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, unknown> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || '';
    }
    rows.push(row);
  }

  return {
    columns: headers,
    sampleRows: rows.slice(0, 10),
    totalRows: rows.length,
  };
}

function parseCSVWithQuotes(filePath: string): ParsedFileResult {
  const content = fs.readFileSync(filePath, 'utf-8');
  const rows: Record<string, unknown>[] = [];
  const lines = content.split('\n');

  let headers: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parseLine = (lineStr: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let j = 0; j < lineStr.length; j++) {
        const char = lineStr[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    if (i === 0) {
      headers = parseLine(line);
    } else {
      const values = parseLine(line);
      const row: Record<string, unknown> = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = values[j] || '';
      }
      rows.push(row);
    }
  }

  return {
    columns: headers,
    sampleRows: rows.slice(0, 10),
    totalRows: rows.length,
  };
}

async function parseCSV(filePath: string): Promise<ParsedFileResult> {
  try {
    return parseCSVWithQuotes(filePath);
  } catch {
    return parseCSVSimple(filePath);
  }
}

async function parseExcel(filePath: string): Promise<ParsedFileResult> {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: null });

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return {
    columns,
    sampleRows: rows.slice(0, 10) as Record<string, unknown>[],
    totalRows: rows.length,
  };
}

async function parseJSON(filePath: string): Promise<ParsedFileResult> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);

  if (!Array.isArray(data)) {
    throw new HttpError(400, 'INVALID_JSON', 'JSON file must contain an array of objects');
  }

  if (data.length === 0) {
    return { columns: [], sampleRows: [] };
  }

  const columns = Object.keys(data[0]);

  return {
    columns,
    sampleRows: data.slice(0, 10),
    totalRows: data.length,
  };
}

export async function createImport(
  originalName: string,
  storedFilename: string,
  fileType: string,
  fileSize: number,
  userId?: string
): Promise<ImportFile> {
  const result = await query<ImportFile>(
    `INSERT INTO imports (filename, original_name, file_type, file_size, created_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [storedFilename, originalName, fileType, fileSize, userId || null]
  );
  return result.rows[0];
}

export async function getImport(id: string): Promise<ImportFile> {
  const result = await query<ImportFile>('SELECT * FROM imports WHERE id = $1', [id]);
  if (result.rows.length === 0) {
    throw new HttpError(404, 'IMPORT_NOT_FOUND', 'Import file not found');
  }
  return result.rows[0];
}

export async function updateImportStatus(
  id: string,
  status: string,
  columns?: string[],
  totalRows?: number
): Promise<void> {
  const updates: string[] = ['status = $2'];
  const params: (string | number)[] = [id, status];

  let i = 3;
  if (columns !== undefined) {
    updates.push(`columns = $${i++}`);
    params.push(JSON.stringify(columns));
  }
  if (totalRows !== undefined) {
    updates.push(`total_rows = $${i++}`);
    params.push(totalRows);
  }

  if (status === 'completed' || status === 'failed') {
    updates.push(`completed_at = NOW()`);
  }

  await query(`UPDATE imports SET ${updates.join(', ')} WHERE id = $1`, params);
}

export async function recordImportErrors(
  id: string,
  importedRows: number,
  errorCount: number,
  errors: object[]
): Promise<void> {
  await query(
    `UPDATE imports SET imported_rows = $2, error_count = $3, errors = $4, status = CASE WHEN $3 > 0 THEN 'partial' ELSE 'completed' END, completed_at = NOW() WHERE id = $1`,
    [id, importedRows, errorCount, JSON.stringify(errors)]
  );
}

export async function listImports(
  page: number = 1,
  limit: number = 20
): Promise<{ imports: ImportFile[]; total: number }> {
  const offset = (page - 1) * limit;

  const countResult = await query<{ count: string }>('SELECT COUNT(*) as count FROM imports');
  const total = parseInt(countResult.rows[0].count);

  const result = await query<ImportFile>(
    'SELECT * FROM imports ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  );

  return { imports: result.rows, total };
}

export async function deleteImport(id: string): Promise<void> {
  const importFile = await getImport(id);
  const filePath = path.join(UPLOAD_DIR, importFile.filename);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await query('DELETE FROM imports WHERE id = $1', [id]);
}

export { ensureUploadDir, detectFileType, generateFileId, UPLOAD_DIR, parseCSV, parseExcel, parseJSON };