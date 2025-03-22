import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config({ path: './.env.development.local' });

export default defineConfig({
  schema: './src/db/schema/*',
  dbCredentials: {
    url: process.env.DATABASE_URL,
    accountId: process.env.DATABASE_AUTH_TOKEN || undefined,
  },
  out: './drizzle',
  verbose: true,
  dialect: 'sqlite',
});
