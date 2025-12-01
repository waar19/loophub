# Implementation Plan

- [x] 1. IndexedDB infrastructure and types
  - [x] 1.1 Create IndexedDB utility library
    - Create `lib/offline/db.ts` with idb wrapper
    - Define database schema with version 1
    - Implement open, upgrade, and migration logic
    - Export typed store accessors
    - _Requirements: 6.1, 6.4_

  - [x] 1.2 Create TypeScript types for offline system
    - Create `lib/offline/types.ts`
    - CachedThread, CachedComment, OfflineQueueItem interfaces
    - PushSubscriptionRecord, AppMetadata interfaces
    - CACHE_CONFIG constants
    - _Requirements: 6.1, 6.2_

  - [x] 1.3 Write property test for serialization round-trip
    - **Property 10: Queue item serialization round-trip**
    - **Validates: Requirements 6.2, 6.3**

- [x] 2. Cache operations
  - [x] 2.1 Implement thread caching functions
    - Create `lib/offline/cache.ts`
    - cacheThread, getCachedThread, getCachedThreads
    - Automatic TTL calculation on cache
    - _Requirements: 1.1, 1.4_

  - [x] 2.2 Implement comment caching functions
    - cacheComments, getCachedComments for thread
    - Link comments to parent thread
    - _Requirements: 1.1_

  - [x] 2.3 Implement staleness detection
    - isStale function based on cachedAt and threshold
    - getStaleItems for background refresh
    - _Requirements: 1.5_

  - [x] 2.4 Write property tests for cache operations
    - **Property 1: Cache timestamp validity**
    - **Property 2: Staleness detection consistency**
    - **Validates: Requirements 1.1, 1.4, 1.5**

- [ ] 3. Offline queue system
  - [ ] 3.1 Implement queue operations
    - Create `lib/offline/queue.ts`
    - queueAction, getQueuedActions, cancelQueuedAction
    - getQueueCount, updateQueueItemStatus
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 3.2 Implement retry logic
    - calculateRetryDelay with exponential backoff
    - shouldRetry based on retryCount
    - markForRetry, markAsFailed functions
    - _Requirements: 2.5_

  - [ ]* 3.3 Write property tests for queue operations
    - **Property 3: Offline queue item structure**
    - **Property 4: Queue count accuracy**
    - **Property 5: Retry delay calculation**
    - **Property 6: Queue removal on success**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.5, 2.6**

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Cache management
  - [ ] 5.1 Implement cache size calculation
    - Create `lib/offline/management.ts`
    - getCacheSize estimates total IndexedDB usage
    - _Requirements: 5.1_

  - [ ] 5.2 Implement cache pruning
    - pruneCache removes oldest entries
    - Preserves app shell items (/, /offline, /manifest.json)
    - Triggers when size exceeds maxCacheSize
    - _Requirements: 4.4, 5.2_

  - [ ] 5.3 Implement clear cache
    - clearCache removes all content except app shell
    - Resets offline queue
    - _Requirements: 5.2_

  - [ ]* 5.4 Write property test for cache pruning
    - **Property 9: Cache pruning preserves app shell**
    - **Validates: Requirements 5.2**

- [ ] 6. Service Worker enhancements
  - [ ] 6.1 Update cache strategies in sw.js
    - Implement cache-first for static assets
    - Implement network-first for single API items
    - Implement stale-while-revalidate for API lists
    - _Requirements: 4.2, 4.3_

  - [ ] 6.2 Implement Background Sync handlers
    - sync-comments handler
    - sync-votes handler
    - sync-reactions handler
    - Integration with offline queue
    - _Requirements: 2.4, 2.6_

  - [ ] 6.3 Enhance push notification handling
    - Improve notification display with actions
    - Handle notification click with URL navigation
    - _Requirements: 3.4, 3.5_

  - [ ]* 6.4 Write property test for cache strategy selection
    - **Property 8: Cache strategy selection**
    - **Validates: Requirements 4.2, 4.3**

  - [ ]* 6.5 Write property test for notification URL
    - **Property 7: Notification URL extraction**
    - **Validates: Requirements 3.5**

- [ ] 7. React hooks
  - [ ] 7.1 Create useOfflineStore hook
    - Create `hooks/useOfflineStore.ts`
    - Expose cache and queue operations
    - Handle initialization and online/offline status
    - _Requirements: 1.1, 1.2, 2.1, 2.2_

  - [ ] 7.2 Create usePushNotifications hook
    - Create `hooks/usePushNotifications.ts`
    - Permission management
    - Subscribe/unsubscribe functions
    - _Requirements: 3.1, 3.2_

  - [ ] 7.3 Update existing hooks for offline support
    - Modify comment creation to use queue when offline
    - Modify vote actions to use queue when offline
    - _Requirements: 2.1, 2.2_

- [ ] 8. Push notification API
  - [ ] 8.1 Create push subscription endpoints
    - Create `app/api/push/subscribe/route.ts`
    - POST to store subscription
    - DELETE to remove subscription
    - _Requirements: 3.1, 3.2, 5.3_

  - [ ] 8.2 Create push send utility
    - Create `lib/push.ts` with web-push integration
    - sendPushNotification function
    - Integration with notification triggers
    - _Requirements: 3.3_

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. UI Components
  - [ ] 10.1 Create OfflineIndicator component
    - Create `components/OfflineIndicator.tsx`
    - Shows offline status bar when disconnected
    - Shows sync progress when reconnecting
    - _Requirements: 1.2_

  - [ ] 10.2 Create OfflineQueueBadge component
    - Create `components/OfflineQueueBadge.tsx`
    - Shows count of pending actions
    - Expandable panel with queue details
    - Cancel individual items
    - _Requirements: 2.3, 5.4, 5.5_

  - [ ] 10.3 Create PWASettings component
    - Create `components/PWASettings.tsx`
    - Cache size display
    - Clear cache button
    - Push notification toggle
    - Offline queue management
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 10.4 Update offline page
    - Enhance `app/offline/page.tsx`
    - Show cached content suggestions
    - Show offline queue status
    - _Requirements: 1.3_

- [ ] 11. Integration
  - [ ] 11.1 Integrate OfflineIndicator in layout
    - Add to `app/layout.tsx`
    - Position at top of viewport
    - _Requirements: 1.2_

  - [ ] 11.2 Integrate OfflineQueueBadge in header
    - Add to `components/Header.tsx`
    - Show next to notifications
    - _Requirements: 2.3_

  - [ ] 11.3 Integrate PWASettings in settings page
    - Add section to `app/settings/page.tsx`
    - _Requirements: 5.1_

  - [ ] 11.4 Add cache-on-view to thread page
    - Modify `app/thread/[id]/page.tsx`
    - Cache thread and comments on view
    - _Requirements: 1.1_

  - [ ] 11.5 Add translations for offline features
    - Add keys to `lib/i18n/translations.ts`
    - ES, EN, PT translations
    - _Requirements: 1.2, 1.3, 2.3_

- [ ] 12. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
