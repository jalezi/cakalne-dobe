'use server';

import { revalidateTag } from 'next/cache';

export const revalidateGetJson = async () => revalidateTag('getJson');
