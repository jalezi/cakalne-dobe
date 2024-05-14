import { getSiteUrl } from '@/lib/utils';
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*', // Applies to all search engines
      allow: ['/'],
    },
    sitemap: new URL('sitemap.xml', getSiteUrl()).toString(),
  };
}
