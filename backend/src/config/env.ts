function requireEnv(name: string): string {
  const value = process.env[name];
  const isTest = process.env.NODE_ENV === 'test';
  if (!value) {
    if (isTest) return `test-${name.toLowerCase()}`;
    console.error(`FATAL: ${name} must be set to a secure value in environment`);
    process.exit(1);
  }
  if (!isTest && (value === 'change-me-in-production' || value === 'change-me')) {
    console.error(`FATAL: ${name} must be set to a secure value in environment`);
    process.exit(1);
  }
  return value;
}

export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/iset_db',
  JWT_SECRET: requireEnv('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  SUPER_ADMIN_USERNAME: requireEnv('SUPER_ADMIN_USERNAME'),
  SUPER_ADMIN_PASSWORD: requireEnv('SUPER_ADMIN_PASSWORD'),
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  UPLOAD_MAX_SIZE: parseInt(process.env.UPLOAD_MAX_SIZE || '52428800', 10),
  BCRYPT_ROUNDS: 12,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
} as const;