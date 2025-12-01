# Design Document - PWA Offline System

## Overview

El sistema PWA Offline completa la implementación de LoopHub como Progressive Web App, permitiendo:
- Lectura de contenido cacheado sin conexión
- Cola de acciones offline (comentarios, votos) con sincronización automática
- Push notifications nativas
- Gestión de cache y datos offline

Se construye sobre la implementación existente (manifest.json, sw.js básico, usePWA hook) añadiendo IndexedDB para persistencia estructurada y Background Sync para sincronización.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │ OfflineIndicator │  │ OfflineQueue     │  │ PWASettings   │  │
│  │ (status bar)     │  │ (pending badge)  │  │ (cache mgmt)  │  │
│  └────────┬─────────┘  └────────┬─────────┘  └───────┬───────┘  │
│           │                     │                     │          │
│           └─────────────────────┼─────────────────────┘          │
│                                 ▼                                │
│              ┌─────────────────────────────────┐                 │
│              │      useOfflineStore hook       │                 │
│              │  (IndexedDB + queue management) │                 │
│              └────────────────┬────────────────┘                 │
└───────────────────────────────┼─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      IndexedDB Layer                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ cached_threads  │  │ cached_comments │  │ offline_queue   │  │
│  │ (content cache) │  │ (content cache) │  │ (pending sync)  │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │ push_subscription│ │ app_metadata    │                       │
│  │ (notification)  │  │ (version, etc)  │                       │
│  └─────────────────┘  └─────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Service Worker                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Cache Strategies: cache-first, network-first, SWR       │    │
│  │ Background Sync: sync-comments, sync-votes              │    │
│  │ Push Handler: display notifications, handle clicks      │    │
│  │ Cache Management: pruning, versioning                   │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API Layer                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ POST /api/push/subscribe    - Store push subscription   │    │
│  │ DELETE /api/push/subscribe  - Remove subscription       │    │
│  │ POST /api/push/send         - Send push (internal)      │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### IndexedDB Schema

```typescript
// Database name and version
const DB_NAME = 'loophub-offline';
const DB_VERSION = 1;

// Object stores
interface CachedThread {
  id: string;
  data: ThreadData;
  cachedAt: number; // timestamp
  expiresAt: number; // timestamp
}

interface CachedComment {
  id: string;
  threadId: string;
  data: CommentData;
  cachedAt: number;
}

interface OfflineQueueItem {
  id: string;
  type: 'comment' | 'vote' | 'reaction';
  action: 'create' | 'update' | 'delete';
  payload: Record<string, unknown>;
  createdAt: number;
  retryCount: number;
  lastRetryAt: number | null;
  status: 'pending' | 'syncing' | 'failed';
}

interface PushSubscriptionRecord {
  id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  createdAt: number;
}

interface AppMetadata {
  key: string;
  value: unknown;
}
```

### React Components

```typescript
// Offline status indicator
interface OfflineIndicatorProps {
  // No props - uses useOfflineStore internally
}

// Offline queue badge/panel
interface OfflineQueueProps {
  showPanel?: boolean;
  onItemCancel?: (itemId: string) => void;
}

// PWA settings section
interface PWASettingsProps {
  // No props - self-contained settings panel
}
```

### Hooks

```typescript
interface UseOfflineStoreReturn {
  // Status
  isOnline: boolean;
  isInitialized: boolean;
  
  // Cache operations
  cacheThread: (thread: ThreadData) => Promise<void>;
  getCachedThread: (id: string) => Promise<CachedThread | null>;
  getCachedThreads: () => Promise<CachedThread[]>;
  
  // Queue operations
  queueAction: (item: Omit<OfflineQueueItem, 'id' | 'createdAt' | 'retryCount' | 'lastRetryAt' | 'status'>) => Promise<string>;
  getQueuedActions: () => Promise<OfflineQueueItem[]>;
  cancelQueuedAction: (id: string) => Promise<void>;
  getQueueCount: () => Promise<number>;
  
  // Cache management
  getCacheSize: () => Promise<number>;
  clearCache: () => Promise<void>;
  pruneCache: () => Promise<number>; // returns items removed
}

interface UsePushNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
}
```

### API Interfaces

```typescript
// Push subscription request
interface PushSubscribeRequest {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// Push notification payload
interface PushNotificationPayload {
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

// Offline queue item for serialization
interface SerializedQueueItem {
  id: string;
  type: string;
  action: string;
  payload: string; // JSON string
  createdAt: number;
  retryCount: number;
  lastRetryAt: number | null;
  status: string;
}
```

## Data Models

### IndexedDB Stores

```typescript
// Store definitions for idb library
const stores = {
  cachedThreads: {
    name: 'cached_threads',
    keyPath: 'id',
    indexes: [
      { name: 'cachedAt', keyPath: 'cachedAt' },
      { name: 'expiresAt', keyPath: 'expiresAt' },
    ],
  },
  cachedComments: {
    name: 'cached_comments',
    keyPath: 'id',
    indexes: [
      { name: 'threadId', keyPath: 'threadId' },
      { name: 'cachedAt', keyPath: 'cachedAt' },
    ],
  },
  offlineQueue: {
    name: 'offline_queue',
    keyPath: 'id',
    indexes: [
      { name: 'type', keyPath: 'type' },
      { name: 'status', keyPath: 'status' },
      { name: 'createdAt', keyPath: 'createdAt' },
    ],
  },
  pushSubscription: {
    name: 'push_subscription',
    keyPath: 'id',
  },
  appMetadata: {
    name: 'app_metadata',
    keyPath: 'key',
  },
};
```

### Cache Configuration

```typescript
const CACHE_CONFIG = {
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
};
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Cache timestamp validity
*For any* cached thread or comment, the cachedAt timestamp should be a valid number less than or equal to the current time, and expiresAt should be greater than cachedAt.
**Validates: Requirements 1.1, 1.4**

### Property 2: Staleness detection consistency
*For any* cached item with cachedAt timestamp and current time, the staleness check should return true if and only if (currentTime - cachedAt) > staleThreshold.
**Validates: Requirements 1.5**

### Property 3: Offline queue item structure
*For any* offline action (comment, vote, reaction), when queued, the resulting OfflineQueueItem should have status 'pending', retryCount 0, and valid createdAt timestamp.
**Validates: Requirements 2.1, 2.2**

### Property 4: Queue count accuracy
*For any* set of queued actions, getQueueCount should return the exact number of items with status 'pending' or 'failed'.
**Validates: Requirements 2.3**

### Property 5: Retry delay calculation
*For any* retry count N (0 to maxRetries), the calculated delay should equal min(baseRetryDelay * 2^N, maxRetryDelay).
**Validates: Requirements 2.5**

### Property 6: Queue removal on success
*For any* offline queue item that is successfully synced, the item should no longer exist in the queue after sync completion.
**Validates: Requirements 2.6**

### Property 7: Notification URL extraction
*For any* push notification with a url field, clicking the notification should navigate to that exact URL.
**Validates: Requirements 3.5**

### Property 8: Cache strategy selection
*For any* request URL, the cache strategy should be: cache-first for static assets (/icons, /_next/static), network-first for API single items (/api/threads/[id]), stale-while-revalidate for API lists (/api/threads, /api/comments).
**Validates: Requirements 4.2, 4.3**

### Property 9: Cache pruning preserves app shell
*For any* cache pruning operation, the essential app shell items (/, /offline, /manifest.json) should never be removed.
**Validates: Requirements 5.2**

### Property 10: Queue item serialization round-trip
*For any* valid OfflineQueueItem, serializing to JSON and deserializing back should produce an equivalent object.
**Validates: Requirements 6.2, 6.3**

## Error Handling

| Error Case | Handling |
|------------|----------|
| IndexedDB not supported | Graceful degradation - disable offline features, show warning |
| IndexedDB quota exceeded | Trigger cache pruning, retry operation |
| Background Sync not supported | Fall back to manual sync on reconnect |
| Push not supported | Hide push notification options in settings |
| Push permission denied | Show explanation and link to browser settings |
| Network error during sync | Increment retry count, schedule retry with backoff |
| Invalid cached data | Remove corrupted entry, log error |
| Service Worker registration failed | Log error, app continues without offline support |

## Testing Strategy

### Unit Tests
- IndexedDB operations (CRUD for each store)
- Cache strategy selection logic
- Retry delay calculation
- Staleness detection
- Queue count calculation

### Property-Based Tests

Se utilizará **fast-check** como librería de property-based testing.

Cada test debe:
- Ejecutar mínimo 100 iteraciones
- Estar anotado con el formato: `**Feature: pwa-offline, Property {number}: {property_text}**`

Tests a implementar:
1. Cache timestamp validity (Property 1)
2. Staleness detection (Property 2)
3. Queue item structure (Property 3)
4. Queue count accuracy (Property 4)
5. Retry delay calculation (Property 5)
6. Queue removal on success (Property 6)
7. Notification URL extraction (Property 7)
8. Cache strategy selection (Property 8)
9. Cache pruning preserves app shell (Property 9)
10. Serialization round-trip (Property 10)

### Integration Tests
- Service Worker registration and activation
- Push subscription flow
- Background Sync trigger
- Cache/network fallback behavior
