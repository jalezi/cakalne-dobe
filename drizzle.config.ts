import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/*',
  dbCredentials: {
    url: process.env.DATABASE_URL,
    accountId: process.env.DATABASE_ACCOUNT_ID || undefined,
  },
  out: './drizzle',
  verbose: true,
  dialect: 'sqlite',
});
