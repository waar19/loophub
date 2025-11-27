/**
 * Simple in-memory rate limiter
 * For production, consider using Redis or a dedicated service
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

export function rateLimit(
  identifier: string,
  options: RateLimitOptions = { windowMs: 60000, maxRequests: 10 }
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = identifier;
  const { windowMs, maxRequests } = options;

  // Clean up expired entries periodically (every 1000 requests)
  if (Object.keys(store).length > 1000) {
    Object.keys(store).forEach((k) => {
      if (store[k].resetTime < now) {
        delete store[k];
      }
    });
  }

  const record = store[key];

  if (!record || record.resetTime < now) {
    // New window or expired
    store[key] = {
      count: 1,
      resetTime: now + windowMs,
    };
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs,
    };
  }

  if (record.count >= maxRequests) {
    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  // Increment count
  record.count++;
  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetTime: record.resetTime,
  };
}

/**
 * Get rate limit identifier from request
 */
export function getRateLimitIdentifier(request: Request): string {
  // Try to get user ID from headers (set by requireAuth)
  const userId = request.headers.get("x-user-id");
  if (userId) {
    return `user:${userId}`;
  }

  // Fallback to IP address
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0] : request.headers.get("x-real-ip") || "unknown";
  return `ip:${ip}`;
}

/**
 * Rate limit configuration for different endpoints
 */
export const RATE_LIMITS = {
  // Comments: 10 per minute
  comments: { windowMs: 60000, maxRequests: 10 },
  // Threads: 5 per hour
  threads: { windowMs: 3600000, maxRequests: 5 },
  // Search: 30 per minute
  search: { windowMs: 60000, maxRequests: 30 },
  // Reports: 5 per hour
  reports: { windowMs: 3600000, maxRequests: 5 },
  // Notifications: 60 per minute
  notifications: { windowMs: 60000, maxRequests: 60 },
  // Auth: 5 attempts per 15 minutes
  auth: { windowMs: 900000, maxRequests: 5 },
  // Signup: 3 per hour
  signup: { windowMs: 3600000, maxRequests: 3 },
  // Votes: 60 per minute
  votes: { windowMs: 60000, maxRequests: 60 },
  // User search (mentions): 30 per minute
  userSearch: { windowMs: 60000, maxRequests: 30 },
  // Image uploads: 10 per hour
  uploads: { windowMs: 3600000, maxRequests: 10 },
  // Default: 20 per minute
  default: { windowMs: 60000, maxRequests: 20 },
} as const;

export type RateLimitKey = keyof typeof RATE_LIMITS;

/**
 * Higher-order function to apply rate limiting to an API route handler
 * Use with Next.js App Router API routes
 * 
 * @example
 * import { withRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
 * 
 * export const POST = withRateLimit(
 *   async (request) => {
 *     // Your handler logic
 *     return NextResponse.json({ success: true });
 *   },
 *   'comments'
 * );
 */
export function withRateLimit<T>(
  handler: (request: Request, context?: T) => Promise<Response>,
  limitKey: RateLimitKey = 'default'
) {
  return async (request: Request, context?: T): Promise<Response> => {
    const identifier = getRateLimitIdentifier(request);
    const limits = RATE_LIMITS[limitKey];
    const result = rateLimit(`${limitKey}:${identifier}`, limits);

    // Add rate limit headers
    const headers = new Headers();
    headers.set('X-RateLimit-Limit', String(limits.maxRequests));
    headers.set('X-RateLimit-Remaining', String(result.remaining));
    headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetTime / 1000)));

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
      headers.set('Retry-After', String(retryAfter));
      
      return new Response(
        JSON.stringify({
          error: 'Too many requests',
          retryAfter,
          message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...Object.fromEntries(headers.entries()),
          },
        }
      );
    }

    // Call the actual handler
    const response = await handler(request, context);
    
    // Add rate limit headers to successful response
    const newHeaders = new Headers(response.headers);
    headers.forEach((value, key) => newHeaders.set(key, value));
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  };
}

/**
 * Check rate limit without wrapping - for use within existing handlers
 * Returns NextResponse with 429 if rate limited, null otherwise
 * 
 * @example
 * const rateLimited = checkRateLimit(request, 'comments');
 * if (rateLimited) return rateLimited;
 */
export function checkRateLimit(
  request: Request,
  limitKey: RateLimitKey = 'default'
): Response | null {
  const identifier = getRateLimitIdentifier(request);
  const limits = RATE_LIMITS[limitKey];
  const result = rateLimit(`${limitKey}:${identifier}`, limits);

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
    
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        retryAfter,
        message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(limits.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
          'Retry-After': String(retryAfter),
        },
      }
    );
  }

  return null;
}

