/**
 * PWA Offline System - Main Entry Point
 *
 * This module provides offline support for LoopHub including:
 * - IndexedDB-based content caching
 * - Offline action queue with background sync
 * - Push notification support
 * - Cache management utilities
 */

// Types
export * from './types';

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
