/**
 * Offline queue operations for PWA support
 * Requirements: 2.1, 2.2, 2.3, 2.5
 *
 * Provides functions for queuing offline actions (comments, votes, reactions),
 * managing queue state, and implementing retry logic with exponential backoff.
 */

import { queueStore } from './db';
import {
  CACHE_CONFIG,
  type OfflineQueueItem,
  type NewOfflineQueueItem,
  type OfflineQueueStatus,
} from './types';

// ============================================================================
// Queue Operations (Requirements 2.1, 2.2, 2.3)
// ============================================================================

/**
 * Generates a unique ID for queue items
 */
function generateQueueId(): string {
  return `queue_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Queues an action for offline sync.
 * Creates a new OfflineQueueItem with status 'pending', retryCount 0,
 * and valid createdAt timestamp.
 *
 * Property 3: Offline queue item structure
 * For any offline action (comment, vote, reaction), when queued,
 * the resulting OfflineQueueItem should have status 'pending',
 * retryCount 0, and valid createdAt timestamp.
 *
 * @param item - The action to queue (without auto-generated fields)
 * @returns The ID of the queued item
 */
export async function queueAction(item: NewOfflineQueueItem): Promise<string> {
  const now = Date.now();
  const queueItem: OfflineQueueItem = {
    id: generateQueueId(),
    type: item.type,
    action: item.action,
    payload: item.payload,
    createdAt: now,
    retryCount: 0,
    lastRetryAt: null,
    status: 'pending',
  };

  await queueStore.put(queueItem);
  return queueItem.id;
}


/**
 * Retrieves all queued actions, ordered by creation time.
 *
 * @returns Array of all queued items
 */
export async function getQueuedActions(): Promise<OfflineQueueItem[]> {
  const items = await queueStore.getAll();
  return items.sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Cancels a queued action by removing it from the queue.
 *
 * @param id - The ID of the queue item to cancel
 */
export async function cancelQueuedAction(id: string): Promise<void> {
  await queueStore.delete(id);
}

/**
 * Gets the count of pending and failed queue items.
 *
 * Property 4: Queue count accuracy
 * For any set of queued actions, getQueueCount should return
 * the exact number of items with status 'pending' or 'failed'.
 *
 * @returns The count of items that need to be synced
 */
export async function getQueueCount(): Promise<number> {
  return queueStore.countPending();
}

/**
 * Updates the status of a queue item.
 *
 * @param id - The ID of the queue item to update
 * @param status - The new status
 * @returns true if the item was updated, false if not found
 */
export async function updateQueueItemStatus(
  id: string,
  status: OfflineQueueStatus
): Promise<boolean> {
  const item = await queueStore.get(id);
  if (!item) {
    return false;
  }

  const updatedItem: OfflineQueueItem = {
    ...item,
    status,
  };

  await queueStore.put(updatedItem);
  return true;
}

// ============================================================================
// Retry Logic (Requirement 2.5)
// ============================================================================

/**
 * Calculates the retry delay using exponential backoff.
 *
 * Property 5: Retry delay calculation
 * For any retry count N (0 to maxRetries), the calculated delay
 * should equal min(baseRetryDelay * 2^N, maxRetryDelay).
 *
 * @param retryCount - The current retry count (0-based)
 * @param baseDelay - Base delay in ms (defaults to CACHE_CONFIG.baseRetryDelay)
 * @param maxDelay - Maximum delay in ms (defaults to CACHE_CONFIG.maxRetryDelay)
 * @returns The calculated delay in milliseconds
 */
export function calculateRetryDelay(
  retryCount: number,
  baseDelay: number = CACHE_CONFIG.baseRetryDelay,
  maxDelay: number = CACHE_CONFIG.maxRetryDelay
): number {
  const exponentialDelay = baseDelay * Math.pow(2, retryCount);
  return Math.min(exponentialDelay, maxDelay);
}

/**
 * Determines if a queue item should be retried based on its retry count.
 *
 * @param retryCount - The current retry count
 * @param maxRetries - Maximum allowed retries (defaults to CACHE_CONFIG.maxRetries)
 * @returns true if the item should be retried, false otherwise
 */
export function shouldRetry(
  retryCount: number,
  maxRetries: number = CACHE_CONFIG.maxRetries
): boolean {
  return retryCount < maxRetries;
}

/**
 * Marks a queue item for retry by incrementing its retry count
 * and updating the lastRetryAt timestamp.
 *
 * @param id - The ID of the queue item
 * @returns true if the item was marked for retry, false if not found or max retries exceeded
 */
export async function markForRetry(id: string): Promise<boolean> {
  const item = await queueStore.get(id);
  if (!item) {
    return false;
  }

  if (!shouldRetry(item.retryCount)) {
    // Max retries exceeded, mark as failed
    await markAsFailed(id);
    return false;
  }

  const updatedItem: OfflineQueueItem = {
    ...item,
    retryCount: item.retryCount + 1,
    lastRetryAt: Date.now(),
    status: 'pending',
  };

  await queueStore.put(updatedItem);
  return true;
}

/**
 * Marks a queue item as failed after exhausting all retries.
 *
 * @param id - The ID of the queue item
 * @returns true if the item was marked as failed, false if not found
 */
export async function markAsFailed(id: string): Promise<boolean> {
  const item = await queueStore.get(id);
  if (!item) {
    return false;
  }

  const updatedItem: OfflineQueueItem = {
    ...item,
    status: 'failed',
    lastRetryAt: Date.now(),
  };

  await queueStore.put(updatedItem);
  return true;
}

/**
 * Removes a successfully synced item from the queue.
 *
 * Property 6: Queue removal on success
 * For any offline queue item that is successfully synced,
 * the item should no longer exist in the queue after sync completion.
 *
 * @param id - The ID of the queue item to remove
 */
export async function removeOnSuccess(id: string): Promise<void> {
  await queueStore.delete(id);
}

/**
 * Gets all items that are ready for sync (pending or failed with retry available).
 *
 * @returns Array of items ready to be synced
 */
export async function getItemsReadyForSync(): Promise<OfflineQueueItem[]> {
  const pending = await queueStore.getPending();
  return pending.filter(
    (item) => item.status === 'pending' || shouldRetry(item.retryCount)
  );
}

/**
 * Sets a queue item to syncing status.
 *
 * @param id - The ID of the queue item
 * @returns true if the item was updated, false if not found
 */
export async function markAsSyncing(id: string): Promise<boolean> {
  return updateQueueItemStatus(id, 'syncing');
}
