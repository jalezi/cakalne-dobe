import { db } from '@/db';

import { jobs } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

if (require.main === module) {
  (async () => {
    const allJobs = await db.select().from(jobs).orderBy(desc(jobs.startDate));
    const now = new Date();

    for (let i = 0; i < allJobs.length; i++) {
      const startDate = new Date(now);
      startDate.setDate(now.getDate() - i);
      const endDate = new Date(startDate);
      endDate.setSeconds(
        startDate.getSeconds() +
          Math.floor(Math.random() * (180 - 120 + 1)) +
          120
      );

      await db
        .update(jobs)
        .set({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        })
        .where(eq(jobs.id, allJobs[i].id));
    }
  })();
}
