/**
 * PWA Offline System - Main Entry Point
 *
 * This module provides offline support for LoopHub including:
 * - IndexedDB-based content caching
 * - Offline action queue with background sync
 * - Push notification support
 * - Cache management utilities
 */

// Types and serialization functions
export * from './types';
export { serializeQueueItem, deserializeQueueItem } from './types';

// Database utilities
export {
  getDB,
  closeDB,
  deleteDatabase,
  isIndexedDBSupported,
  threadsStore,
  commentsStore,
  queueStore,
  pushStore,
  metadataStore,
  estimateStorageSize,
  healthCheck,
} from './db';

// Cache operations
export {
  cacheThread,
  getCachedThread,
  getCachedThreads,
  cacheComments,
  getCachedComments,
  isStale,
  getStaleThreads,
  getStaleComments,
  getStaleItems,
} from './cache';

// Queue operations
export {
  queueAction,
  getQueuedActions,
  cancelQueuedAction,
  getQueueCount,
  updateQueueItemStatus,
  calculateRetryDelay,
  shouldRetry,
  markForRetry,
  markAsFailed,
  removeOnSuccess,
  getItemsReadyForSync,
  markAsSyncing,
} from './queue';

// Cache management operations
export {
  APP_SHELL_ITEMS,
  getCacheSize,
  getCacheStats,
  isCacheOverLimit,
  pruneCache,
  autoPruneIfNeeded,
  clearCache,
  clearContentCache,
  clearOfflineQueue,
  removeExpiredItems,
} from './management';

// Cache strategy selection
export {
  getCacheStrategy,
  isStaticAssetPath,
  isStaticAssetDestination,
  isApiSingleItem,
  isApiList,
  API_SINGLE_ITEM_PATTERNS,
  API_LIST_PATTERNS,
  type CacheStrategy,
  type RequestDestination,
  type RequestInfo,
} from './cache-strategy';

// Notification URL extraction
export {
  extractNotificationUrl,
  buildReplyUrl,
  DEFAULT_NOTIFICATION_URL,
  type NotificationData,
  type NotificationLike,
} from './notification';
