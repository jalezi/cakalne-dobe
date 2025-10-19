import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/utils';

// https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: getSiteUrl(),
      lastModified: new Date().toISOString(),
      changeFrequency: 'daily',
      priority: 1,
    },
  ];
}
