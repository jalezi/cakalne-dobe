import { cache } from 'react';
import 'server-only';

const BASE_URL = 'https://mitar.gitlab.io/-/cakalne-dobe/-/jobs';
const JSON_OUT_PATH = '/artifacts/out.json';

export const preload = (id: string) => {
  void getJson(id);
};

export const checkIsAvailable = async (id: string) => {
  try {
    const fileResponse = await fetch(`${BASE_URL}/${id}${JSON_OUT_PATH}`);
    return fileResponse.ok;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const getJson = cache(async (id: string) => {
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
});
