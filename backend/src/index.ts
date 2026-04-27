import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/error-handler.js';
import { config } from './config/env.js';
import { runMigrations } from './core/migration-runner.js';
import { seedSuperAdmin } from './core/super-admin-seeder.js';
import { globalLimiter, authLimiter, aiLimiter } from './middleware/rate-limit.js';
import authRoutes from './core/auth/routes.js';
import authAdminRoutes from './core/auth/admin-routes.js';
import userRoutes from './core/users/routes.js';
import userImportRoutes from './core/users/import-routes.js';
import schemaRoutes from './schema-engine/routes.js';
import importRoutes from './data-ingestion/routes.js';
import aiRoutes from './ai-services/routes.js';
import { sendSuccess } from './middleware/response.js';

async function startServer() {
  await runMigrations();
  await seedSuperAdmin();

  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.FRONTEND_URL }));
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
  apiRouter.use('/ai', aiLimiter, aiRoutes);

  app.use('/api/v1', apiRouter);

  app.use(errorHandler);

  const PORT = config.PORT || 4000;

  app.listen(PORT, () => {
    console.log(`ISET Backend running on http://localhost:${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api/v1`);
    console.log(`Environment: ${config.NODE_ENV}`);
  });

  return app;
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});