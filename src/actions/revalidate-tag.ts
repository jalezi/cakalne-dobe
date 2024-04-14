'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

export const revalidateGetJson = async () => revalidateTag('getJson');

export const revalidatePathId = async () => revalidatePath(`/[id]`, 'page');
