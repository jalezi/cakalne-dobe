import { allDataSchema, type AllData } from '@/lib/zod-schemas/data-schemas';

const BASE_URL = new URL('https://wayback-automachine.gitlab.io');
export const BASE_JOBS_URL = new URL('-/cakalne-dobe/-/jobs', BASE_URL);
const JSON_OUT_PATH = '/artifacts/out.json';

export const getJsonPath = (id: string) =>
  `${BASE_JOBS_URL}/${id}${JSON_OUT_PATH}`;

export const getJson = async (id: string): Promise<AllData> => {
  try {
    const fileResponse = await fetch(`${BASE_JOBS_URL}/${id}${JSON_OUT_PATH}`, {
      next: { tags: ['getJson'] },
      cache: 'no-store',
    });
    if (!fileResponse.ok) {
      throw new Error('Failed to fetch data');
    }
    const data = await fileResponse.json();
    const parsedData = allDataSchema.safeParse(data);
    if (!parsedData.success) {
      console.error(parsedData.error.errors);
      throw new Error('Invalid data');
    }

    return parsedData.data;
  } catch (error) {
    console.error(error);
    throw new Error('Unknown error');
  }
};
