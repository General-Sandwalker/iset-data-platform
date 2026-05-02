import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { errorHandler } from './middleware/error-handler.js';
import { config } from './config/env.js';
import { globalLimiter, aiLimiter } from './middleware/rate-limit.js';
import { authenticate } from './middleware/auth.js';
import { sendSuccess } from './middleware/response.js';
import authRoutes from './core/auth/routes.js';
import authAdminRoutes from './core/auth/admin-routes.js';
import userRoutes from './core/users/routes.js';
import userImportRoutes from './core/users/import-routes.js';
import schemaRoutes from './schema-engine/routes.js';
import importRoutes from './data-ingestion/routes.js';
import aiRoutes from './ai-services/routes.js';
import surveyRoutes from './survey-engine/routes.js';
import { publicSurveyRoutes } from './survey-engine/public-routes.js';
import { vizRoutes, publicVizRoutes } from './viz-engine/routes.js';
import { publicLandingRoutes } from './public/routes.js';
import analyticsRoutes from './analytics/routes.js';
import reportRoutes from './report-engine/routes.js';
import partnershipsRoutes from './partnerships/routes.js';
import systemAdminRoutes from './system-admin/routes.js';
import { HttpError } from './middleware/auth.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", config.FRONTEND_URL],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  }));
  app.use(cors({
    origin: config.FRONTEND_URL,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(globalLimiter);

  app.get('/health', (req, res) => {
    sendSuccess(res, { status: 'ok', timestamp: new Date().toISOString() });
  });

  const apiRouter = express.Router();

  apiRouter.get('/health', (req, res) => {
    sendSuccess(res, { status: 'ok', timestamp: new Date().toISOString() });
  });

  apiRouter.use('/auth', authRoutes);
  apiRouter.use('/admin/users', authAdminRoutes);
  apiRouter.use('/users', userRoutes);
  apiRouter.use('/users/import', userImportRoutes);
  apiRouter.use('/schema', schemaRoutes);
  apiRouter.use('/import', importRoutes);
  apiRouter.use('/surveys', surveyRoutes);
  apiRouter.use('/viz', vizRoutes);
  apiRouter.use('/analytics', analyticsRoutes);
  apiRouter.use('/reports', reportRoutes);
  apiRouter.use('/partnerships', partnershipsRoutes);
  apiRouter.use('/system', systemAdminRoutes);
  apiRouter.use('/ai', aiLimiter, aiRoutes);

  app.use('/api/v1', apiRouter);

  app.use('/public', publicSurveyRoutes);
  app.use('/public', publicVizRoutes);
  app.use('/public', publicLandingRoutes);

  app.get('/exports/:fileName', authenticate, (req, res, next) => {
    const fileName = req.params.fileName;
    if (!/^[a-zA-Z0-9_.\-]+$/.test(fileName)) {
      throw new HttpError(400, 'INVALID_FILENAME', 'Invalid filename');
    }
    const filePath = path.join(process.cwd(), 'uploads', 'exports', fileName);
    if (!fs.existsSync(filePath)) {
      throw new HttpError(404, 'FILE_NOT_FOUND', 'Export file not found');
    }
    res.sendFile(filePath);
  });

  app.use(errorHandler);

  return app;
}
