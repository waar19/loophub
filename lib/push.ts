import webpush from 'web-push';
import { createClient } from '@/lib/supabase-server';
import type { PushNotificationPayload } from '@/lib/offline/types';

/**
 * Push notification utility for sending web push notifications
 * Requirements: 3.3
 */

// Configure VAPID keys from environment variables
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@loophub.app';

// Initialize web-push with VAPID details
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

/**
 * Check if push notifications are properly configured
 */
export function isPushConfigured(): boolean {
  return !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}

/**
 * Push subscription data from database
 */
interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Send a push notification to a specific user
 * Requirements: 3.3
 * 
 * @param userId - The user ID to send the notification to
 * @param payload - The notification payload
 * @returns Object with success status and any errors
 */
export async function sendPushNotification(
  userId: string,
  payload: PushNotificationPayload
): Promise<{ success: boolean; sent: number; failed: number; errors: string[] }> {
  if (!isPushConfigured()) {
    return {
      success: false,
      sent: 0,
      failed: 0,
      errors: ['Push notifications not configured. Missing VAPID keys.'],
    };
  }

  const supabase = await createClient();
  const errors: string[] = [];
  let sent = 0;
  let failed = 0;

  // Get all subscriptions for the user
  const { data: subscriptions, error: fetchError } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId);

  if (fetchError) {
    return {
      success: false,
      sent: 0,
      failed: 0,
      errors: [`Failed to fetch subscriptions: ${fetchError.message}`],
    };
  }

  if (!subscriptions || subscriptions.length === 0) {
    return {
      success: true,
      sent: 0,
      failed: 0,
      errors: [],
    };
  }

  // Send notification to each subscription
  for (const subscription of subscriptions as PushSubscription[]) {
    try {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      };

      await webpush.sendNotification(
        pushSubscription,
        JSON.stringify(payload)
      );
      sent++;
    } catch (error) {
      failed++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Failed to send to ${subscription.endpoint}: ${errorMessage}`);

      // If subscription is invalid (410 Gone or 404), remove it
      if (
        error instanceof webpush.WebPushError &&
        (error.statusCode === 410 || error.statusCode === 404)
      ) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('id', subscription.id);
      }
    }
  }

  return {
    success: sent > 0 || (sent === 0 && failed === 0),
    sent,
    failed,
    errors,
  };
}

/**
 * Send a push notification to multiple users
 * Requirements: 3.3
 * 
 * @param userIds - Array of user IDs to send notifications to
 * @param payload - The notification payload
 * @returns Object with success status and statistics
 */
export async function sendPushNotificationToMany(
  userIds: string[],
  payload: PushNotificationPayload
): Promise<{ success: boolean; totalSent: number; totalFailed: number; errors: string[] }> {
  if (!isPushConfigured()) {
    return {
      success: false,
      totalSent: 0,
      totalFailed: 0,
      errors: ['Push notifications not configured. Missing VAPID keys.'],
    };
  }

  let totalSent = 0;
  let totalFailed = 0;
  const allErrors: string[] = [];

  // Send to each user
  for (const userId of userIds) {
    const result = await sendPushNotification(userId, payload);
    totalSent += result.sent;
    totalFailed += result.failed;
    allErrors.push(...result.errors);
  }

  return {
    success: totalSent > 0 || (totalSent === 0 && totalFailed === 0),
    totalSent,
    totalFailed,
    errors: allErrors,
  };
}

/**
 * Create a notification payload for a new comment
 * Requirements: 3.3
 */
export function createCommentNotificationPayload(
  authorName: string,
  threadTitle: string,
  threadId: string,
  commentPreview: string
): PushNotificationPayload {
  return {
    title: `${authorName} commented`,
    body: commentPreview.length > 100 
      ? `${commentPreview.substring(0, 97)}...` 
      : commentPreview,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: `comment-${threadId}`,
    url: `/thread/${threadId}`,
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };
}

/**
 * Create a notification payload for a mention
 * Requirements: 3.3
 */
export function createMentionNotificationPayload(
  authorName: string,
  threadId: string,
  contentPreview: string
): PushNotificationPayload {
  return {
    title: `${authorName} mentioned you`,
    body: contentPreview.length > 100 
      ? `${contentPreview.substring(0, 97)}...` 
      : contentPreview,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: `mention-${threadId}`,
    url: `/thread/${threadId}`,
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };
}

/**
 * Create a notification payload for a reaction
 * Requirements: 3.3
 */
export function createReactionNotificationPayload(
  authorName: string,
  reaction: string,
  contentType: 'thread' | 'comment',
  contentId: string,
  threadId: string
): PushNotificationPayload {
  return {
    title: `${authorName} reacted ${reaction}`,
    body: `to your ${contentType}`,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: `reaction-${contentType}-${contentId}`,
    url: `/thread/${threadId}`,
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };
}
