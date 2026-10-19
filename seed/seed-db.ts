/** biome-ignore-all lint/suspicious/noConsole: We need for debug */

import * as readline from 'readline';
import { seedDBFromJobs } from './seed-db-from-jobs';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const getDeleteTablesAnswer = (): Promise<boolean> => {
  return new Promise((resolve) => {
    rl.question('Delete tables: N/y: ', (answer: string) => {
      resolve(['Y', 'y'].includes(answer));
    });
  });
};

if (require.main === module) {
  getDeleteTablesAnswer()
    .then((deleteTables: boolean) => {
      rl.close();
      return seedDBFromJobs(deleteTables);
    })
    .then(({ errors }) => {
      if (errors.length > 0) {
        process.exit(1);
      }
      console.info('--- Database seeded successfully!');
      process.exit(0);
    });
} else {
  console.info('This file was imported from another file');
}
