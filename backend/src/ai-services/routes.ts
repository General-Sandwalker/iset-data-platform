import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';
import { validate } from '../middleware/validation.js';
import { sendSuccess } from '../middleware/response.js';
import { logActivity } from '../middleware/activity-logger.js';
import { suggestTableFromImport, generateSurvey, type TableSuggestion } from './service.js';
import { getImport } from '../data-ingestion/service.js';
import path from 'path';
import { UPLOAD_DIR, parseCSV, parseExcel, parseJSON } from '../data-ingestion/service.js';

const router = Router();

const suggestTableSchema = z.object({
  fileId: z.string().uuid(),
});

router.post(
  '/import/suggest-table',
  authenticate,
  requireAdmin,
  validate({ body: suggestTableSchema }),
  async (req, res, next) => {
    try {
      const { fileId } = req.body;

      const importFile = await getImport(fileId);
      if (!importFile.columns || importFile.columns.length === 0) {
        throw new Error('File has no columns. Please upload a file first.');
      }

      const filePath = path.join(UPLOAD_DIR, importFile.filename);
      let sampleRows: Record<string, unknown>[] = [];

      if (importFile.file_type === 'csv') {
        const parsed = await parseCSV(filePath);
        sampleRows = parsed.sampleRows;
      } else if (importFile.file_type === 'excel') {
        const parsed = await parseExcel(filePath);
        sampleRows = parsed.sampleRows;
      } else if (importFile.file_type === 'json') {
        const parsed = await parseJSON(filePath);
        sampleRows = parsed.sampleRows;
      }

      const suggestion: TableSuggestion = await suggestTableFromImport(
        importFile.columns,
        sampleRows,
        importFile.original_name
      );

      await logActivity({
        userId: req.user!.id,
        action: 'AI_SUGGEST_TABLE',
        entityType: 'import',
        entityId: fileId,
        ipAddress: req.ip,
      });

      sendSuccess(res, suggestion);
  } catch (err) {
    next(err);
  }
});

const generateSurveySchema = z.object({
  description: z.string().min(5).max(2000),
  targetAudience: z.string().max(200).optional(),
});

router.post(
  '/surveys/generate',
  authenticate,
  requireAdmin,
  validate({ body: generateSurveySchema }),
  async (req, res, next) => {
    try {
      const suggestion = await generateSurvey(
        req.body.description,
        req.body.targetAudience
      );

      await logActivity({
        userId: req.user!.id,
        action: 'AI_GENERATE_SURVEY',
        entityType: 'survey',
        ipAddress: req.ip,
      });

      sendSuccess(res, suggestion);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
