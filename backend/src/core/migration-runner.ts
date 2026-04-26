import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pool, query } from '../config/database.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '../../migrations');

interface MigrationRecord {
  filename: string;
}

async function getExecutedMigrations(): Promise<string[]> {
  try {
    const result = await query<MigrationRecord>('SELECT filename FROM schema_migrations ORDER BY id');
    return result.rows.map((row) => row.filename);
  } catch {
    return [];
  }
}

async function recordMigration(filename: string): Promise<void> {
  await query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
}

async function runMigration(filename: string): Promise<void> {
  const filepath = join(MIGRATIONS_DIR, filename);
  const sql = readFileSync(filepath, 'utf-8');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await recordMigration(filename);
    await client.query('COMMIT');
    console.log(`✓ Migration executed: ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`✗ Migration failed: ${filename}`);
    throw error;
  } finally {
    client.release();
  }
}

export async function runMigrations(): Promise<void> {
  console.log('Running database migrations...');

  const executed = await getExecutedMigrations();
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const pending = files.filter((f) => !executed.includes(f));

  if (pending.length === 0) {
    console.log('No pending migrations. Database is up to date.');
    return;
  }

  console.log(`Found ${pending.length} pending migration(s).`);

  for (const file of pending) {
    await runMigration(file);
  }

  console.log('All migrations completed successfully.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => {
      console.log('Migration runner finished.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration runner failed:', err);
      process.exit(1);
    });
}