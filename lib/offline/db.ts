/**
 * IndexedDB utility library for PWA offline support
 * Requirements: 6.1, 6.4
 *
 * Provides typed database operations using the idb library wrapper.
 * Handles database versioning, migrations, and graceful error handling.
 */

import { openDB, type IDBPDatabase } from 'idb';
import {
  DB_NAME,
  DB_VERSION,
  STORE_NAMES,
  type LoopHubOfflineDB,
  type CachedThread,
  type CachedComment,
  type OfflineQueueItem,
  type PushSubscriptionRecord,
} from './types';

// ============================================================================
// Database Instance Management
// ============================================================================

let dbInstance: IDBPDatabase<LoopHubOfflineDB> | null = null;
let dbInitPromise: Promise<IDBPDatabase<LoopHubOfflineDB>> | null = null;

/**
 * Check if IndexedDB is supported in the current environment
 */
export function isIndexedDBSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'indexedDB' in window;
}

/**
 * Opens and returns the database instance.
 * Uses singleton pattern to avoid multiple connections.
 * Handles database upgrade/migration logic.
 */
export async function getDB(): Promise<IDBPDatabase<LoopHubOfflineDB>> {
  // Return existing instance if available
  if (dbInstance) {
    return dbInstance;
  }

  // Return existing initialization promise if in progress
  if (dbInitPromise) {
    return dbInitPromise;
  }

  // Check for IndexedDB support
  if (!isIndexedDBSupported()) {
    throw new Error('IndexedDB is not supported in this environment');
  }

  // Initialize database
  dbInitPromise = openDB<LoopHubOfflineDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion) {
      console.log(`[OfflineDB] Upgrading from version ${oldVersion} to ${newVersion}`);

      // Version 1: Initial schema
      if (oldVersion < 1) {
        // Create cached_threads store
        const threadsStore = db.createObjectStore(STORE_NAMES.cachedThreads, {
          keyPath: 'id',
        });
        threadsStore.createIndex('cachedAt', 'cachedAt');
        threadsStore.createIndex('expiresAt', 'expiresAt');

        // Create cached_comments store
        const commentsStore = db.createObjectStore(STORE_NAMES.cachedComments, {
          keyPath: 'id',
        });
        commentsStore.createIndex('threadId', 'threadId');
        commentsStore.createIndex('cachedAt', 'cachedAt');

        // Create offline_queue store
        const queueStore = db.createObjectStore(STORE_NAMES.offlineQueue, {
          keyPath: 'id',
        });
        queueStore.createIndex('type', 'type');
        queueStore.createIndex('status', 'status');
        queueStore.createIndex('createdAt', 'createdAt');

        // Create push_subscription store
        db.createObjectStore(STORE_NAMES.pushSubscription, {
          keyPath: 'id',
        });

        // Create app_metadata store
        db.createObjectStore(STORE_NAMES.appMetadata, {
          keyPath: 'key',
        });

        console.log('[OfflineDB] Created all object stores for version 1');
      }

      // Future migrations would go here:
      // if (oldVersion < 2) { ... }
    },
    blocked() {
      console.warn('[OfflineDB] Database upgrade blocked by another connection');
    },
    blocking() {
      console.warn('[OfflineDB] This connection is blocking a database upgrade');
      // Close the connection to allow upgrade to proceed
      dbInstance?.close();
      dbInstance = null;
    },
    terminated() {
      console.error('[OfflineDB] Database connection was unexpectedly terminated');
      dbInstance = null;
      dbInitPromise = null;
    },
  });

  try {
    dbInstance = await dbInitPromise;
    console.log('[OfflineDB] Database initialized successfully');
    return dbInstance;
  } catch (error) {
    console.error('[OfflineDB] Failed to initialize database:', error);
    dbInitPromise = null;
    throw error;
  }
}

/**
 * Closes the database connection
 */
export async function closeDB(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    dbInitPromise = null;
    console.log('[OfflineDB] Database connection closed');
  }
}

/**
 * Deletes the entire database (useful for testing or reset)
 */
export async function deleteDatabase(): Promise<void> {
  await closeDB();
  if (isIndexedDBSupported()) {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => {
        console.warn('[OfflineDB] Delete blocked - closing connections');
        resolve();
      };
    });
    console.log('[OfflineDB] Database deleted');
  }
}

// ============================================================================
// Typed Store Accessors
// ============================================================================

/**
 * Cached Threads Store Operations
 */
export const threadsStore = {
  async get(id: string): Promise<CachedThread | undefined> {
    try {
      const db = await getDB();
      return db.get(STORE_NAMES.cachedThreads, id);
    } catch (error) {
      console.error('[OfflineDB] Error getting cached thread:', error);
      return undefined;
    }
  },

  async getAll(): Promise<CachedThread[]> {
    try {
      const db = await getDB();
      return db.getAll(STORE_NAMES.cachedThreads);
    } catch (error) {
      console.error('[OfflineDB] Error getting all cached threads:', error);
      return [];
    }
  },

  async put(thread: CachedThread): Promise<string> {
    const db = await getDB();
    return db.put(STORE_NAMES.cachedThreads, thread);
  },

  async delete(id: string): Promise<void> {
    const db = await getDB();
    return db.delete(STORE_NAMES.cachedThreads, id);
  },

  async clear(): Promise<void> {
    const db = await getDB();
    return db.clear(STORE_NAMES.cachedThreads);
  },

  async count(): Promise<number> {
    const db = await getDB();
    return db.count(STORE_NAMES.cachedThreads);
  },

  async getByExpiry(beforeTimestamp: number): Promise<CachedThread[]> {
    try {
      const db = await getDB();
      const index = db.transaction(STORE_NAMES.cachedThreads).store.index('expiresAt');
      const range = IDBKeyRange.upperBound(beforeTimestamp);
      return index.getAll(range);
    } catch (error) {
      console.error('[OfflineDB] Error getting expired threads:', error);
      return [];
    }
  },

  async getByCachedAt(ascending = true): Promise<CachedThread[]> {
    try {
      const db = await getDB();
      const tx = db.transaction(STORE_NAMES.cachedThreads, 'readonly');
      const index = tx.store.index('cachedAt');
      const items: CachedThread[] = [];
      let cursor = await index.openCursor(null, ascending ? 'next' : 'prev');
      while (cursor) {
        items.push(cursor.value);
        cursor = await cursor.continue();
      }
      return items;
    } catch (error) {
      console.error('[OfflineDB] Error getting threads by cachedAt:', error);
      return [];
    }
  },
};

/**
 * Cached Comments Store Operations
 */
export const commentsStore = {
  async get(id: string): Promise<CachedComment | undefined> {
    try {
      const db = await getDB();
      return db.get(STORE_NAMES.cachedComments, id);
    } catch (error) {
      console.error('[OfflineDB] Error getting cached comment:', error);
      return undefined;
    }
  },

  async getAll(): Promise<CachedComment[]> {
    try {
      const db = await getDB();
      return db.getAll(STORE_NAMES.cachedComments);
    } catch (error) {
      console.error('[OfflineDB] Error getting all cached comments:', error);
      return [];
    }
  },

  async getByThreadId(threadId: string): Promise<CachedComment[]> {
    try {
      const db = await getDB();
      const index = db.transaction(STORE_NAMES.cachedComments).store.index('threadId');
      return index.getAll(threadId);
    } catch (error) {
      console.error('[OfflineDB] Error getting comments by thread:', error);
      return [];
    }
  },

  async put(comment: CachedComment): Promise<string> {
    const db = await getDB();
    return db.put(STORE_NAMES.cachedComments, comment);
  },

  async putMany(comments: CachedComment[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(STORE_NAMES.cachedComments, 'readwrite');
    await Promise.all([
      ...comments.map((comment) => tx.store.put(comment)),
      tx.done,
    ]);
  },

  async delete(id: string): Promise<void> {
    const db = await getDB();
    return db.delete(STORE_NAMES.cachedComments, id);
  },

  async deleteByThreadId(threadId: string): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(STORE_NAMES.cachedComments, 'readwrite');
    const index = tx.store.index('threadId');
    let cursor = await index.openCursor(threadId);
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    await tx.done;
  },

  async clear(): Promise<void> {
    const db = await getDB();
    return db.clear(STORE_NAMES.cachedComments);
  },

  async count(): Promise<number> {
    const db = await getDB();
    return db.count(STORE_NAMES.cachedComments);
  },
};

/**
 * Offline Queue Store Operations
 */
export const queueStore = {
  async get(id: string): Promise<OfflineQueueItem | undefined> {
    try {
      const db = await getDB();
      return db.get(STORE_NAMES.offlineQueue, id);
    } catch (error) {
      console.error('[OfflineDB] Error getting queue item:', error);
      return undefined;
    }
  },

  async getAll(): Promise<OfflineQueueItem[]> {
    try {
      const db = await getDB();
      return db.getAll(STORE_NAMES.offlineQueue);
    } catch (error) {
      console.error('[OfflineDB] Error getting all queue items:', error);
      return [];
    }
  },

  async getByStatus(status: OfflineQueueItem['status']): Promise<OfflineQueueItem[]> {
    try {
      const db = await getDB();
      const index = db.transaction(STORE_NAMES.offlineQueue).store.index('status');
      return index.getAll(status);
    } catch (error) {
      console.error('[OfflineDB] Error getting queue items by status:', error);
      return [];
    }
  },

  async getPending(): Promise<OfflineQueueItem[]> {
    try {
      const pending = await this.getByStatus('pending');
      const failed = await this.getByStatus('failed');
      return [...pending, ...failed].sort((a, b) => a.createdAt - b.createdAt);
    } catch (error) {
      console.error('[OfflineDB] Error getting pending queue items:', error);
      return [];
    }
  },

  async put(item: OfflineQueueItem): Promise<string> {
    const db = await getDB();
    return db.put(STORE_NAMES.offlineQueue, item);
  },

  async delete(id: string): Promise<void> {
    const db = await getDB();
    return db.delete(STORE_NAMES.offlineQueue, id);
  },

  async clear(): Promise<void> {
    const db = await getDB();
    return db.clear(STORE_NAMES.offlineQueue);
  },

  async count(): Promise<number> {
    const db = await getDB();
    return db.count(STORE_NAMES.offlineQueue);
  },

  async countPending(): Promise<number> {
    try {
      const pending = await this.getByStatus('pending');
      const failed = await this.getByStatus('failed');
      return pending.length + failed.length;
    } catch (error) {
      console.error('[OfflineDB] Error counting pending items:', error);
      return 0;
    }
  },
};

/**
 * Push Subscription Store Operations
 */
export const pushStore = {
  async get(id: string): Promise<PushSubscriptionRecord | undefined> {
    try {
      const db = await getDB();
      return db.get(STORE_NAMES.pushSubscription, id);
    } catch (error) {
      console.error('[OfflineDB] Error getting push subscription:', error);
      return undefined;
    }
  },

  async getFirst(): Promise<PushSubscriptionRecord | undefined> {
    try {
      const db = await getDB();
      const all = await db.getAll(STORE_NAMES.pushSubscription);
      return all[0];
    } catch (error) {
      console.error('[OfflineDB] Error getting first push subscription:', error);
      return undefined;
    }
  },

  async put(subscription: PushSubscriptionRecord): Promise<string> {
    const db = await getDB();
    return db.put(STORE_NAMES.pushSubscription, subscription);
  },

  async delete(id: string): Promise<void> {
    const db = await getDB();
    return db.delete(STORE_NAMES.pushSubscription, id);
  },

  async clear(): Promise<void> {
    const db = await getDB();
    return db.clear(STORE_NAMES.pushSubscription);
  },
};

/**
 * App Metadata Store Operations
 */
export const metadataStore = {
  async get<T = unknown>(key: string): Promise<T | undefined> {
    try {
      const db = await getDB();
      const record = await db.get(STORE_NAMES.appMetadata, key);
      return record?.value as T | undefined;
    } catch (error) {
      console.error('[OfflineDB] Error getting metadata:', error);
      return undefined;
    }
  },

  async set(key: string, value: unknown): Promise<void> {
    const db = await getDB();
    await db.put(STORE_NAMES.appMetadata, { key, value });
  },

  async delete(key: string): Promise<void> {
    const db = await getDB();
    return db.delete(STORE_NAMES.appMetadata, key);
  },

  async clear(): Promise<void> {
    const db = await getDB();
    return db.clear(STORE_NAMES.appMetadata);
  },
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Estimates the total size of data in IndexedDB (approximate)
 */
export async function estimateStorageSize(): Promise<number> {
  if (typeof navigator !== 'undefined' && 'storage' in navigator) {
    try {
      const estimate = await navigator.storage.estimate();
      return estimate.usage || 0;
    } catch {
      // Fall back to manual estimation
    }
  }

  // Manual estimation by serializing all data
  try {
    const threads = await threadsStore.getAll();
    const comments = await commentsStore.getAll();
    const queue = await queueStore.getAll();

    const totalSize =
      JSON.stringify(threads).length +
      JSON.stringify(comments).length +
      JSON.stringify(queue).length;

    return totalSize;
  } catch (error) {
    console.error('[OfflineDB] Error estimating storage size:', error);
    return 0;
  }
}

/**
 * Performs a health check on the database
 */
export async function healthCheck(): Promise<{
  isHealthy: boolean;
  stores: Record<string, number>;
  error?: string;
}> {
  try {
    const db = await getDB();
    const stores: Record<string, number> = {};

    for (const storeName of Object.values(STORE_NAMES)) {
      stores[storeName] = await db.count(storeName);
    }

    return { isHealthy: true, stores };
  } catch (error) {
    return {
      isHealthy: false,
      stores: {},
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
