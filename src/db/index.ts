import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { ENV_SERVER_VARS } from '@/lib/env';
const client = createClient({
  url: ENV_SERVER_VARS.DATABASE_URL,
  authToken: ENV_SERVER_VARS.DATABASE_AUTH_TOKEN,
});
export const db = drizzle(client);
