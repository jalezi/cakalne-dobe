const BASE_URL = new URL('https://mitar.gitlab.io');
export const BASE_JOBS_URL = new URL('-/cakalne-dobe/-/jobs', BASE_URL);
const JSON_OUT_PATH = '/artifacts/out.json';

export const getJson = async (id: string) => {
  try {
    const fileResponse = await fetch(`${BASE_JOBS_URL}/${id}${JSON_OUT_PATH}`);
    if (!fileResponse.ok) {
      throw new Error('Failed to fetch data');
    }
    const data = await fileResponse.json();
    return data;
  } catch (error) {
    console.error(error);
    throw new Error('Unknown error');
  }
};
