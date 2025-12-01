'use client';

import { useCallback } from 'react';
import { useOfflineStore } from './useOfflineStore';
import { createComment } from '@/lib/actions/comments';

interface CreateCommentInput {
  threadId: string;
  content: string;
  parentId?: string | null;
}

interface UseOfflineCommentReturn {
  createComment: (input: CreateCommentInput) => Promise<{ success: boolean; data?: { id: string }; error?: string; queued?: boolean }>;
  isOnline: boolean;
  queueCount: number;
}

/**
 * Hook for creating comments with offline support
 * 
 * When online: Creates comment directly via server action
 * When offline: Queues comment for later sync (Requirement 2.1)
 * 
 * Requirements: 2.1, 2.2
 */
export function useOfflineComment(): UseOfflineCommentReturn {
  const { isOnline, queueAction, queueCount, isSupported } = useOfflineStore();

  const createCommentWithOffline = useCallback(async (
    input: CreateCommentInput
  ): Promise<{ success: boolean; data?: { id: string }; error?: string; queued?: boolean }> => {
    // If online, create comment directly
    if (isOnline) {
      return createComment(input);
    }

    // If offline and IndexedDB is supported, queue the action
    if (isSupported) {
      try {
        const queueId = await queueAction({
          type: 'comment',
          action: 'create',
          payload: {
            threadId: input.threadId,
            content: input.content,
            parentId: input.parentId || null,
          },
        });

        return {
          success: true,
          data: { id: queueId }, // Return queue ID as temporary ID
          queued: true,
        };
      } catch (error) {
        console.error('[useOfflineComment] Error queuing comment:', error);
        return {
          success: false,
          error: 'Failed to queue comment for offline sync',
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
    createComment: createCommentWithOffline,
    isOnline,
    queueCount,
  };
}
