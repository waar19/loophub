/**
 * Cache management operations for PWA offline support
 * Requirements: 4.4, 5.1, 5.2
 *
 * Provides functions for cache size calculation, pruning, and clearing.
 * Ensures app shell items are preserved during cleanup operations.
 */

import { threadsStore, commentsStore, queueStore, estimateStorageSize } from './db';
import { CACHE_CONFIG } from './types';

// ============================================================================
// App Shell Items (must be preserved during pruning/clearing)
// ============================================================================

/**
 * URLs that constitute the app shell and must never be removed from cache.
 * These are essential for the app to function offline.
 */
export const APP_SHELL_ITEMS = ['/', '/offline', '/manifest.json'] as const;

// ============================================================================
// Cache Size Calculation (Requirement 5.1)
// ============================================================================

/**
 * Estimates the total IndexedDB usage in bytes.
 * Uses the Storage API when available, falls back to manual estimation.
 *
 * @returns Estimated cache size in bytes
 */
export async function getCacheSize(): Promise<number> {
  return estimateStorageSize();
}

/**
 * Gets detailed cache statistics including item counts and estimated sizes.
 *
 * @returns Object with cache statistics
 */
export async function getCacheStats(): Promise<{
  totalSize: number;
  threadCount: number;
  commentCount: number;
  queueCount: number;
  threadSize: number;
  commentSize: number;
  queueSize: number;
}> {
  const [threads, comments, queue] = await Promise.all([
    threadsStore.getAll(),
    commentsStore.getAll(),
    queueStore.getAll(),
  ]);

  const threadSize = JSON.stringify(threads).length;
  const commentSize = JSON.stringify(comments).length;
  const queueSize = JSON.stringify(queue).length;

  return {
    totalSize: threadSize + commentSize + queueSize,
    threadCount: threads.length,
    commentCount: comments.length,
    queueCount: queue.length,
    threadSize,
    commentSize,
    queueSize,
  };
}


// ============================================================================
// Cache Pruning (Requirements 4.4, 5.2)
// ============================================================================

/**
 * Checks if the cache size exceeds the maximum allowed size.
 *
 * @param currentSize - Current cache size in bytes (optional, will be calculated if not provided)
 * @param maxSize - Maximum allowed size in bytes (defaults to CACHE_CONFIG.maxCacheSize)
 * @returns true if cache exceeds max size
 */
export async function isCacheOverLimit(
  currentSize?: number,
  maxSize: number = CACHE_CONFIG.maxCacheSize
): Promise<boolean> {
  const size = currentSize ?? (await getCacheSize());
  return size > maxSize;
}

/**
 * Removes the oldest cached entries to bring cache size under the limit.
 * Preserves app shell items (/, /offline, /manifest.json).
 *
 * Property 9: Cache pruning preserves app shell
 * For any cache pruning operation, the essential app shell items
 * (/, /offline, /manifest.json) should never be removed.
 *
 * @param targetSize - Target size to prune to (defaults to 80% of maxCacheSize)
 * @returns Number of items removed
 */
export async function pruneCache(
  targetSize: number = CACHE_CONFIG.maxCacheSize * 0.8
): Promise<number> {
  let itemsRemoved = 0;
  let currentSize = await getCacheSize();

  // If already under target, no pruning needed
  if (currentSize <= targetSize) {
    return 0;
  }

  // Get all threads sorted by cachedAt (oldest first)
  const threads = await threadsStore.getByCachedAt(true);

  // Remove oldest threads until under target size
  for (const thread of threads) {
    if (currentSize <= targetSize) {
      break;
    }

    // Calculate approximate size of this thread
    const threadSize = JSON.stringify(thread).length;

    // Delete thread and its associated comments
    await threadsStore.delete(thread.id);
    await commentsStore.deleteByThreadId(thread.id);

    // Get size of deleted comments
    const comments = await commentsStore.getByThreadId(thread.id);
    const commentsSize = JSON.stringify(comments).length;

    currentSize -= threadSize + commentsSize;
    itemsRemoved++;
  }

  // If still over target, remove orphaned comments (oldest first)
  if (currentSize > targetSize) {
    const allComments = await commentsStore.getAll();
    const sortedComments = allComments.sort((a, b) => a.cachedAt - b.cachedAt);

    for (const comment of sortedComments) {
      if (currentSize <= targetSize) {
        break;
      }

      const commentSize = JSON.stringify(comment).length;
      await commentsStore.delete(comment.id);
      currentSize -= commentSize;
      itemsRemoved++;
    }
  }

  console.log(`[CacheManagement] Pruned ${itemsRemoved} items from cache`);
  return itemsRemoved;
}

/**
 * Automatically prunes cache if it exceeds the maximum size.
 * Should be called after caching new content.
 *
 * @returns Number of items removed (0 if no pruning needed)
 */
export async function autoPruneIfNeeded(): Promise<number> {
  const isOverLimit = await isCacheOverLimit();
  if (isOverLimit) {
    console.log('[CacheManagement] Cache over limit, starting auto-prune');
    return pruneCache();
  }
  return 0;
}

// ============================================================================
// Clear Cache (Requirement 5.2)
// ============================================================================

/**
 * Clears all cached content except essential app shell.
 * Also resets the offline queue.
 *
 * @returns Object with counts of cleared items
 */
export async function clearCache(): Promise<{
  threadsCleared: number;
  commentsCleared: number;
  queueCleared: number;
}> {
  // Get counts before clearing
  const threadCount = await threadsStore.count();
  const commentCount = await commentsStore.count();
  const queueCount = await queueStore.count();

  // Clear all stores
  await Promise.all([
    threadsStore.clear(),
    commentsStore.clear(),
    queueStore.clear(),
  ]);

  console.log(
    `[CacheManagement] Cleared cache: ${threadCount} threads, ${commentCount} comments, ${queueCount} queue items`
  );

  return {
    threadsCleared: threadCount,
    commentsCleared: commentCount,
    queueCleared: queueCount,
  };
}

/**
 * Clears only the content cache (threads and comments), preserving the offline queue.
 * Useful when user wants to free space but keep pending actions.
 *
 * @returns Object with counts of cleared items
 */
export async function clearContentCache(): Promise<{
  threadsCleared: number;
  commentsCleared: number;
}> {
  const threadCount = await threadsStore.count();
  const commentCount = await commentsStore.count();

  await Promise.all([threadsStore.clear(), commentsStore.clear()]);

  console.log(
    `[CacheManagement] Cleared content cache: ${threadCount} threads, ${commentCount} comments`
  );

  return {
    threadsCleared: threadCount,
    commentsCleared: commentCount,
  };
}

/**
 * Clears only the offline queue, preserving cached content.
 *
 * @returns Number of queue items cleared
 */
export async function clearOfflineQueue(): Promise<number> {
  const queueCount = await queueStore.count();
  await queueStore.clear();

  console.log(`[CacheManagement] Cleared offline queue: ${queueCount} items`);
  return queueCount;
}

/**
 * Removes expired cached threads (where expiresAt < current time).
 *
 * @returns Number of expired items removed
 */
export async function removeExpiredItems(): Promise<number> {
  const now = Date.now();
  const expiredThreads = await threadsStore.getByExpiry(now);

  let itemsRemoved = 0;
  for (const thread of expiredThreads) {
    await threadsStore.delete(thread.id);
    await commentsStore.deleteByThreadId(thread.id);
    itemsRemoved++;
  }

  if (itemsRemoved > 0) {
    console.log(`[CacheManagement] Removed ${itemsRemoved} expired items`);
  }

  return itemsRemoved;
}
