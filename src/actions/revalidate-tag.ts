'use server';

import { revalidatePath, updateTag } from 'next/cache';

export const revalidateGetJson = async () => updateTag('getJson');

export const revalidatePathId = async () => revalidatePath(`/[id]`, 'page');
