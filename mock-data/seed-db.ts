/* eslint-disable no-console */

import * as readline from 'readline';
import { seedDBFromJobs } from './seed-db-from-jobs';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

if (require.main === module) {
  rl.question('Delete tables: N/y', (answer: string) => {
    if (['Y', 'y'].includes(answer)) {
      seedDBFromJobs(true);
    } else {
      seedDBFromJobs();
    }
    rl.close();
  });
} else {
  console.info('This file was imported from another file');
}
