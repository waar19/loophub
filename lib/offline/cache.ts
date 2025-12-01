/**
 * Cache operations for PWA offline support
 * Requirements: 1.1, 1.4, 1.5
 *
 * Provides functions for caching threads and comments with automatic TTL,
 * staleness detection, and background refresh support.
 */

import { threadsStore, commentsStore } from './db';
import {
  CACHE_CONFIG,
  type ThreadData,
  type CommentData,
  type CachedThread,
  type CachedComment,
} from './types';

// ============================================================================
// Thread Caching Functions (Requirement 1.1, 1.4)
// ============================================================================

/**
 * Caches a thread with automatic TTL calculation.
 * The cachedAt timestamp is set to current time, and expiresAt is calculated
 * based on the configured threadTTL.
 *
 * @param thread - The thread data to cache
 * @returns The ID of the cached thread
 */
export async function cacheThread(thread: ThreadData): Promise<string> {
  const now = Date.now();
  const cachedThread: CachedThread = {
    id: thread.id,
    data: thread,
    cachedAt: now,
    expiresAt: now + CACHE_CONFIG.threadTTL,
  };

  return threadsStore.put(cachedThread);
}

/**
 * Retrieves a cached thread by ID.
 *
 * @param id - The thread ID to retrieve
 * @returns The cached thread or null if not found
 */
export async function getCachedThread(id: string): Promise<CachedThread | null> {
  const thread = await threadsStore.get(id);
  return thread ?? null;
}

/**
 * Retrieves all cached threads.
 *
 * @returns Array of all cached threads
 */
export async function getCachedThreads(): Promise<CachedThread[]> {
  return threadsStore.getAll();
}


// ============================================================================
// Comment Caching Functions (Requirement 1.1)
// ============================================================================

/**
 * Caches comments for a thread.
 * Each comment is linked to its parent thread via threadId.
 *
 * @param threadId - The ID of the thread these comments belong to
 * @param comments - Array of comment data to cache
 */
export async function cacheComments(
  threadId: string,
  comments: CommentData[]
): Promise<void> {
  const now = Date.now();
  const cachedComments: CachedComment[] = comments.map((comment) => ({
    id: comment.id,
    threadId,
    data: comment,
    cachedAt: now,
  }));

  await commentsStore.putMany(cachedComments);
}

/**
 * Retrieves all cached comments for a specific thread.
 *
 * @param threadId - The thread ID to get comments for
 * @returns Array of cached comments for the thread
 */
export async function getCachedComments(
  threadId: string
): Promise<CachedComment[]> {
  return commentsStore.getByThreadId(threadId);
}


// ============================================================================
// Staleness Detection Functions (Requirement 1.5)
// ============================================================================

/**
 * Determines if a cached item is stale based on its cachedAt timestamp.
 * An item is considered stale if the time since caching exceeds the staleThreshold.
 *
 * Property 2: Staleness detection consistency
 * For any cached item with cachedAt timestamp and current time,
 * the staleness check should return true if and only if
 * (currentTime - cachedAt) > staleThreshold.
 *
 * @param cachedAt - The timestamp when the item was cached
 * @param currentTime - The current timestamp (defaults to Date.now())
 * @param threshold - The staleness threshold in ms (defaults to CACHE_CONFIG.staleThreshold)
 * @returns true if the item is stale, false otherwise
 */
export function isStale(
  cachedAt: number,
  currentTime: number = Date.now(),
  threshold: number = CACHE_CONFIG.staleThreshold
): boolean {
  return currentTime - cachedAt > threshold;
}

/**
 * Retrieves all stale cached threads that need background refresh.
 * A thread is stale if its cachedAt timestamp is older than the staleThreshold.
 *
 * @param currentTime - The current timestamp (defaults to Date.now())
 * @returns Array of stale cached threads
 */
export async function getStaleThreads(
  currentTime: number = Date.now()
): Promise<CachedThread[]> {
  const allThreads = await threadsStore.getAll();
  return allThreads.filter((thread) => isStale(thread.cachedAt, currentTime));
}

/**
 * Retrieves all stale cached comments that need background refresh.
 * A comment is stale if its cachedAt timestamp is older than the staleThreshold.
 *
 * @param currentTime - The current timestamp (defaults to Date.now())
 * @returns Array of stale cached comments
 */
export async function getStaleComments(
  currentTime: number = Date.now()
): Promise<CachedComment[]> {
  const allComments = await commentsStore.getAll();
  return allComments.filter((comment) => isStale(comment.cachedAt, currentTime));
}

/**
 * Retrieves all stale items (both threads and comments) for background refresh.
 *
 * @param currentTime - The current timestamp (defaults to Date.now())
 * @returns Object containing arrays of stale threads and comments
 */
export async function getStaleItems(currentTime: number = Date.now()): Promise<{
  threads: CachedThread[];
  comments: CachedComment[];
}> {
  const [threads, comments] = await Promise.all([
    getStaleThreads(currentTime),
    getStaleComments(currentTime),
  ]);

  return { threads, comments };
}
