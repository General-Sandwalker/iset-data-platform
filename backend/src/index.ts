import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/error-handler.js';
import { config } from './config/env.js';
import { runMigrations } from './core/migration-runner.js';

async function startServer() {
  await runMigrations();

  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.FRONTEND_URL }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use(errorHandler);

  const PORT = config.PORT || 4000;

  app.listen(PORT, () => {
    console.log(`ISET Backend running on port ${PORT}`);
    console.log(`Environment: ${config.NODE_ENV}`);
  });

  return app;
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});