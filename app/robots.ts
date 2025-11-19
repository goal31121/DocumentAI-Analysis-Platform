import type { MetadataRoute } from 'next';

/**
 * robots.txt configuration
 * Controls which bots/crawlers can access which parts of the site
 *
 * Reference: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://docai-analysis-platform.vercel.app';

  return {
    rules: [
      {
        // Allow all good bots to crawl public pages
        userAgent: '*',
        allow: ['/', '/sign-in', '/sign-up'],
        disallow: [
          // Block all API routes from bots
          '/api/',
          // Block dashboard pages (require authentication)
          '/documents',
          '/analytics',
          '/settings',
          // Block admin/internal routes
          '/_next/',
          '/admin/',
        ],
      },
      // Specifically allow major search engines
      {
        userAgent: ['Googlebot', 'Bingbot', 'Slurp', 'DuckDuckBot', 'Baiduspider'],
        allow: ['/', '/sign-in', '/sign-up'],
        disallow: ['/api/', '/documents', '/analytics', '/settings'],
      },
      // Block known bad bots and scrapers
      {
        userAgent: [
          'AhrefsBot',
          'SemrushBot',
          'MJ12bot',
          'DotBot',
          'BlexBot',
          'BLEXBot',
          'DataForSeoBot',
          'MegaIndex',
          'ZoominfoBot',
          'CCBot',
          'GPTBot',
          'ChatGPT-User',
          'anthropic-ai',
          'Claude-Web',
          'PerplexityBot',
          'Applebot-Extended',
          'Omgilibot',
          'FacebookBot',
          'facebookexternalhit',
          'Twitterbot',
          'rogerbot',
          'linkdexbot',
          'Bytespider',
          'Yandex',
          'YandexBot',
        ],
        disallow: ['/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
