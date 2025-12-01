'use client';

import { useCallback } from 'react';
import { useOfflineStore } from './useOfflineStore';

interface VoteInput {
  threadId?: string;
  commentId?: string;
  voteType: 1 | -1;
}

interface VoteResult {
  success: boolean;
  upvotes?: number;
  downvotes?: number;
  error?: string;
  queued?: boolean;
}

interface UseOfflineVoteReturn {
  vote: (input: VoteInput) => Promise<VoteResult>;
  removeVote: (input: Omit<VoteInput, 'voteType'>) => Promise<VoteResult>;
  isOnline: boolean;
  queueCount: number;
}

/**
 * Hook for voting with offline support
 * 
 * When online: Sends vote directly to server
 * When offline: Queues vote for later sync (Requirement 2.2)
 * 
 * Requirements: 2.1, 2.2
 */
export function useOfflineVote(): UseOfflineVoteReturn {
  const { isOnline, queueAction, queueCount, isSupported } = useOfflineStore();

  const vote = useCallback(async (input: VoteInput): Promise<VoteResult> => {
    // If online, send vote directly
    if (isOnline) {
      try {
        const res = await fetch('/api/votes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            threadId: input.threadId,
            commentId: input.commentId,
            voteType: input.voteType,
          }),
        });

        if (!res.ok) {
          const error = await res.json();
          return { success: false, error: error.error || 'Failed to vote' };
        }

        const data = await res.json();
        return {
          success: true,
          upvotes: data.upvotes,
          downvotes: data.downvotes,
        };
      } catch (error) {
        console.error('[useOfflineVote] Error voting:', error);
        return { success: false, error: 'Network error' };
      }
    }

    // If offline and IndexedDB is supported, queue the action
    if (isSupported) {
      try {
        await queueAction({
          type: 'vote',
          action: 'create',
          payload: {
            threadId: input.threadId || null,
            commentId: input.commentId || null,
            voteType: input.voteType,
          },
        });

        return {
          success: true,
          queued: true,
        };
      } catch (error) {
        console.error('[useOfflineVote] Error queuing vote:', error);
        return {
          success: false,
          error: 'Failed to queue vote for offline sync',
        };
      }
    }

    // If offline and IndexedDB not supported, return error
    return {
      success: false,
      error: 'You are offline and offline storage is not available',
    };
  }, [isOnline, isSupported, queueAction]);

  const removeVote = useCallback(async (
    input: Omit<VoteInput, 'voteType'>
  ): Promise<VoteResult> => {
    // If online, remove vote directly
    if (isOnline) {
      try {
        const params = new URLSearchParams();
        if (input.threadId) params.set('threadId', input.threadId);
        if (input.commentId) params.set('commentId', input.commentId);

        const res = await fetch(`/api/votes?${params}`, {
          method: 'DELETE',
        });

        if (!res.ok) {
          const error = await res.json();
          return { success: false, error: error.error || 'Failed to remove vote' };
        }

        const data = await res.json();
        return {
          success: true,
          upvotes: data.upvotes,
          downvotes: data.downvotes,
        };
      } catch (error) {
        console.error('[useOfflineVote] Error removing vote:', error);
        return { success: false, error: 'Network error' };
      }
    }

    // If offline and IndexedDB is supported, queue the delete action
    if (isSupported) {
      try {
        await queueAction({
          type: 'vote',
          action: 'delete',
          payload: {
            threadId: input.threadId || null,
            commentId: input.commentId || null,
          },
        });

        return {
          success: true,
          queued: true,
        };
      } catch (error) {
        console.error('[useOfflineVote] Error queuing vote removal:', error);
        return {
          success: false,
          error: 'Failed to queue vote removal for offline sync',
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
    vote,
    removeVote,
    isOnline,
    queueCount,
  };
}
