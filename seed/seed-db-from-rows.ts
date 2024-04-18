/* eslint-disable no-console */
import fs from 'fs/promises';
import { cwd } from 'process';
import { seedHelpers } from './seed-helpers';
import { db } from '@/db';

import {
  jobs as jobsTable,
  institutions as institutionsTable,
  procedures as proceduresTable,
  waitingPeriods as waitingPeriodsTable,
  maxAllowedDays as maxAllowedDaysTable,
} from '@/db/schema';
import { z } from 'zod';

const dirName = `${cwd()}/mock-data/rows`;
const getDataFileNames = async () => await fs.readdir(dirName);

const FILE_NAMES = [
  'jobs',
  'institutions',
  'procedures',
  'waiting_periods',
  'max_allowed_days',
] as const;

const FILE_EXT = 'json' as const;

const commonDBRowSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

const jobDBRowSchema = commonDBRowSchema.merge(
  z.object({
    git_lab_job_id: z.string(),
    start_date: z.string(),
    end_date: z.string(),
  })
);

const institutionsDBRowSchema = commonDBRowSchema.merge(
  z.object({
    name: z.string(),
  })
);

const proceduresDBRowSchema = commonDBRowSchema.merge(
  z.object({
    code: z.string(),
    name: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
  })
);

const maxAllowedDaysDBRowSchema = commonDBRowSchema.merge(
  z.object({
    regular: z.number(),
    fast: z.number(),
    very_fast: z.number(),
    job_id: z.string(),
    procedure_id: z.string(),
  })
);

const waitingPeriodsDBRowSchema = commonDBRowSchema.merge(
  z.object({
    id: z.string().nullish(),
    regular: z.number().nullable(),
    fast: z.number().nullable(),
    very_fast: z.number().nullable(),
    job_id: z.string(),
    institution_id: z.string(),
    procedure_id: z.string(),
  })
);

export const seedDBFromRows = async (input: boolean = false) => {
  console.info('--- Seeding database from rows...');

  if (input) {
    console.info('--- Deleting tables...');
    const deletingResult = await seedHelpers.deleteTables();
    if (!deletingResult.success) {
      console.warn('Error deleting tables: ', deletingResult.error.message);
      console.error(deletingResult.error);
      process.exit(1);
    }
  }

  console.info('--- Getting data from files...');
  const dataFileNames = await getDataFileNames();
  const areValidFiles = dataFileNames.every((fileName) => {
    const isValidExt = fileName.endsWith(`.${FILE_EXT}`);
    const isValidName = FILE_NAMES.includes(
      fileName.replace(`.${FILE_EXT}`, '')
    );
    return isValidExt && isValidName;
  });
  if (!areValidFiles) {
    console.error('Invalid file names');
    process.exit(1);
  }

  const chunkSize = 50;

  console.info('--- Inserting data into tables...');

  // JOBS
  console.info('--- Reading jobs data...');
  const jobs = await fs.readFile(`${dirName}/jobs.${FILE_EXT}`, 'utf-8');
  const jobsData = JSON.parse(jobs) as unknown[];
  const jobsChunks = [];
  console.info('--- Inserting jobs...');
  for (let i = 0; i < jobsData.length; i += chunkSize) {
    jobsChunks.push(jobsData.slice(i, i + chunkSize));
  }
  for (const chunk of jobsChunks) {
    const safeChunk = chunk.map((job) =>
      jobDBRowSchema
        .transform((val) => ({
          id: val.id,
          startDate: val.start_date,
          endDate: val.end_date,
          gitLabJobId: val.git_lab_job_id,
          createdAt: new Date(val.created_at),
          updatedAt: new Date(val.updated_at),
        }))
        .parse(job)
    );
    await db.insert(jobsTable).values(safeChunk).run();
  }

  // INSTITUTIONS
  console.info('--- Reading institutions data...');
  const institutions = await fs.readFile(
    `${dirName}/institutions.${FILE_EXT}`,
    'utf-8'
  );
  const institutionsData = JSON.parse(institutions) as unknown[];
  const institutionsChunks = [];
  console.info('--- Inserting institutions...');
  for (let i = 0; i < institutionsData.length; i += chunkSize) {
    institutionsChunks.push(institutionsData.slice(i, i + chunkSize));
  }
  for (const chunk of institutionsChunks) {
    const safeChunk = chunk.map((institution) =>
      institutionsDBRowSchema
        .transform((val) => ({
          id: val.id,
          name: val.name,
          createdAt: new Date(val.created_at),
          updatedAt: new Date(val.updated_at),
        }))
        .parse(institution)
    );
    await db.insert(institutionsTable).values(safeChunk).run();
  }

  // PROCEDURES
  console.info('--- Reading procedures data...');
  const procedures = await fs.readFile(
    `${dirName}/procedures.${FILE_EXT}`,
    'utf-8'
  );
  const proceduresData = JSON.parse(procedures) as unknown[];
  const proceduresChunks = [];
  console.info('--- Inserting procedures...');
  for (let i = 0; i < proceduresData.length; i += chunkSize) {
    proceduresChunks.push(proceduresData.slice(i, i + chunkSize));
  }
  for (const chunk of proceduresChunks) {
    const safeChunk = chunk.map((procedure) =>
      proceduresDBRowSchema
        .transform((val) => ({
          id: val.id,
          code: val.code,
          name: val.name,
          createdAt: new Date(val.created_at),
          updatedAt: new Date(val.updated_at),
        }))
        .parse(procedure)
    );
    await db.insert(proceduresTable).values(safeChunk).run();
  }

  // MAX ALLOWED DAYS
  console.info('--- Reading max allowed days data...');
  const maxAllowedDays = await fs.readFile(
    `${dirName}/max_allowed_days.${FILE_EXT}`,
    'utf-8'
  );
  const maxAllowedDaysData = JSON.parse(maxAllowedDays) as unknown[];
  const maxAllowedDaysChunks = [];
  console.info('--- Inserting max allowed days...');
  for (let i = 0; i < maxAllowedDaysData.length; i += chunkSize) {
    maxAllowedDaysChunks.push(maxAllowedDaysData.slice(i, i + chunkSize));
  }
  for (const chunk of maxAllowedDaysChunks) {
    const safeChunk = chunk.map((maxAllowedDay) => {
      return maxAllowedDaysDBRowSchema
        .transform((val) => ({
          id: val.id,
          regular: val.regular,
          fast: val.fast,
          veryFast: val.very_fast,
          jobId: val.job_id,
          procedureId: val.procedure_id,
          createdAt: new Date(val.created_at),
          updatedAt: new Date(val.updated_at),
        }))
        .parse(maxAllowedDay);
    });
    await db.insert(maxAllowedDaysTable).values(safeChunk).run();
  }

  // WAITING PERIODS
  console.info('--- Reading waiting periods data...');
  const waitingPeriods = await fs.readFile(
    `${dirName}/waiting_periods.${FILE_EXT}`,
    'utf-8'
  );
  const waitingPeriodsData = JSON.parse(waitingPeriods) as unknown[];
  const waitingPeriodsChunks = [];
  console.info('--- Inserting waiting periods...');
  for (let i = 0; i < waitingPeriodsData.length; i += chunkSize) {
    waitingPeriodsChunks.push(waitingPeriodsData.slice(i, i + chunkSize));
  }
  for (const chunk of waitingPeriodsChunks) {
    const safeChunk = chunk.map((waitingPeriod) =>
      waitingPeriodsDBRowSchema
        .transform((val) => ({
          regular: val.regular,
          fast: val.fast,
          veryFast: val.very_fast,
          jobId: val.job_id,
          institutionId: val.institution_id,
          procedureId: val.procedure_id,
          createdAt: new Date(val.created_at),
          updatedAt: new Date(val.updated_at),
        }))
        .parse(waitingPeriod)
    );
    await db.insert(waitingPeriodsTable).values(safeChunk).run();
  }

  console.info('--- Done!');
};
