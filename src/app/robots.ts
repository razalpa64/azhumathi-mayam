import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();
  return {
    rules: [
      {
        userAgent: '*',
        // Public, indexable pages: the landing page and account entry.
        allow: ['/', '/login', '/register', '/sgpa-calculator'],
        // Signed-in app areas and file delivery are not for search engines.
        disallow: ['/dashboard/', '/admin/', '/api/', '/resources/', '/offline'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
