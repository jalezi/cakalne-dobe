import { sql } from 'drizzle-orm';
import { integer } from 'drizzle-orm/sqlite-core';

export const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`(cast(unixepoch() as int))`)
    .notNull(),
  updatedAt: integer('update_at', { mode: 'timestamp' })
    .default(sql`(cast(unixepoch() as int))`)
    .notNull()
    .$onUpdate(() => new Date()),
};
