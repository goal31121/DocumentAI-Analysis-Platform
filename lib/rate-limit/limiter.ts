import { Redis } from '@upstash/redis';
import { getTierLimits, SubscriptionTier } from '@/lib/subscription/tiers';

// Note: In Next.js runtime, environment variables are automatically loaded.
// For standalone scripts, import '../scripts/load-env' at the top of the script file.

if (!process.env.UPSTASH_REDIS_URL || !process.env.UPSTASH_REDIS_TOKEN) {
  console.warn('Upstash Redis credentials not configured. Rate limiting will be disabled.');
}

// Initialize Redis client (singleton pattern)
let redisClient: Redis | null = null;

/**
 * Get or initialize the Redis client
 * @returns Redis client instance or null if not configured
 */
function getRedisClient(): Redis | null {
  if (!process.env.UPSTASH_REDIS_URL || !process.env.UPSTASH_REDIS_TOKEN) {
    return null;
  }

  if (!redisClient) {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_URL,
      token: process.env.UPSTASH_REDIS_TOKEN,
    });
  }

  return redisClient;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp when limit resets
  retryAfter?: number; // Seconds until retry is allowed
}

/**
 * Rate limit window types
 */
export type RateLimitWindow = 'minute' | 'hour' | 'day';

/**
 * Get rate limit key
 */
function getRateLimitKey(userId: string, action: string, window: RateLimitWindow): string {
  return `ratelimit:${userId}:${action}:${window}`;
}

/**
 * Get window duration in seconds
 */
function getWindowDuration(window: RateLimitWindow): number {
  switch (window) {
    case 'minute':
      return 60;
    case 'hour':
      return 60 * 60;
    case 'day':
      return 60 * 60 * 24;
    default:
      return 60;
  }
}

/**
 * Check rate limit for a user
 * @param userId - User ID
 * @param tier - Subscription tier
 * @param action - Action type (e.g., 'query', 'upload', 'process')
 * @param window - Time window (minute, hour, day)
 * @returns Rate limit result
 */
export async function checkRateLimit(
  userId: string,
  tier: SubscriptionTier = 'free',
  action: string = 'api',
  window: RateLimitWindow = 'hour'
): Promise<RateLimitResult> {
  const client = getRedisClient();
  if (!client) {
    // If Redis is not configured, allow all requests (no rate limiting)
    return {
      allowed: true,
      limit: -1,
      remaining: -1,
      reset: Date.now() + getWindowDuration(window) * 1000,
    };
  }

  const limits = getTierLimits(tier);
  let limit: number;

  // Get limit based on window type
  switch (window) {
    case 'minute':
      limit = limits.queriesPerMinute;
      break;
    case 'hour':
      limit = limits.queriesPerHour;
      break;
    case 'day':
      limit = limits.queriesPerDay;
      break;
    default:
      limit = limits.queriesPerHour;
  }

  // -1 means unlimited
  if (limit === -1) {
    return {
      allowed: true,
      limit: -1,
      remaining: -1,
      reset: Date.now() + getWindowDuration(window) * 1000,
    };
  }

  const key = getRateLimitKey(userId, action, window);
  const windowDuration = getWindowDuration(window);

  try {
    // Use Redis INCR with expiration for sliding window
    const current = await client.incr(key);
    
    // Set expiration on first request
    if (current === 1) {
      await client.expire(key, windowDuration);
    }

    const ttl = await client.ttl(key);
    const reset = Date.now() + (ttl > 0 ? ttl * 1000 : windowDuration * 1000);
    const remaining = Math.max(0, limit - current);
    const allowed = current <= limit;

    return {
      allowed,
      limit,
      remaining,
      reset,
      retryAfter: !allowed && ttl > 0 ? ttl : undefined,
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // On error, allow the request (fail open)
    return {
      allowed: true,
      limit,
      remaining: limit,
      reset: Date.now() + windowDuration * 1000,
    };
  }
}

/**
 * Check multiple rate limits (all must pass)
 * @param userId - User ID
 * @param tier - Subscription tier
 * @param action - Action type
 * @returns Combined rate limit result
 */
export async function checkMultipleRateLimits(
  userId: string,
  tier: SubscriptionTier = 'free',
  action: string = 'api'
): Promise<RateLimitResult> {
  const [minuteResult, hourResult, dayResult] = await Promise.all([
    checkRateLimit(userId, tier, action, 'minute'),
    checkRateLimit(userId, tier, action, 'hour'),
    checkRateLimit(userId, tier, action, 'day'),
  ]);

  // All windows must allow the request
  const allowed = minuteResult.allowed && hourResult.allowed && dayResult.allowed;

  // Return the most restrictive result
  const results = [minuteResult, hourResult, dayResult];
  const mostRestrictive = results.reduce((prev, curr) => {
    if (!curr.allowed) return curr;
    if (!prev.allowed) return prev;
    if (curr.remaining < prev.remaining) return curr;
    return prev;
  });

  return {
    allowed,
    limit: mostRestrictive.limit,
    remaining: Math.min(minuteResult.remaining, hourResult.remaining, dayResult.remaining),
    reset: mostRestrictive.reset,
    retryAfter: !allowed ? mostRestrictive.retryAfter : undefined,
  };
}

/**
 * Reset rate limit for a user (admin function)
 * @param userId - User ID
 * @param action - Action type
 * @param window - Time window
 * @returns True if successful
 */
export async function resetRateLimit(
  userId: string,
  action: string = 'api',
  window?: RateLimitWindow
): Promise<boolean> {
  const client = getRedisClient();
  if (!client) {
    return false;
  }

  try {
    if (window) {
      const key = getRateLimitKey(userId, action, window);
      await client.del(key);
    } else {
      // Reset all windows
      const windows: RateLimitWindow[] = ['minute', 'hour', 'day'];
      const keys = windows.map((w) => getRateLimitKey(userId, action, w));
      await client.del(...keys);
    }
    return true;
  } catch (error) {
    console.error('Rate limit reset error:', error);
    return false;
  }
}

/**
 * Get current rate limit status
 * @param userId - User ID
 * @param tier - Subscription tier
 * @param action - Action type
 * @returns Current rate limit status for all windows
 */
export async function getRateLimitStatus(
  userId: string,
  tier: SubscriptionTier = 'free',
  action: string = 'api'
): Promise<{
  minute: RateLimitResult;
  hour: RateLimitResult;
  day: RateLimitResult;
}> {
  const [minute, hour, day] = await Promise.all([
    checkRateLimit(userId, tier, action, 'minute'),
    checkRateLimit(userId, tier, action, 'hour'),
    checkRateLimit(userId, tier, action, 'day'),
  ]);

  return { minute, hour, day };
}

