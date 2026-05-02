import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { z } from 'zod';
import { validate, uuidParam } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';
import { sendSuccess, sendCreated, paginatedResponse } from '../middleware/response.js';
import { logActivity } from '../middleware/activity-logger.js';
import { config } from '../config/env.js';
import { fieldTypes } from '../schema-engine/service.js';
import {
  createImport,
  getImport,
  updateImportStatus,
  recordImportErrors,
  listImports,
  deleteImport,
  ensureUploadDir,
  detectFileType,
  generateFileId,
  UPLOAD_DIR,
  parseCSV,
  parseAllCSV,
  parseExcel,
  parseAllExcel,
  parseJSON,
  previewImport,
  applyTransform,
  validateValue,
  type ParsedFileResult,
  type ColumnMapping,
} from './service.js';

const router = Router();

const uploadDir = UPLOAD_DIR;
ensureUploadDir();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const fileId = generateFileId();
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${fileId}${ext}`);
  },
});

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.csv', '.xlsx', '.xls', '.json'];

  if (!allowedExts.includes(ext)) {
    cb(new Error('Invalid file extension'));
    return;
  }

  const allowedMimes = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/json',
    'application/octet-stream',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file MIME type'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.UPLOAD_MAX_SIZE,
  },
});

router.post(
  '/upload',
  authenticate,
  requireAdmin,
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw new Error('No file uploaded');
      }

      const fileType = detectFileType(req.file.originalname);
      if (fileType === 'unknown') {
        throw new Error('Unsupported file type');
      }

      const importFile = await createImport(
        req.file.originalname,
        req.file.filename,
        fileType,
        req.file.size,
        req.user?.id
      );

      const filePath = path.join(uploadDir, req.file.filename);
      let parsed: ParsedFileResult;

      if (fileType === 'csv') {
        parsed = await parseCSV(filePath);
      } else if (fileType === 'excel') {
        parsed = await parseExcel(filePath);
      } else if (fileType === 'json') {
        parsed = await parseJSON(filePath);
      } else {
        throw new Error('Unknown file type');
      }

      await updateImportStatus(
        importFile.id,
        'pending',
        parsed.columns,
        parsed.totalRows
      );

      await logActivity({
        userId: req.user!.id,
        action: 'UPLOAD_FILE',
        entityType: 'import',
        entityId: importFile.id,
        ipAddress: req.ip,
      });

      sendSuccess(res, {
        id: importFile.id,
        filename: importFile.original_name,
        fileType: importFile.file_type,
        fileSize: importFile.file_size,
        columns: parsed.columns,
        sampleRows: parsed.sampleRows,
        totalRows: parsed.totalRows,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const page = req.query.page ? parseInt(String(req.query.page)) : 1;
    const limit = req.query.limit ? parseInt(String(req.query.limit)) : 20;

    const result = await listImports(page, limit);

    const imports = result.imports.map((imp) => ({
      id: imp.id,
      filename: imp.original_name,
      fileType: imp.file_type,
      fileSize: imp.file_size,
      status: imp.status,
      columns: imp.columns,
      totalRows: imp.total_rows,
      importedRows: imp.imported_rows,
      errorCount: imp.error_count,
      createdAt: imp.created_at,
      completedAt: imp.completed_at,
    }));

    paginatedResponse(res, imports, { page, limit, total: result.total });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authenticate, requireAdmin, validate({ params: uuidParam }), async (req, res, next) => {
  try {
    const importFile = await getImport(req.params.id);
    sendSuccess(res, {
      id: importFile.id,
      filename: importFile.original_name,
      fileType: importFile.file_type,
      fileSize: importFile.file_size,
      status: importFile.status,
      columns: importFile.columns,
      totalRows: importFile.total_rows,
      importedRows: importFile.imported_rows,
      errorCount: importFile.error_count,
      errors: importFile.errors,
      createdAt: importFile.created_at,
      completedAt: importFile.completed_at,
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, requireAdmin, validate({ params: uuidParam }), async (req, res, next) => {
  try {
    await deleteImport(req.params.id);
    await logActivity({
      userId: req.user!.id,
      action: 'DELETE_IMPORT',
      entityType: 'import',
      entityId: req.params.id,
      ipAddress: req.ip,
    });
    sendSuccess(res, { message: 'Import deleted' });
  } catch (err) {
    next(err);
  }
});

const previewSchema = z.object({
  fileId: z.string().uuid(),
  tableId: z.string().uuid(),
  mappings: z.array(z.object({
    sourceColumn: z.string(),
    targetField: z.string(),
    transform: z.enum(['uppercase', 'lowercase', 'trim', 'date_iso', 'date_fr', 'number', 'boolean']).optional(),
    fieldType: z.string().optional(),
    displayName: z.string().optional(),
    isRequired: z.boolean().optional(),
    configJson: z.record(z.unknown()).optional(),
  })),
});

const previewFileSchema = z.object({
  fileId: z.string().uuid(),
  mappings: z.array(z.object({
    sourceColumn: z.string(),
    targetField: z.string(),
    transform: z.enum(['uppercase', 'lowercase', 'trim', 'date_iso', 'date_fr', 'number', 'boolean']).optional(),
    fieldType: z.string().optional(),
    displayName: z.string().optional(),
    isRequired: z.boolean().optional(),
    configJson: z.record(z.unknown()).optional(),
  })),
});

router.post(
  '/preview',
  authenticate,
  requireAdmin,
  validate({ body: previewSchema }),
  async (req, res, next) => {
    try {
      const { fileId, tableId, mappings } = req.body;

      const importFile = await getImport(fileId);
      if (!importFile.columns || importFile.columns.length === 0) {
        throw new Error('File has no columns. Please upload a file first.');
      }

      const filePath = path.join(uploadDir, importFile.filename);
      let allRows: Record<string, unknown>[] = [];

      if (importFile.file_type === 'csv') {
        const parsed = await parseCSV(filePath);
        allRows = parsed.sampleRows;
      } else if (importFile.file_type === 'excel') {
        const parsed = await parseExcel(filePath);
        allRows = parsed.sampleRows;
      } else if (importFile.file_type === 'json') {
        const parsed = await parseJSON(filePath);
        allRows = parsed.sampleRows;
      }

      const preview = await previewImport(importFile, allRows, tableId, mappings);

      sendSuccess(res, {
        validRows: preview.validRows.slice(0, 10),
        invalidRows: preview.invalidRows.slice(0, 10),
        stats: preview.stats,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/preview-new-table',
  authenticate,
  requireAdmin,
  validate({ body: previewFileSchema }),
  async (req, res, next) => {
    try {
      const { fileId, mappings } = req.body;

      const importFile = await getImport(fileId);
      if (!importFile.columns || importFile.columns.length === 0) {
        throw new Error('File has no columns. Please upload a file first.');
      }

      const filePath = path.join(uploadDir, importFile.filename);
      let allRows: Record<string, unknown>[] = [];

      if (importFile.file_type === 'csv') {
        const parsed = await parseCSV(filePath);
        allRows = parsed.sampleRows;
      } else if (importFile.file_type === 'excel') {
        const parsed = await parseExcel(filePath);
        allRows = parsed.sampleRows;
      } else if (importFile.file_type === 'json') {
        const parsed = await parseJSON(filePath);
        allRows = parsed.sampleRows;
      }

      const validRows: Record<string, unknown>[] = [];
      const invalidRows: { row: number; data: Record<string, unknown>; errors: string[] }[] = [];

      for (let i = 0; i < allRows.length; i++) {
        const sourceRow = allRows[i];
        const mappedData: Record<string, unknown> = {};
        const errors: string[] = [];

        for (const mapping of mappings) {
          const sourceValue = sourceRow[mapping.sourceColumn];
          const transformedValue = applyTransform(sourceValue, mapping.transform);

          if (transformedValue === undefined || transformedValue === null || transformedValue === '') {
            if (mapping.isRequired) {
              errors.push(`Required field "${mapping.targetField}" is empty`);
            }
            continue;
          }

          if (mapping.fieldType === 'number' || mapping.fieldType === 'decimal') {
            const num = typeof transformedValue === 'number' ? transformedValue : parseFloat(String(transformedValue));
            if (isNaN(num)) {
              errors.push(`Value "${transformedValue}" is not a valid number`);
              continue;
            }
            mappedData[mapping.targetField] = num;
          } else if (mapping.fieldType === 'boolean') {
            const str = String(transformedValue).toLowerCase();
            mappedData[mapping.targetField] = ['true', '1', 'yes', 'on'].includes(str);
          } else if (mapping.fieldType === 'date') {
            mappedData[mapping.targetField] = String(transformedValue).slice(0, 10);
          } else {
            mappedData[mapping.targetField] = String(transformedValue);
          }
        }

        if (errors.length > 0) {
          invalidRows.push({ row: i + 1, data: sourceRow, errors });
        } else {
          validRows.push(mappedData);
        }
      }

      sendSuccess(res, {
        validRows: validRows.slice(0, 10),
        invalidRows: invalidRows.slice(0, 10),
        stats: {
          totalRows: allRows.length,
          validCount: validRows.length,
          invalidCount: invalidRows.length,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

const executeSchema = z.object({
  fileId: z.string().uuid(),
  tableId: z.string().uuid(),
  mappings: z.array(z.object({
    sourceColumn: z.string(),
    targetField: z.string(),
    transform: z.enum(['uppercase', 'lowercase', 'trim', 'date_iso', 'date_fr', 'number', 'boolean']).optional(),
    fieldType: z.string().optional(),
    displayName: z.string().optional(),
    isRequired: z.boolean().optional(),
    configJson: z.record(z.unknown()).optional(),
  })),
  skipDuplicates: z.boolean().default(false),
});

router.post(
  '/execute',
  authenticate,
  requireAdmin,
  validate({ body: executeSchema }),
  async (req, res, next) => {
    try {
      const { fileId, tableId, mappings } = req.body;

      const importFile = await getImport(fileId);
      const filePath = path.join(uploadDir, importFile.filename);

      await updateImportStatus(fileId, 'processing');

      let allRows: Record<string, unknown>[] = [];

      if (importFile.file_type === 'csv') {
        allRows = await parseAllCSV(filePath);
      } else if (importFile.file_type === 'excel') {
        allRows = await parseAllExcel(filePath);
      } else if (importFile.file_type === 'json') {
        const parsed = await parseJSON(filePath);
        allRows = parsed.sampleRows;
      }

      const { listFields, insertData } = await import('../schema-engine/service.js');
      const targetFields = await listFields(tableId);
      const fieldMap = new Map(targetFields.map(f => [f.name, f]));

      let importedCount = 0;
      const errors: { row: number; error: string }[] = [];
      const batchSize = 100;
      let batch: Record<string, unknown>[] = [];

      for (let i = 0; i < allRows.length; i++) {
        const sourceRow = allRows[i];
        const mappedData: Record<string, unknown> = {};
        let hasError = false;

        try {
          for (const mapping of mappings) {
            const sourceValue = sourceRow[mapping.sourceColumn];
            const transformedValue = applyTransform(sourceValue, mapping.transform);
            const targetField = fieldMap.get(mapping.targetField);

            if (targetField) {
              mappedData[mapping.targetField] = transformedValue;

              const error = validateValue(transformedValue, targetField);
              if (error) {
                throw new Error(`Row ${i + 1}: ${error}`);
              }
            }
          }

          if (Object.keys(mappedData).length > 0) {
            batch.push(mappedData);
          }
        } catch (err: any) {
          errors.push({ row: i + 1, error: err.message });
          hasError = true;
        }

        if ((i + 1) % batchSize === 0 || i === allRows.length - 1) {
          for (const data of batch) {
            try {
              await insertData(tableId, data);
              importedCount++;
            } catch (err: any) {
              errors.push({ row: i + 1, error: err.message });
            }
          }
          batch = [];
        }
      }

      await recordImportErrors(fileId, importedCount, errors.length, errors);
      await updateImportStatus(fileId, importedCount > 0 ? 'completed' : 'failed');

      await logActivity({
        userId: req.user!.id,
        action: 'EXECUTE_IMPORT',
        entityType: 'import',
        entityId: fileId,
        ipAddress: req.ip,
      });

      sendSuccess(res, {
        totalRows: allRows.length,
        importedRows: importedCount,
        errorCount: errors.length,
        errors: errors.slice(0, 50),
      });
    } catch (err) {
      next(err);
    }
  }
);

const createTableAndImportSchema = z.object({
  fileId: z.string().uuid(),
  tableName: z.string().min(1).regex(/^[a-z0-9_]+$/),
  displayName: z.string().min(1),
  description: z.string().optional(),
  isUserLinked: z.boolean().default(false),
  mappings: z.array(z.object({
    sourceColumn: z.string(),
    targetField: z.string(),
    transform: z.enum(['uppercase', 'lowercase', 'trim', 'date_iso', 'date_fr', 'number', 'boolean']).optional(),
    fieldType: z.string().optional(),
    displayName: z.string().optional(),
    isRequired: z.boolean().optional(),
    configJson: z.record(z.unknown()).optional(),
  })),
});

router.post(
  '/create-table-and-import',
  authenticate,
  requireAdmin,
  validate({ body: createTableAndImportSchema }),
  async (req, res, next) => {
    try {
        const { fileId, tableName, displayName, description, isUserLinked, mappings } = req.body as {
          fileId: string;
          tableName: string;
          displayName: string;
          description?: string;
          isUserLinked: boolean;
          mappings: Array<{
            sourceColumn: string;
            targetField: string;
            transform?: string;
            fieldType?: string;
            displayName?: string;
            isRequired?: boolean;
            configJson?: Record<string, unknown>;
          }>;
        };

        const { createTable, addField, listFields, insertData } = await import('../schema-engine/service.js');

        const table = await createTable({
          name: tableName,
          displayName,
          description,
          isUserLinked,
          createdBy: req.user!.id,
        });

        const uniqueTargetFields = [...new Set(mappings.map(m => m.targetField))];
        const fieldMapByTarget = new Map<string, Record<string, any>>(mappings.map(m => [m.targetField, m as Record<string, any>]));
        for (let i = 0; i < uniqueTargetFields.length; i++) {
          const fieldName = uniqueTargetFields[i];
          const mappingEntry = fieldMapByTarget.get(fieldName);
          const entryFieldType: string | undefined = mappingEntry?.fieldType;
          const fieldType = (entryFieldType && fieldTypes.includes(entryFieldType as typeof fieldTypes[number]))
            ? entryFieldType as typeof fieldTypes[number]
            : 'text' as typeof fieldTypes[number];
          const entryDisplayName: string | undefined = mappingEntry?.displayName;
          await addField({
            tableId: table.id,
            name: fieldName,
            displayName: entryDisplayName || fieldName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            fieldType,
            isRequired: mappingEntry?.isRequired || false,
            configJson: mappingEntry?.configJson,
            orderIndex: i + 1,
          });
        }

        await updateImportStatus(fileId, 'processing');

        const importFile = await getImport(fileId);
        const filePath = path.join(uploadDir, importFile.filename);

        let allRows: Record<string, unknown>[] = [];

        if (importFile.file_type === 'csv') {
          allRows = await parseAllCSV(filePath);
        } else if (importFile.file_type === 'excel') {
          allRows = await parseAllExcel(filePath);
        } else if (importFile.file_type === 'json') {
          const parsed = await parseJSON(filePath);
          allRows = parsed.sampleRows;
        }

        const targetFields = await listFields(table.id);
        const fieldMap = new Map(targetFields.map(f => [f.name, f]));

        let importedCount = 0;
        const errors: { row: number; error: string }[] = [];
        const batchSize = 100;
        let batch: Record<string, unknown>[] = [];

        for (let i = 0; i < allRows.length; i++) {
          const sourceRow = allRows[i];
          const mappedData: Record<string, unknown> = {};

          try {
            for (const mapping of mappings) {
              const sourceValue = sourceRow[mapping.sourceColumn];
              const transformedValue = applyTransform(sourceValue, mapping.transform);
              const targetField = fieldMap.get(mapping.targetField);

              if (targetField) {
                mappedData[mapping.targetField] = transformedValue;

                const error = validateValue(transformedValue, targetField);
                if (error) {
                  throw new Error(`Row ${i + 1}: ${error}`);
                }
              }
            }

            if (Object.keys(mappedData).length > 0) {
              batch.push(mappedData);
            }
          } catch (err: any) {
            errors.push({ row: i + 1, error: err.message });
          }

          if ((i + 1) % batchSize === 0 || i === allRows.length - 1) {
            for (const data of batch) {
              try {
                await insertData(table.id, data);
                importedCount++;
              } catch (err: any) {
                errors.push({ row: i + 1, error: err.message });
              }
            }
            batch = [];
          }
        }

      await recordImportErrors(fileId, importedCount, errors.length, errors);
      await updateImportStatus(fileId, importedCount > 0 ? 'completed' : 'failed');

      await logActivity({
        userId: req.user!.id,
        action: 'CREATE_TABLE_AND_IMPORT',
        entityType: 'import',
        entityId: fileId,
        ipAddress: req.ip,
      });

      sendSuccess(res, {
        table: {
          id: table.id,
          name: table.name,
          displayName: table.display_name,
        },
        totalRows: allRows.length,
        importedRows: importedCount,
        errorCount: errors.length,
        errors: errors.slice(0, 50),
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;