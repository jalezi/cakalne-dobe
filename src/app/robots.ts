import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/utils';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*', // Applies to all search engines and bots
      disallow: ['/'], // Block all pages from being crawled
    },
    sitemap: new URL('sitemap.xml', getSiteUrl()).toString(),
  };
}
