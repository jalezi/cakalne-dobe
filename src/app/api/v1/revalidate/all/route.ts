import { revalidatePath } from 'next/cache';

export function GET() {
  revalidatePath('/', 'layout');
  revalidatePath('/', 'page');
  return Response.json({
    status: 'ok',
    data: 'revalidate all',
    meta: {
      paths: {
        layout: ['/'],
        page: ['/'],
      },
    },
  });
}
