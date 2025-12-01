'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { pushStore, type PushSubscriptionRecord } from '@/lib/offline';

/**
 * Return type for the usePushNotifications hook
 * Requirements: 3.1, 3.2
 */
export interface UsePushNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
}

/**
 * Convert VAPID public key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Generate a unique ID for push subscription records
 */
function generateSubscriptionId(): string {
  return `push_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}


/**
 * Hook for managing push notifications
 * 
 * Features:
 * - Check browser support for push notifications
 * - Request and track notification permission (Requirement 3.1)
 * - Subscribe/unsubscribe from push notifications (Requirement 3.2)
 * - Store subscription in IndexedDB and sync with server
 * 
 * Requirements: 3.1, 3.2
 */
export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const isMountedRef = useRef(true);

  // Check support and current subscription status on mount
  useEffect(() => {
    isMountedRef.current = true;

    const checkSupport = async () => {
      // Check if push notifications are supported
      const supported = 
        typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;

      if (isMountedRef.current) {
        setIsSupported(supported);
      }

      if (!supported) {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
        return;
      }

      // Get current permission
      if (isMountedRef.current) {
        setPermission(Notification.permission);
      }

      // Check if already subscribed
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (isMountedRef.current) {
          setIsSubscribed(!!subscription);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[usePushNotifications] Error checking subscription:', err);
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    checkSupport();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Subscribe to push notifications
   * Requirement 3.1: Request browser permission and create push subscription
   * Requirement 3.2: Send subscription endpoint to server for storage
   */
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Push notifications are not supported');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Request notification permission if not granted
      if (Notification.permission === 'default') {
        const result = await Notification.requestPermission();
        if (isMountedRef.current) {
          setPermission(result);
        }
        
        if (result !== 'granted') {
          setError('Notification permission denied');
          setIsLoading(false);
          return false;
        }
      } else if (Notification.permission === 'denied') {
        setError('Notification permission denied. Please enable in browser settings.');
        setIsLoading(false);
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Get VAPID public key
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          setError('Push notification configuration missing');
          setIsLoading(false);
          return false;
        }

        // Create new subscription
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
        });
      }

      // Extract subscription data
      const subscriptionJson = subscription.toJSON();
      const keys = subscriptionJson.keys as { p256dh: string; auth: string } | undefined;
      
      if (!keys?.p256dh || !keys?.auth) {
        setError('Invalid subscription keys');
        setIsLoading(false);
        return false;
      }

      // Store subscription in IndexedDB
      const subscriptionRecord: PushSubscriptionRecord = {
        id: generateSubscriptionId(),
        endpoint: subscription.endpoint,
        keys: {
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        createdAt: Date.now(),
      };

      await pushStore.clear(); // Clear any existing subscriptions
      await pushStore.put(subscriptionRecord);

      // Send subscription to server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: keys.p256dh,
            auth: keys.auth,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to register subscription with server');
      }

      if (isMountedRef.current) {
        setIsSubscribed(true);
        setIsLoading(false);
      }

      return true;
    } catch (err) {
      console.error('[usePushNotifications] Subscribe error:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to subscribe');
        setIsLoading(false);
      }
      return false;
    }
  }, [isSupported]);

  /**
   * Unsubscribe from push notifications
   * Requirement 3.2: Remove subscription from server
   */
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from push manager
        await subscription.unsubscribe();

        // Remove from server
        try {
          await fetch('/api/push/subscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              endpoint: subscription.endpoint,
            }),
          });
        } catch (serverError) {
          // Log but don't fail - local unsubscribe succeeded
          console.warn('[usePushNotifications] Failed to remove subscription from server:', serverError);
        }
      }

      // Clear from IndexedDB
      await pushStore.clear();

      if (isMountedRef.current) {
        setIsSubscribed(false);
        setIsLoading(false);
      }

      return true;
    } catch (err) {
      console.error('[usePushNotifications] Unsubscribe error:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to unsubscribe');
        setIsLoading(false);
      }
      return false;
    }
  }, [isSupported]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  };
}
