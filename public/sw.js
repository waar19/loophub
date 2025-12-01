/**
 * LoopHub Service Worker
 * Requirements: 4.2, 4.3, 2.4, 2.6, 3.4, 3.5
 *
 * Implements:
 * - Cache strategies: cache-first, network-first, stale-while-revalidate
 * - Background Sync for offline actions
 * - Push notification handling
 */

const STATIC_CACHE = 'loophub-static-v1';
const DYNAMIC_CACHE = 'loophub-dynamic-v1';

// Static assets to cache (app shell)
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// App shell paths that should never be pruned (used by cache management module)
const APP_SHELL_PATHS = ['/', '/offline', '/manifest.json'];

// ============================================================================
// Cache Strategy Configuration (Requirements 4.2, 4.3)
// Property 8: Cache strategy selection
// ============================================================================

/**
 * Determines the appropriate cache strategy for a given URL.
 *
 * Property 8: Cache strategy selection
 * For any request URL, the cache strategy should be:
 * - cache-first for static assets (/icons, /_next/static)
 * - network-first for API single items (/api/threads/[id])
 * - stale-while-revalidate for API lists (/api/threads, /api/comments)
 *
 * @param {URL} url - The request URL
 * @param {Request} request - The fetch request
 * @returns {'cache-first' | 'network-first' | 'stale-while-revalidate' | 'network-only'}
 */
function getCacheStrategy(url, request) {
  const pathname = url.pathname;

  // Static assets - cache-first
  // Includes: /icons/*, /_next/static/*, fonts, images, scripts, styles
  if (
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/fonts/') ||
    pathname.endsWith('.ico') ||
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.destination === 'style' ||
    request.destination === 'script'
  ) {
    return 'cache-first';
  }

  // API single item routes - network-first
  // Pattern: /api/threads/[id], /api/comments/[id], /api/forums/[slug]
  // These are identified by having a path segment after the resource type
  if (pathname.startsWith('/api/')) {
    // Check if it's a single item request (has ID/slug after resource)
    const apiSingleItemPatterns = [
      /^\/api\/threads\/[^/]+$/,           // /api/threads/[id]
      /^\/api\/threads\/[^/]+\/comments$/, // /api/threads/[id]/comments
      /^\/api\/comments\/[^/]+$/,          // /api/comments/[id]
      /^\/api\/forums\/[^/]+$/,            // /api/forums/[slug]
      /^\/api\/forums\/[^/]+\/threads$/,   // /api/forums/[slug]/threads
      /^\/api\/communities\/[^/]+$/,       // /api/communities/[slug]
      /^\/api\/profile\/[^/]+$/,           // /api/profile/[id]
      /^\/api\/users\/[^/]+$/,             // /api/users/[id]
      /^\/api\/polls\/[^/]+$/,             // /api/polls/[id]
      /^\/api\/polls\/by-thread\/[^/]+$/,  // /api/polls/by-thread/[id]
    ];

    const isSingleItem = apiSingleItemPatterns.some((pattern) =>
      pattern.test(pathname)
    );

    if (isSingleItem) {
      return 'network-first';
    }

    // API list routes - stale-while-revalidate
    // Pattern: /api/threads, /api/comments, /api/forums, etc.
    const apiListPatterns = [
      /^\/api\/threads\/?$/,
      /^\/api\/comments\/?$/,
      /^\/api\/forums\/?$/,
      /^\/api\/communities\/?$/,
      /^\/api\/notifications\/?$/,
      /^\/api\/bookmarks\/?$/,
      /^\/api\/tags\/?$/,
      /^\/api\/search\/?$/,
      /^\/api\/feed\//,
    ];

    const isList = apiListPatterns.some((pattern) => pattern.test(pathname));

    if (isList) {
      return 'stale-while-revalidate';
    }

    // Default for other API routes - network-first
    return 'network-first';
  }

  // HTML documents - network-first with offline fallback
  if (request.destination === 'document') {
    return 'network-first';
  }

  // Default - stale-while-revalidate
  return 'stale-while-revalidate';
}

// ============================================================================
// Install Event
// ============================================================================

self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// ============================================================================
// Activate Event
// ============================================================================

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return name !== STATIC_CACHE && name !== DYNAMIC_CACHE;
          })
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  return self.clients.claim();
});

// ============================================================================
// Fetch Event - Route to appropriate cache strategy
// ============================================================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // Skip cross-origin requests (except for CDN assets)
  if (url.origin !== self.location.origin) {
    // Allow caching of CDN assets
    if (request.destination === 'image' || request.destination === 'font') {
      event.respondWith(cacheFirst(request));
    }
    return;
  }

  // Get the appropriate cache strategy
  const strategy = getCacheStrategy(url, request);

  switch (strategy) {
    case 'cache-first':
      event.respondWith(cacheFirst(request));
      break;
    case 'network-first':
      if (request.destination === 'document') {
        event.respondWith(networkFirstWithOffline(request));
      } else {
        event.respondWith(networkFirst(request));
      }
      break;
    case 'stale-while-revalidate':
      event.respondWith(staleWhileRevalidate(request));
      break;
    default:
      event.respondWith(networkFirst(request));
  }
});


// ============================================================================
// Cache Strategies Implementation
// ============================================================================

/**
 * Cache-first strategy: Try cache, fallback to network
 * Used for static assets that rarely change
 * Requirements: 4.2
 */
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Cache first failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Network-first strategy: Try network, fallback to cache
 * Used for single API items where freshness is important
 * Requirements: 4.3
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Network-first with offline page fallback
 * Used for HTML documents
 * Requirements: 4.3
 */
async function networkFirstWithOffline(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Return offline page
    const offlineResponse = await caches.match('/offline');
    if (offlineResponse) {
      return offlineResponse;
    }
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Stale-while-revalidate strategy: Return cache immediately, update in background
 * Used for API lists where some staleness is acceptable
 * Requirements: 4.3
 */
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);

  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        const cache = caches.open(DYNAMIC_CACHE);
        cache.then((c) => c.put(request, networkResponse.clone()));
      }
      return networkResponse;
    })
    .catch(() => null);

  // Return cached response immediately if available, otherwise wait for network
  if (cachedResponse) {
    // Trigger background update
    fetchPromise.catch(() => {});
    return cachedResponse;
  }

  // No cache, wait for network
  const networkResponse = await fetchPromise;
  if (networkResponse) {
    return networkResponse;
  }

  return new Response(JSON.stringify({ error: 'Offline' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });
}


// ============================================================================
// Background Sync Handlers (Requirements 2.4, 2.6)
// ============================================================================

/**
 * Background Sync event handler
 * Processes offline queue items when connection is restored
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  switch (event.tag) {
    case 'sync-comments':
      event.waitUntil(syncOfflineActions('comment'));
      break;
    case 'sync-votes':
      event.waitUntil(syncOfflineActions('vote'));
      break;
    case 'sync-reactions':
      event.waitUntil(syncOfflineActions('reaction'));
      break;
    case 'sync-all':
      event.waitUntil(syncAllOfflineActions());
      break;
    default:
      console.log('[SW] Unknown sync tag:', event.tag);
  }
});

/**
 * Syncs all offline actions of a specific type
 * @param {string} actionType - The type of action to sync ('comment', 'vote', 'reaction')
 */
async function syncOfflineActions(actionType) {
  console.log(`[SW] Syncing ${actionType} actions...`);

  try {
    const items = await getOfflineQueueItems(actionType);
    console.log(`[SW] Found ${items.length} ${actionType} items to sync`);

    for (const item of items) {
      await syncSingleItem(item);
    }

    // Notify clients that sync is complete
    await notifyClients({
      type: 'SYNC_COMPLETE',
      actionType,
      count: items.length,
    });
  } catch (error) {
    console.error(`[SW] Error syncing ${actionType} actions:`, error);
  }
}

/**
 * Syncs all offline actions regardless of type
 */
async function syncAllOfflineActions() {
  console.log('[SW] Syncing all offline actions...');

  try {
    const items = await getAllOfflineQueueItems();
    console.log(`[SW] Found ${items.length} total items to sync`);

    let successCount = 0;
    let failCount = 0;

    for (const item of items) {
      const success = await syncSingleItem(item);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    // Notify clients that sync is complete
    await notifyClients({
      type: 'SYNC_COMPLETE',
      actionType: 'all',
      successCount,
      failCount,
    });
  } catch (error) {
    console.error('[SW] Error syncing all actions:', error);
  }
}

/**
 * Syncs a single offline queue item
 * @param {Object} item - The queue item to sync
 * @returns {Promise<boolean>} - Whether the sync was successful
 */
async function syncSingleItem(item) {
  console.log(`[SW] Syncing item ${item.id} (${item.type}/${item.action})`);

  try {
    // Mark as syncing
    await updateQueueItemStatus(item.id, 'syncing');

    // Determine the API endpoint and method based on action type
    const { url, method, body } = getApiConfig(item);

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });

    if (response.ok) {
      // Success - remove from queue
      await removeQueueItem(item.id);
      console.log(`[SW] Successfully synced item ${item.id}`);
      return true;
    } else {
      // Server error - mark for retry
      const shouldRetry = item.retryCount < 3;
      if (shouldRetry) {
        await markQueueItemForRetry(item.id, item.retryCount + 1);
        console.log(`[SW] Item ${item.id} marked for retry (attempt ${item.retryCount + 1})`);
      } else {
        await updateQueueItemStatus(item.id, 'failed');
        console.log(`[SW] Item ${item.id} failed after max retries`);
      }
      return false;
    }
  } catch (error) {
    console.error(`[SW] Error syncing item ${item.id}:`, error);
    // Network error - mark for retry
    const shouldRetry = item.retryCount < 3;
    if (shouldRetry) {
      await markQueueItemForRetry(item.id, item.retryCount + 1);
    } else {
      await updateQueueItemStatus(item.id, 'failed');
    }
    return false;
  }
}

/**
 * Gets the API configuration for a queue item
 * @param {Object} item - The queue item
 * @returns {Object} - { url, method, body }
 */
function getApiConfig(item) {
  const { type, action, payload } = item;

  switch (type) {
    case 'comment':
      if (action === 'create') {
        return {
          url: `/api/threads/${payload.threadId}/comments`,
          method: 'POST',
          body: { content: payload.content, parentId: payload.parentId },
        };
      } else if (action === 'update') {
        return {
          url: `/api/comments/${payload.commentId}`,
          method: 'PATCH',
          body: { content: payload.content },
        };
      } else if (action === 'delete') {
        return {
          url: `/api/comments/${payload.commentId}`,
          method: 'DELETE',
          body: null,
        };
      }
      break;

    case 'vote':
      return {
        url: '/api/votes',
        method: 'POST',
        body: {
          targetId: payload.targetId,
          targetType: payload.targetType,
          value: payload.value,
        },
      };

    case 'reaction':
      if (action === 'create') {
        return {
          url: '/api/reactions',
          method: 'POST',
          body: {
            targetId: payload.targetId,
            targetType: payload.targetType,
            emoji: payload.emoji,
          },
        };
      } else if (action === 'delete') {
        return {
          url: `/api/reactions?targetId=${payload.targetId}&targetType=${payload.targetType}&emoji=${payload.emoji}`,
          method: 'DELETE',
          body: null,
        };
      }
      break;
  }

  // Default fallback
  return { url: '/api/offline-sync', method: 'POST', body: item };
}


// ============================================================================
// IndexedDB Operations for Service Worker
// ============================================================================

const DB_NAME = 'loophub-offline';
const DB_VERSION = 1;
const QUEUE_STORE = 'offline_queue';

/**
 * Opens the IndexedDB database
 * @returns {Promise<IDBDatabase>}
 */
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create stores if they don't exist
      if (!db.objectStoreNames.contains('cached_threads')) {
        const threadsStore = db.createObjectStore('cached_threads', { keyPath: 'id' });
        threadsStore.createIndex('cachedAt', 'cachedAt');
        threadsStore.createIndex('expiresAt', 'expiresAt');
      }

      if (!db.objectStoreNames.contains('cached_comments')) {
        const commentsStore = db.createObjectStore('cached_comments', { keyPath: 'id' });
        commentsStore.createIndex('threadId', 'threadId');
        commentsStore.createIndex('cachedAt', 'cachedAt');
      }

      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const queueStore = db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
        queueStore.createIndex('type', 'type');
        queueStore.createIndex('status', 'status');
        queueStore.createIndex('createdAt', 'createdAt');
      }

      if (!db.objectStoreNames.contains('push_subscription')) {
        db.createObjectStore('push_subscription', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('app_metadata')) {
        db.createObjectStore('app_metadata', { keyPath: 'key' });
      }
    };
  });
}

/**
 * Gets all offline queue items of a specific type
 * @param {string} actionType - The type of action
 * @returns {Promise<Array>}
 */
async function getOfflineQueueItems(actionType) {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readonly');
      const store = tx.objectStore(QUEUE_STORE);
      const index = store.index('type');
      const request = index.getAll(actionType);

      request.onsuccess = () => {
        const items = request.result.filter(
          (item) => item.status === 'pending' || item.status === 'failed'
        );
        resolve(items.sort((a, b) => a.createdAt - b.createdAt));
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[SW] Error getting queue items:', error);
    return [];
  }
}

/**
 * Gets all offline queue items regardless of type
 * @returns {Promise<Array>}
 */
async function getAllOfflineQueueItems() {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readonly');
      const store = tx.objectStore(QUEUE_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result.filter(
          (item) => item.status === 'pending' || item.status === 'failed'
        );
        resolve(items.sort((a, b) => a.createdAt - b.createdAt));
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[SW] Error getting all queue items:', error);
    return [];
  }
}

/**
 * Updates the status of a queue item
 * @param {string} id - The item ID
 * @param {string} status - The new status
 */
async function updateQueueItemStatus(id, status) {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(QUEUE_STORE);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.status = status;
          const putRequest = store.put(item);
          putRequest.onsuccess = () => resolve(true);
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve(false);
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch (error) {
    console.error('[SW] Error updating queue item status:', error);
  }
}

/**
 * Marks a queue item for retry
 * @param {string} id - The item ID
 * @param {number} retryCount - The new retry count
 */
async function markQueueItemForRetry(id, retryCount) {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(QUEUE_STORE);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.retryCount = retryCount;
          item.lastRetryAt = Date.now();
          item.status = 'pending';
          const putRequest = store.put(item);
          putRequest.onsuccess = () => resolve(true);
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve(false);
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch (error) {
    console.error('[SW] Error marking item for retry:', error);
  }
}

/**
 * Removes a queue item after successful sync
 * @param {string} id - The item ID
 */
async function removeQueueItem(id) {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(QUEUE_STORE);
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[SW] Error removing queue item:', error);
  }
}

/**
 * Notifies all clients of an event
 * @param {Object} message - The message to send
 */
async function notifyClients(message) {
  const clients = await self.clients.matchAll({ type: 'window' });
  for (const client of clients) {
    client.postMessage(message);
  }
}


// ============================================================================
// Push Notification Handling (Requirements 3.4, 3.5)
// ============================================================================

/**
 * Push notification event handler
 * Displays native notifications with actions
 * Requirements: 3.4
 */
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);

  if (!event.data) {
    console.log('[SW] Push event has no data');
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (error) {
    console.error('[SW] Error parsing push data:', error);
    data = { title: 'LoopHub', body: event.data.text() };
  }

  const title = data.title || 'LoopHub';

  // Build notification options with enhanced actions
  const options = {
    body: data.body || 'You have a new notification',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now(),
      notificationId: data.notificationId,
      type: data.type, // 'comment', 'mention', 'reaction', etc.
    },
    // Enhanced actions based on notification type
    actions: getNotificationActions(data),
    tag: data.tag || `loophub-${data.type || 'notification'}-${Date.now()}`,
    renotify: data.renotify !== false,
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
  };

  // Add image if provided (for rich notifications)
  if (data.image) {
    options.image = data.image;
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

/**
 * Gets appropriate notification actions based on notification type
 * @param {Object} data - The notification data
 * @returns {Array} - Array of notification actions
 */
function getNotificationActions(data) {
  // Use custom actions if provided
  if (data.actions && Array.isArray(data.actions)) {
    return data.actions;
  }

  // Default actions based on notification type
  const type = data.type || 'default';

  switch (type) {
    case 'comment':
    case 'reply':
      return [
        { action: 'view', title: 'View Thread' },
        { action: 'reply', title: 'Reply' },
        { action: 'dismiss', title: 'Dismiss' },
      ];

    case 'mention':
      return [
        { action: 'view', title: 'View Mention' },
        { action: 'dismiss', title: 'Dismiss' },
      ];

    case 'reaction':
      return [
        { action: 'view', title: 'View' },
        { action: 'dismiss', title: 'Dismiss' },
      ];

    case 'follow':
      return [
        { action: 'view', title: 'View Profile' },
        { action: 'dismiss', title: 'Dismiss' },
      ];

    default:
      return [
        { action: 'open', title: 'Open' },
        { action: 'dismiss', title: 'Dismiss' },
      ];
  }
}

/**
 * Notification click event handler
 * Navigates to the relevant URL when notification is clicked
 *
 * Property 7: Notification URL extraction
 * For any push notification with a url field, clicking the notification
 * should navigate to that exact URL.
 *
 * Requirements: 3.5
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click:', event.action);

  // Close the notification
  event.notification.close();

  // Handle dismiss action - do nothing
  if (event.action === 'dismiss') {
    console.log('[SW] Notification dismissed');
    return;
  }

  // Extract the URL from notification data
  // Property 7: The URL should be exactly as specified in the notification
  const notificationUrl = extractNotificationUrl(event.notification);

  // Handle specific actions
  if (event.action === 'reply') {
    // For reply action, append a query param to focus the reply input
    const replyUrl = notificationUrl.includes('?')
      ? `${notificationUrl}&reply=true`
      : `${notificationUrl}?reply=true`;

    event.waitUntil(openOrFocusWindow(replyUrl));
    return;
  }

  // Default: open or focus the URL
  event.waitUntil(openOrFocusWindow(notificationUrl));
});

/**
 * Extracts the URL from a notification
 *
 * Property 7: Notification URL extraction
 * For any push notification with a url field, this function should
 * return that exact URL.
 *
 * @param {Notification} notification - The notification object
 * @returns {string} - The URL to navigate to
 */
function extractNotificationUrl(notification) {
  // Check notification data for URL
  if (notification.data && notification.data.url) {
    return notification.data.url;
  }

  // Fallback to root
  return '/';
}

/**
 * Opens a new window or focuses an existing one with the given URL
 * @param {string} url - The URL to open
 */
async function openOrFocusWindow(url) {
  // Get all window clients
  const clientList = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  // Check if there's already a window open with our origin
  for (const client of clientList) {
    if (client.url.includes(self.location.origin) && 'focus' in client) {
      // Navigate the existing window to the new URL
      await client.navigate(url);
      return client.focus();
    }
  }

  // No existing window, open a new one
  if (self.clients.openWindow) {
    return self.clients.openWindow(url);
  }
}

/**
 * Notification close event handler
 * Tracks when notifications are dismissed
 */
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);

  // Optionally track notification dismissal
  const notificationData = event.notification.data;
  if (notificationData && notificationData.notificationId) {
    // Could send analytics or mark as read
    console.log('[SW] Notification dismissed:', notificationData.notificationId);
  }
});

// ============================================================================
// Message Handler for Client Communication
// ============================================================================

self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  const { type, payload } = event.data || {};

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'TRIGGER_SYNC':
      // Manually trigger a sync
      if (payload && payload.tag) {
        self.registration.sync.register(payload.tag).catch((error) => {
          console.error('[SW] Error registering sync:', error);
        });
      }
      break;

    case 'GET_QUEUE_COUNT':
      // Return the current queue count
      getAllOfflineQueueItems().then((items) => {
        event.source.postMessage({
          type: 'QUEUE_COUNT',
          count: items.length,
        });
      });
      break;

    case 'CLEAR_CACHE':
      // Clear dynamic cache
      caches.delete(DYNAMIC_CACHE).then(() => {
        event.source.postMessage({ type: 'CACHE_CLEARED' });
      });
      break;

    default:
      console.log('[SW] Unknown message type:', type);
  }
});