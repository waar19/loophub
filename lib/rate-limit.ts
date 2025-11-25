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
  // Default: 20 per minute
  default: { windowMs: 60000, maxRequests: 20 },
} as const;

