/**
 * Push Notification URL Extraction Module
 *
 * Property 7: Notification URL extraction
 * For any push notification with a url field, clicking the notification
 * should navigate to that exact URL.
 *
 * Requirements: 3.5
 */

/**
 * Notification data structure as received from push notifications
 */
export interface NotificationData {
  url?: string;
  dateOfArrival?: number;
  notificationId?: string;
  type?: 'comment' | 'mention' | 'reaction' | 'follow' | 'reply' | string;
}

/**
 * Simplified notification object for URL extraction
 * Mirrors the structure of the Notification API's notification object
 */
export interface NotificationLike {
  data?: NotificationData | null;
}

/**
 * Default URL to navigate to when no URL is specified in the notification
 */
export const DEFAULT_NOTIFICATION_URL = '/';

/**
 * Extracts the URL from a notification object.
 *
 * Property 7: Notification URL extraction
 * For any push notification with a url field, this function should
 * return that exact URL.
 *
 * @param notification - The notification object (or notification-like object)
 * @returns The URL to navigate to, or the default URL if none specified
 */
export function extractNotificationUrl(notification: NotificationLike): string {
  // Check notification data for URL
  if (notification.data && notification.data.url) {
    return notification.data.url;
  }

  // Fallback to root
  return DEFAULT_NOTIFICATION_URL;
}

/**
 * Builds a reply URL by appending a reply query parameter
 *
 * @param baseUrl - The base URL to append the reply parameter to
 * @returns The URL with reply=true query parameter
 */
export function buildReplyUrl(baseUrl: string): string {
  if (baseUrl.includes('?')) {
    return `${baseUrl}&reply=true`;
  }
  return `${baseUrl}?reply=true`;
}
