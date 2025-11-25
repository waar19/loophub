/**
 * Simple in-memory cache for API responses
 * Note: In production, consider using Redis or similar
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class SimpleCache {
  private cache: Map<string, CacheEntry<any>> = new Map();

  /**
   * Get cached value if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set a value in cache with TTL
   */
  set<T>(key: string, data: T, ttl: number = 60000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Delete a cached value
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

// Export singleton instance
export const cache = new SimpleCache();

// Cache keys
export const CACHE_KEYS = {
  forums: (slug?: string) => `forums:${slug || "all"}`,
  forumThreads: (slug: string, page: number, sort: string) =>
    `forum:${slug}:threads:${page}:${sort}`,
  thread: (id: string) => `thread:${id}`,
  threadComments: (id: string, page: number) => `thread:${id}:comments:${page}`,
  search: (query: string, type: string, page: number) =>
    `search:${query}:${type}:${page}`,
} as const;

// Cache TTLs (in milliseconds)
export const CACHE_TTL = {
  forums: 5 * 60 * 1000, // 5 minutes
  threads: 2 * 60 * 1000, // 2 minutes
  comments: 1 * 60 * 1000, // 1 minute
  search: 30 * 1000, // 30 seconds
} as const;

