/**
 * Rate Limiting Middleware
 */

import { Elysia } from 'elysia';
import { RateLimiter } from '@/utils/rate-limiter';
import { env } from '@/config/env';
import { RATE_LIMIT_SKIP_PATHS } from '@/config/constants';

// Create rate limiter instance
const limiter = new RateLimiter(
  env.RATE_LIMIT_MAX,
  env.RATE_LIMIT_WINDOW_MS
);

/**
 * Rate limiting middleware
 */
export const rateLimiting = (app: Elysia) =>
  app.onBeforeHandle(({ request, set, path }) => {
    // Skip rate limiting for certain paths
    if (!env.ENABLE_RATE_LIMITING || RATE_LIMIT_SKIP_PATHS.some(p => path.startsWith(p))) {
      return;
    }

    // Use IP address as key (or X-Forwarded-For if behind proxy)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() 
      || request.headers.get('x-real-ip')
      || 'unknown';

    if (!limiter.check(ip)) {
      const resetTime = limiter.getResetTime(ip);
      
      set.status = 429;
      set.headers['Retry-After'] = Math.ceil(resetTime / 1000).toString();
      set.headers['X-RateLimit-Limit'] = env.RATE_LIMIT_MAX.toString();
      set.headers['X-RateLimit-Remaining'] = '0';
      set.headers['X-RateLimit-Reset'] = new Date(Date.now() + resetTime).toISOString();
      
      throw new Error('Too many requests. Please try again later.');
    }

    // Add rate limit headers
    const remaining = limiter.getRemaining(ip);
    const resetTime = limiter.getResetTime(ip);
    
    set.headers['X-RateLimit-Limit'] = env.RATE_LIMIT_MAX.toString();
    set.headers['X-RateLimit-Remaining'] = remaining.toString();
    set.headers['X-RateLimit-Reset'] = new Date(Date.now() + resetTime).toISOString();
  });
