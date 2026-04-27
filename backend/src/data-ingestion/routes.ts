import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { z } from 'zod';
import { validate, uuidParam } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';
import { sendSuccess, sendCreated, paginatedResponse } from '../middleware/response.js';
import { logActivity } from '../middleware/activity-logger.js';
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
  parseExcel,
  parseJSON,
  type ParsedFileResult,
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

  if (allowedExts.includes(ext)) {
    const allowedMimes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json',
    ];

    if (file.mimetype === 'application/octet-stream') {
      cb(null, true);
    } else if (allowedMimes.includes(file.mimetype) || ext === '.csv' || ext === '.json') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  } else {
    cb(new Error('Invalid file extension'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024,
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

export default router;