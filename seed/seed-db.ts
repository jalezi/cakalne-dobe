/* eslint-disable no-console */

import * as readline from 'readline';
import { seedDBFromJobs } from './seed-db-from-jobs';
import { seedDBFromRows } from './seed-db-from-rows';

type Source = 'jobs' | 'rows';

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

const getSourceAnswer = (): Promise<'rows' | 'jobs'> => {
  return new Promise((resolve) => {
    rl.question('source: JOBS/rows: ', (answer: string) => {
      resolve(['ROWS', 'Rows', 'rows'].includes(answer) ? 'rows' : 'jobs');
    });
  });
};

if (require.main === module) {
  let deleteTables = false;
  let source = 'jobs';

  getSourceAnswer()
    .then((answer: Source) => {
      source = answer;
      return getDeleteTablesAnswer();
    })
    .then((answer: boolean) => {
      deleteTables = answer;
    })
    .then(() => {
      rl.close();

      switch (source) {
        case 'jobs':
          seedDBFromJobs(deleteTables).then(() => console.info('Done'));
          break;
        case 'rows':
          seedDBFromRows(deleteTables).then(() => console.info('Done'));
          break;
        default:
          console.error('Invalid source');
          process.exit(1);
      }
    });
} else {
  console.info('This file was imported from another file');
}
