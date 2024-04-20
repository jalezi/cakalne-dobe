import fs from 'fs/promises';

import { allDataSchema, type AllData } from '@/lib/zod-schemas/data-schemas';
import type { CustomError, DataMap } from './types';
import { handleError } from '@/utils/handle-error';

const getJobIdFromFileName = (fileName: string) =>
  fileName.split('.')[0].split('-').pop();

export async function getDataFromFiles(
  fileNames: string[],
  dirName: string
): Promise<{
  data: DataMap;
  errors: CustomError[] | null;
}> {
  const data: Map<string, AllData> = new Map();
  const errors: CustomError[] = [];
  for (const fileName of fileNames) {
    try {
      const file = await fs.readFile(`${dirName}/${fileName}`, 'utf8');
      const parsedFile = JSON.parse(file);
      const parsedData = allDataSchema.parse(parsedFile);
      const jobId = getJobIdFromFileName(fileName);
      if (!jobId) throw new Error('Job ID not found in file name');
      data.set(jobId, parsedData);
    } catch (error) {
      const newError = handleError(error);
      errors.push({ error: newError, meta: { fileName } });
      continue;
    }
  }
  if (errors.length > 0) {
    return { errors, data };
  }

  return { data, errors: null };
}
