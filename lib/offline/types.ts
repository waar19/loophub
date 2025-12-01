/**
 * TypeScript types for the PWA offline system
 * Requirements: 6.1, 6.2
 */

// ============================================================================
// Cache Configuration Constants
// ============================================================================

export const CACHE_CONFIG = {
  // Cache duration in milliseconds
  threadTTL: 24 * 60 * 60 * 1000, // 24 hours
  commentTTL: 12 * 60 * 60 * 1000, // 12 hours

  // Staleness threshold (when to refresh in background)
  staleThreshold: 5 * 60 * 1000, // 5 minutes

  // Max cache size in bytes
  maxCacheSize: 50 * 1024 * 1024, // 50MB

  // Retry configuration
  maxRetries: 3,
  baseRetryDelay: 1000, // 1 second
  maxRetryDelay: 30000, // 30 seconds
} as const;

// ============================================================================
// Database Constants
// ============================================================================

export const DB_NAME = 'loophub-offline';
export const DB_VERSION = 1;

// Store names
export const STORE_NAMES = {
  cachedThreads: 'cached_threads',
  cachedComments: 'cached_comments',
  offlineQueue: 'offline_queue',
  pushSubscription: 'push_subscription',
  appMetadata: 'app_metadata',
} as const;

// ============================================================================
// Thread and Comment Data Types
// ============================================================================

/**
 * Represents the data structure for a thread as stored in the application
 */
export interface ThreadData {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName?: string;
  forumId?: string;
  forumSlug?: string;
  createdAt: string;
  updatedAt?: string;
  voteCount?: number;
  commentCount?: number;
  viewCount?: number;
  isPinned?: boolean;
  tags?: string[];
}

/**
 * Represents the data structure for a comment as stored in the application
 */
export interface CommentData {
  id: string;
  content: string;
  authorId: string;
  authorName?: string;
  threadId: string;
  parentId?: string | null;
  createdAt: string;
  updatedAt?: string;
  voteCount?: number;
}

// ============================================================================
// Cached Content Types
// ============================================================================

/**
 * A thread cached in IndexedDB with metadata
 */
export interface CachedThread {
  id: string;
  data: ThreadData;
  cachedAt: number; // timestamp
  expiresAt: number; // timestamp
}

/**
 * A comment cached in IndexedDB with metadata
 */
export interface CachedComment {
  id: string;
  threadId: string;
  data: CommentData;
  cachedAt: number; // timestamp
}

// ============================================================================
// Offline Queue Types
// ============================================================================

/**
 * Types of actions that can be queued for offline sync
 */
export type OfflineActionType = 'comment' | 'vote' | 'reaction';

/**
 * Action operations
 */
export type OfflineActionOperation = 'create' | 'update' | 'delete';

/**
 * Status of an offline queue item
 */
export type OfflineQueueStatus = 'pending' | 'syncing' | 'failed';

/**
 * An item in the offline action queue
 */
export interface OfflineQueueItem {
  id: string;
  type: OfflineActionType;
  action: OfflineActionOperation;
  payload: Record<string, unknown>;
  createdAt: number;
  retryCount: number;
  lastRetryAt: number | null;
  status: OfflineQueueStatus;
}

/**
 * Serialized version of OfflineQueueItem for JSON storage
 */
export interface SerializedQueueItem {
  id: string;
  type: string;
  action: string;
  payload: string; // JSON string
  createdAt: number;
  retryCount: number;
  lastRetryAt: number | null;
  status: string;
}

// ============================================================================
// Push Notification Types
// ============================================================================

/**
 * Push subscription record stored in IndexedDB
 */
export interface PushSubscriptionRecord {
  id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  createdAt: number;
}

/**
 * Push notification payload sent from server
 */
export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  actions?: Array<{
    action: string;
    title: string;
  }>;
}

// ============================================================================
// App Metadata Types
// ============================================================================

/**
 * Generic app metadata stored in IndexedDB
 */
export interface AppMetadata {
  key: string;
  value: unknown;
}

// ============================================================================
// Database Schema Types (for idb library)
// ============================================================================

import type { DBSchema } from 'idb';

/**
 * IndexedDB schema definition for type-safe database operations
 */
export interface LoopHubOfflineDB extends DBSchema {
  [STORE_NAMES.cachedThreads]: {
    key: string;
    value: CachedThread;
    indexes: {
      cachedAt: number;
      expiresAt: number;
    };
  };
  [STORE_NAMES.cachedComments]: {
    key: string;
    value: CachedComment;
    indexes: {
      threadId: string;
      cachedAt: number;
    };
  };
  [STORE_NAMES.offlineQueue]: {
    key: string;
    value: OfflineQueueItem;
    indexes: {
      type: OfflineActionType;
      status: OfflineQueueStatus;
      createdAt: number;
    };
  };
  [STORE_NAMES.pushSubscription]: {
    key: string;
    value: PushSubscriptionRecord;
  };
  [STORE_NAMES.appMetadata]: {
    key: string;
    value: AppMetadata;
  };
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Input type for creating a new offline queue item (without auto-generated fields)
 */
export type NewOfflineQueueItem = Omit<
  OfflineQueueItem,
  'id' | 'createdAt' | 'retryCount' | 'lastRetryAt' | 'status'
>;

/**
 * Result of a cache operation
 */
export interface CacheOperationResult {
  success: boolean;
  error?: string;
}

// ============================================================================
// Serialization Functions
// ============================================================================

/**
 * Serializes an OfflineQueueItem to a SerializedQueueItem for JSON storage.
 * The payload is converted to a JSON string for consistent storage.
 */
export function serializeQueueItem(item: OfflineQueueItem): SerializedQueueItem {
  return {
    id: item.id,
    type: item.type,
    action: item.action,
    payload: JSON.stringify(item.payload),
    createdAt: item.createdAt,
    retryCount: item.retryCount,
    lastRetryAt: item.lastRetryAt,
    status: item.status,
  };
}

/**
 * Deserializes a SerializedQueueItem back to an OfflineQueueItem.
 * The payload JSON string is parsed back to an object.
 */
export function deserializeQueueItem(serialized: SerializedQueueItem): OfflineQueueItem {
  return {
    id: serialized.id,
    type: serialized.type as OfflineActionType,
    action: serialized.action as OfflineActionOperation,
    payload: JSON.parse(serialized.payload) as Record<string, unknown>,
    createdAt: serialized.createdAt,
    retryCount: serialized.retryCount,
    lastRetryAt: serialized.lastRetryAt,
    status: serialized.status as OfflineQueueStatus,
  };
}
