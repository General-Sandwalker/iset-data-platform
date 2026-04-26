import bcrypt from 'bcrypt';
import { query } from '../config/database.js';
import { config } from '../config/env.js';

interface User {
  id: string;
  role: string;
}

const BCRYPT_ROUNDS = 12;

export async function seedSuperAdmin(): Promise<void> {
  if (!config.SUPER_ADMIN_USERNAME || !config.SUPER_ADMIN_PASSWORD) {
    console.error('FATAL: SUPER_ADMIN_USERNAME and SUPER_ADMIN_PASSWORD must be set in environment');
    process.exit(1);
  }

  const result = await query<User>(
    "SELECT id FROM users WHERE role = 'super_admin' LIMIT 1"
  );

  if (result.rows.length > 0) {
    console.log('Super admin already exists. Skipping seeding.');
    return;
  }

  const passwordHash = await bcrypt.hash(config.SUPER_ADMIN_PASSWORD, BCRYPT_ROUNDS);

  await query(
    `INSERT INTO users (cin, email, password_hash, role, first_name, last_name, is_active, must_change_password)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      null,
      `${config.SUPER_ADMIN_USERNAME}@iset.local`,
      passwordHash,
      'super_admin',
      'Super',
      'Admin',
      true,
      true,
    ]
  );

  console.log(`Super admin seeded: ${config.SUPER_ADMIN_USERNAME}`);
}