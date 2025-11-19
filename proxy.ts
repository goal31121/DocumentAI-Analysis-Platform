import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Proxy for bot protection and API security
 * Blocks known bad bots and provides basic API protection
 *
 * Reference: https://nextjs.org/docs/app/building-your-application/routing/middleware
 * Note: Middleware has been renamed to Proxy in Next.js 16+
 */

// List of known bad bot user agents
const BAD_BOTS = [
  'ahrefsbot',
  'semrushbot',
  'mj12bot',
  'dotbot',
  'blexbot',
  'dataforseobot',
  'megaindex',
  'zoominfobot',
  'ccbot',
  'gptbot',
  'chatgpt-user',
  'anthropic-ai',
  'claude-web',
  'perplexitybot',
  'omgilibot',
  'facebookbot',
  'facebookexternalhit',
  'twitterbot',
  'rogerbot',
  'linkdexbot',
  'bytespider',
  'yandex',
  'yandexbot',
  'scrapy',
  'python-requests',
  'curl',
  'wget',
  'go-http-client',
  'java',
  'apache-httpclient',
  'postman',
  'insomnia',
];

// List of known good bots (allowed)
const GOOD_BOTS = ['googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider', 'applebot', 'msnbot', 'ia_archiver'];

/**
 * Check if user agent is a bad bot
 */
function isBadBot(userAgent: string | null): boolean {
  if (!userAgent) {
    return false; // Allow requests without user agent (browsers)
  }

  const ua = userAgent.toLowerCase();

  // Check if it's a known good bot first
  if (GOOD_BOTS.some((bot) => ua.includes(bot))) {
    return false;
  }

  // Check if it's a known bad bot
  return BAD_BOTS.some((bot) => ua.includes(bot));
}

/**
 * Check if request is from a bot (any bot, good or bad)
 */
function isBot(userAgent: string | null): boolean {
  if (!userAgent) {
    return false;
  }

  const ua = userAgent.toLowerCase();
  const botPatterns = ['bot', 'crawler', 'spider', 'scraper', 'crawling', 'fetcher', 'indexer'];

  return botPatterns.some((pattern) => ua.includes(pattern));
}

export function proxy(request: NextRequest) {
  const userAgent = request.headers.get('user-agent');
  const pathname = request.nextUrl.pathname;

  // Block bad bots from all routes
  if (isBadBot(userAgent)) {
    console.log(`Blocked bad bot: ${userAgent} accessing ${pathname}`);
    return new NextResponse('Forbidden', { status: 403 });
  }

  // Block all bots from API routes (except good bots for public endpoints)
  if (pathname.startsWith('/api/')) {
    // Allow good bots only for public GET endpoints (if needed)
    if (isBot(userAgent) && !GOOD_BOTS.some((bot) => userAgent?.toLowerCase().includes(bot))) {
      console.log(`Blocked bot from API: ${userAgent} accessing ${pathname}`);
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Additional protection: Block requests without proper headers for POST/PUT/DELETE
    const method = request.method;
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      const contentType = request.headers.get('content-type');
      const referer = request.headers.get('referer');
      const origin = request.headers.get('origin');

      // For API routes, require either:
      // 1. Content-Type header (for API clients)
      // 2. Referer/Origin header (for browser requests)
      if (!contentType && !referer && !origin) {
        // This might be a bot/scraper trying to POST
        if (isBot(userAgent)) {
          console.log(`Blocked bot POST request: ${userAgent} accessing ${pathname}`);
          return new NextResponse('Forbidden', { status: 403 });
        }
      }
    }
  }

  // Allow all other requests
  return NextResponse.next();
}

// Configure which routes the proxy runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};

