'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  isIndexedDBSupported,
  cacheThread,
  getCachedThread,
  getCachedThreads,
  cacheComments,
  getCachedComments,
  queueAction,
  getQueuedActions,
  cancelQueuedAction,
  getQueueCount,
  getCacheSize,
  clearCache,
  pruneCache,
  type ThreadData,
  type CommentData,
  type CachedThread,
  type CachedComment,
  type OfflineQueueItem,
  type NewOfflineQueueItem,
} from '@/lib/offline';

/**
 * Return type for the useOfflineStore hook
 * Requirements: 1.1, 1.2, 2.1, 2.2
 */
export interface UseOfflineStoreReturn {
  // Status
  isOnline: boolean;
  isInitialized: boolean;
  isSupported: boolean;

  // Cache operations
  cacheThread: (thread: ThreadData) => Promise<void>;
  getCachedThread: (id: string) => Promise<CachedThread | null>;
  getCachedThreads: () => Promise<CachedThread[]>;
  cacheComments: (threadId: string, comments: CommentData[]) => Promise<void>;
  getCachedComments: (threadId: string) => Promise<CachedComment[]>;

  // Queue operations
  queueAction: (item: NewOfflineQueueItem) => Promise<string>;
  getQueuedActions: () => Promise<OfflineQueueItem[]>;
  cancelQueuedAction: (id: string) => Promise<void>;
  queueCount: number;

  // Cache management
  cacheSize: number;
  clearCache: () => Promise<void>;
  pruneCache: () => Promise<number>;
  refreshStats: () => Promise<void>;
}


/**
 * Hook for managing offline storage and queue operations
 * 
 * Features:
 * - IndexedDB-based content caching (Requirement 1.1)
 * - Online/offline status tracking (Requirement 1.2)
 * - Offline action queue management (Requirements 2.1, 2.2)
 * - Cache size monitoring and management
 * 
 * Requirements: 1.1, 1.2, 2.1, 2.2
 */
export function useOfflineStore(): UseOfflineStoreReturn {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window !== 'undefined') {
      return navigator.onLine;
    }
    return true;
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [cacheSize, setCacheSize] = useState(0);
  
  // Track if component is mounted to avoid state updates after unmount
  const isMountedRef = useRef(true);

  // Initialize and check IndexedDB support
  useEffect(() => {
    isMountedRef.current = true;
    
    const init = async () => {
      const supported = isIndexedDBSupported();
      if (isMountedRef.current) {
        setIsSupported(supported);
      }

      if (supported) {
        try {
          // Initialize stats
          const [count, size] = await Promise.all([
            getQueueCount(),
            getCacheSize(),
          ]);
          
          if (isMountedRef.current) {
            setQueueCount(count);
            setCacheSize(size);
            setIsInitialized(true);
          }
        } catch (error) {
          console.error('[useOfflineStore] Initialization error:', error);
          if (isMountedRef.current) {
            setIsInitialized(true); // Still mark as initialized, but with errors
          }
        }
      } else {
        if (isMountedRef.current) {
          setIsInitialized(true);
        }
      }
    };

    init();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Online/offline status listeners
  useEffect(() => {
    const handleOnline = () => {
      if (isMountedRef.current) {
        setIsOnline(true);
      }
    };
    
    const handleOffline = () => {
      if (isMountedRef.current) {
        setIsOnline(false);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Refresh stats (queue count and cache size)
  const refreshStats = useCallback(async () => {
    if (!isSupported) return;
    
    try {
      const [count, size] = await Promise.all([
        getQueueCount(),
        getCacheSize(),
      ]);
      
      if (isMountedRef.current) {
        setQueueCount(count);
        setCacheSize(size);
      }
    } catch (error) {
      console.error('[useOfflineStore] Error refreshing stats:', error);
    }
  }, [isSupported]);

  // Cache thread wrapper
  const cacheThreadWrapper = useCallback(async (thread: ThreadData) => {
    if (!isSupported) {
      console.warn('[useOfflineStore] IndexedDB not supported');
      return;
    }
    
    await cacheThread(thread);
    await refreshStats();
  }, [isSupported, refreshStats]);

  // Cache comments wrapper
  const cacheCommentsWrapper = useCallback(async (threadId: string, comments: CommentData[]) => {
    if (!isSupported) {
      console.warn('[useOfflineStore] IndexedDB not supported');
      return;
    }
    
    await cacheComments(threadId, comments);
    await refreshStats();
  }, [isSupported, refreshStats]);

  // Queue action wrapper
  const queueActionWrapper = useCallback(async (item: NewOfflineQueueItem): Promise<string> => {
    if (!isSupported) {
      throw new Error('IndexedDB not supported');
    }
    
    const id = await queueAction(item);
    await refreshStats();
    return id;
  }, [isSupported, refreshStats]);

  // Cancel queued action wrapper
  const cancelQueuedActionWrapper = useCallback(async (id: string) => {
    if (!isSupported) return;
    
    await cancelQueuedAction(id);
    await refreshStats();
  }, [isSupported, refreshStats]);

  // Clear cache wrapper
  const clearCacheWrapper = useCallback(async () => {
    if (!isSupported) return;
    
    await clearCache();
    await refreshStats();
  }, [isSupported, refreshStats]);

  // Prune cache wrapper
  const pruneCacheWrapper = useCallback(async (): Promise<number> => {
    if (!isSupported) return 0;
    
    const removed = await pruneCache();
    await refreshStats();
    return removed;
  }, [isSupported, refreshStats]);

  // Get cached thread wrapper (no state update needed)
  const getCachedThreadWrapper = useCallback(async (id: string): Promise<CachedThread | null> => {
    if (!isSupported) return null;
    return getCachedThread(id);
  }, [isSupported]);

  // Get cached threads wrapper
  const getCachedThreadsWrapper = useCallback(async (): Promise<CachedThread[]> => {
    if (!isSupported) return [];
    return getCachedThreads();
  }, [isSupported]);

  // Get cached comments wrapper
  const getCachedCommentsWrapper = useCallback(async (threadId: string): Promise<CachedComment[]> => {
    if (!isSupported) return [];
    return getCachedComments(threadId);
  }, [isSupported]);

  // Get queued actions wrapper
  const getQueuedActionsWrapper = useCallback(async (): Promise<OfflineQueueItem[]> => {
    if (!isSupported) return [];
    return getQueuedActions();
  }, [isSupported]);

  return {
    // Status
    isOnline,
    isInitialized,
    isSupported,

    // Cache operations
    cacheThread: cacheThreadWrapper,
    getCachedThread: getCachedThreadWrapper,
    getCachedThreads: getCachedThreadsWrapper,
    cacheComments: cacheCommentsWrapper,
    getCachedComments: getCachedCommentsWrapper,

    // Queue operations
    queueAction: queueActionWrapper,
    getQueuedActions: getQueuedActionsWrapper,
    cancelQueuedAction: cancelQueuedActionWrapper,
    queueCount,

    // Cache management
    cacheSize,
    clearCache: clearCacheWrapper,
    pruneCache: pruneCacheWrapper,
    refreshStats,
  };
}
