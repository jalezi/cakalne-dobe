'use server';

import { revalidatePath, updateTag } from 'next/cache';

export const revalidateGetJson = async () => updateTag('getJson');

export const revalidateHomePage = async () => revalidatePath('/', 'page');

export const revalidatePathId = revalidateHomePage;
