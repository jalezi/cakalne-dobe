import type { Config } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config({ path: './.env.development.local' });
// dotenv.config({ path: './.env.production.local' });

export default {
  schema: './src/db/schema/*',
  driver: 'turso',
  dbCredentials: {
    url: process.env.DATABASE_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  },
  out: './drizzle',
  verbose: true,
} satisfies Config;
