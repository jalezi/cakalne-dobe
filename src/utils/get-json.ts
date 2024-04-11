const BASE_URL = 'https://mitar.gitlab.io/-/cakalne-dobe/-/jobs';
const JSON_OUT_PATH = '/artifacts/out.json';

export const getJson = async (id: string) => {
  try {
    const fileResponse = await fetch(`${BASE_URL}/${id}${JSON_OUT_PATH}`);
    if (!fileResponse.ok) {
      throw new Error('Failed to fetch data');
    }
    const data = await fileResponse.json();
    return data;
  } catch (error) {
    console.log(error);
    throw new Error('Unknown error');
  }
};
