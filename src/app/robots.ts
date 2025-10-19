import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/utils';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*', // Applies to all search engines
      allow: ['/'],
    },
    sitemap: new URL('sitemap.xml', getSiteUrl()).toString(),
  };
}
