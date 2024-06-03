import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema/*',
  driver: 'turso',
  dbCredentials: {
    url: process.env.DATABASE_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  },
  out: './drizzle',
  verbose: true,
  // @ts-expect-error missing types
  dialect: 'sqlite',
} satisfies Config;
