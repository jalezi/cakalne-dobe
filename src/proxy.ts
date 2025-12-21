import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * List of known bot user agents to block
 * This includes search engine crawlers and common bot patterns
 */
const BOT_USER_AGENTS = [
  'googlebot',
  'bingbot',
  'slurp', // Yahoo
  'duckduckbot',
  'baiduspider',
  'yandexbot',
  'sogou',
  'exabot',
  'facebot',
  'facebookexternalhit',
  'ia_archiver',
  'bot',
  'crawl',
  'spider',
  'scraper',
  'curl',
  'wget',
];

/**
 * Check if the user agent string matches any known bot patterns
 */
function isBot(userAgent: string): boolean {
  const lowerUserAgent = userAgent.toLowerCase();
  return BOT_USER_AGENTS.some((botPattern) =>
    lowerUserAgent.includes(botPattern)
  );
}

export function proxy(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';
  const pathname = request.nextUrl.pathname;

  // Allow all API routes (webhooks and other API calls)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Block if the user agent matches a known bot pattern
  if (isBot(userAgent)) {
    return new NextResponse('Access denied', { status: 403 });
  }

  return NextResponse.next();
}

// Configure which paths the middleware should run on
// Adjust this to match your needs
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
