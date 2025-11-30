import { NextResponse } from 'next/server';
import { checkMultipleRateLimits, RateLimitResult } from './limiter';
import { SubscriptionTier } from '@/lib/subscription/tiers';

/**
 * Rate limit middleware helper
 * Returns a NextResponse with rate limit headers if exceeded, or null if allowed
 */
export async function rateLimitMiddleware(
  userId: string,
  tier: SubscriptionTier = 'free',
  action: string = 'api'
): Promise<{ response: NextResponse | null; rateLimit: RateLimitResult }> {
  const rateLimit = await checkMultipleRateLimits(userId, tier, action);

  if (!rateLimit.allowed) {
    const response = NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: `You have exceeded your rate limit. Please try again later.`,
        retryAfter: rateLimit.retryAfter,
      },
      { status: 429 }
    );

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', rateLimit.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(rateLimit.reset).toISOString());
    if (rateLimit.retryAfter) {
      response.headers.set('Retry-After', rateLimit.retryAfter.toString());
    }

    return { response, rateLimit };
  }

  // Add rate limit headers even when allowed
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', rateLimit.limit.toString());
  response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
  response.headers.set('X-RateLimit-Reset', new Date(rateLimit.reset).toISOString());

  return { response: null, rateLimit };
}
