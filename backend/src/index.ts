import 'dotenv/config';
import { config } from './config/env.js';
import { runMigrations } from './core/migration-runner.js';
import { seedSuperAdmin } from './core/super-admin-seeder.js';
import { createApp } from './app.js';

async function startServer() {
  await runMigrations();
  await seedSuperAdmin();

  const app = createApp();
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
