import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config({ path: './.env.production.local' });
console.log(process.env.DATABASE_URL);
console.log(process.env.DATABASE_AUTH_TOKEN);

export default defineConfig({
  schema: './src/db/schema/*',

  dbCredentials: {
    url: process.env.DATABASE_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  },
  out: './drizzle',
  verbose: true,
  dialect: 'turso',
});
