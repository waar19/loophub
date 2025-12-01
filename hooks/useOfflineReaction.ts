'use client';

import { useCallback } from 'react';
import { useOfflineStore } from './useOfflineStore';
import type { ReactionType, ContentType } from '@/lib/reactions';

interface ReactionInput {
  contentType: ContentType;
  contentId: string;
  reactionType: ReactionType;
}

interface ReactionResult {
  success: boolean;
  reactions?: Array<{ type: ReactionType; count: number; hasReacted: boolean }>;
  error?: string;
  queued?: boolean;
}

interface UseOfflineReactionReturn {
  toggleReaction: (input: ReactionInput) => Promise<ReactionResult>;
  isOnline: boolean;
  queueCount: number;
}

/**
 * Hook for toggling reactions with offline support
 * 
 * When online: Sends reaction directly to server
 * When offline: Queues reaction for later sync (Requirement 2.1, 2.2)
 * 
 * Requirements: 2.1, 2.2
 */
export function useOfflineReaction(): UseOfflineReactionReturn {
  const { isOnline, queueAction, queueCount, isSupported } = useOfflineStore();

  const toggleReaction = useCallback(async (input: ReactionInput): Promise<ReactionResult> => {
    // If online, send reaction directly
    if (isOnline) {
      try {
        const res = await fetch('/api/reactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentType: input.contentType,
            contentId: input.contentId,
            reactionType: input.reactionType,
          }),
        });

        if (!res.ok) {
          const error = await res.json();
          return { success: false, error: error.error || 'Failed to toggle reaction' };
        }

        const data = await res.json();
        return {
          success: true,
          reactions: data.reactions,
        };
      } catch (error) {
        console.error('[useOfflineReaction] Error toggling reaction:', error);
        return { success: false, error: 'Network error' };
      }
    }

    // If offline and IndexedDB is supported, queue the action
    if (isSupported) {
      try {
        await queueAction({
          type: 'reaction',
          action: 'create', // Toggle is handled server-side
          payload: {
            contentType: input.contentType,
            contentId: input.contentId,
            reactionType: input.reactionType,
          },
        });

        return {
          success: true,
          queued: true,
        };
      } catch (error) {
        console.error('[useOfflineReaction] Error queuing reaction:', error);
        return {
          success: false,
          error: 'Failed to queue reaction for offline sync',
        };
      }
    }

    // If offline and IndexedDB not supported, return error
    return {
      success: false,
      error: 'You are offline and offline storage is not available',
    };
  }, [isOnline, isSupported, queueAction]);

  return {
    toggleReaction,
    isOnline,
    queueCount,
  };
}
