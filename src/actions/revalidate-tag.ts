'use server';

import { revalidatePath, updateTag } from 'next/cache';

export const revalidateGetJson = async () => updateTag('getJson');

const _revalidateHomePage = async () => revalidatePath('/', 'page');

export const revalidatePathId = async () => revalidatePath('/', 'page');
