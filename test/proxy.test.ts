import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { proxy } from '../src/proxy';

const WGET = 'Wget/1.21.4';
const GOOGLEBOT =
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const BROWSER =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';

function request(path: string, userAgent?: string) {
  return new NextRequest(
    `http://localhost${path}`,
    userAgent ? { headers: { 'user-agent': userAgent } } : undefined
  );
}

// NextResponse.next() marks a pass-through with this header
const PASS_THROUGH = 'x-middleware-next';

describe('proxy', () => {
  it.each([
    ['wget', WGET],
    ['Googlebot', GOOGLEBOT],
  ])('lets %s through to the webhook API', (_, userAgent) => {
    const response = proxy(request('/api/v1/insert-new-job-data/', userAgent));

    expect(response.headers.get(PASS_THROUGH)).toBe('1');
  });

  it('blocks a bot on a page with 403', () => {
    const response = proxy(request('/', WGET));

    expect(response.status).toBe(403);
    expect(response.headers.get(PASS_THROUGH)).toBeNull();
  });

  it('lets a browser through to a page', () => {
    const response = proxy(request('/', BROWSER));

    expect(response.headers.get(PASS_THROUGH)).toBe('1');
  });

  it('lets a request without a user agent through to a page', () => {
    const response = proxy(request('/'));

    expect(response.headers.get(PASS_THROUGH)).toBe('1');
  });
});
