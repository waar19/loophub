"use client";

import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  ReactionType,
  ContentType,
  ReactionSummary,
  ReactorInfo,
} from "@/lib/reactions";

/**
 * Return type for the useReactions hook
 * Requirements: 1.1, 1.2, 1.5
 */
export interface UseReactionsReturn {
  reactions: ReactionSummary[];
  isLoading: boolean;
  error: string | null;
  toggleReaction: (type: ReactionType) => Promise<void>;
  getReactors: (type: ReactionType) => Promise<{ reactors: ReactorInfo[]; totalCount: number }>;
}

interface UseReactionsOptions {
  contentType: ContentType;
  contentId: string;
  initialReactions?: ReactionSummary[];
}

/**
 * Hook for managing reactions on content (threads/comments)
 * 
 * Features:
 * - Fetch initial reactions
 * - Toggle reactions with optimistic UI updates (Requirement 1.5)
 * - Get reactor list for tooltips
 * - Handle loading and error states
 * 
 * Requirements: 1.1, 1.2, 1.5
 */
export function useReactions({
  contentType,
  contentId,
  initialReactions = [],
}: UseReactionsOptions): UseReactionsReturn {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<ReactionSummary[]>(initialReactions);
  const [isLoading, setIsLoading] = useState(!initialReactions.length);
  const [error, setError] = useState<string | null>(null);


  // Fetch initial reactions if not provided
  useEffect(() => {
    if (initialReactions.length > 0) {
      setIsLoading(false);
      return;
    }

    const fetchReactions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const params = new URLSearchParams({
          contentType,
          contentId,
        });
        
        const res = await fetch(`/api/reactions?${params}`);
        
        if (!res.ok) {
          throw new Error("Failed to fetch reactions");
        }
        
        const data = await res.json();
        setReactions(data.reactions || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load reactions");
        console.error("Error fetching reactions:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReactions();
  }, [contentType, contentId, initialReactions.length]);

  /**
   * Toggle a reaction (add if not exists, remove if exists)
   * Uses optimistic UI update for immediate feedback (Requirement 1.5)
   * Requirements: 1.1, 1.2
   */
  const toggleReaction = useCallback(async (type: ReactionType) => {
    if (!user) {
      setError("Authentication required");
      return;
    }

    // Store previous state for rollback
    const previousReactions = [...reactions];
    
    // Optimistic update (Requirement 1.5)
    setReactions(prev => {
      const existing = prev.find(r => r.type === type);
      
      if (existing?.hasReacted) {
        // User is removing their reaction
        if (existing.count === 1) {
          // Remove the reaction type entirely
          return prev.filter(r => r.type !== type);
        }
        // Decrement count
        return prev.map(r => 
          r.type === type 
            ? { ...r, count: r.count - 1, hasReacted: false }
            : r
        );
      } else if (existing) {
        // User is adding reaction to existing type
        return prev.map(r =>
          r.type === type
            ? { ...r, count: r.count + 1, hasReacted: true }
            : r
        );
      } else {
        // New reaction type
        return [...prev, { type, count: 1, hasReacted: true }];
      }
    });

    try {
      const res = await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType,
          contentId,
          reactionType: type,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to toggle reaction");
      }

      const data = await res.json();
      // Update with server response to ensure consistency
      setReactions(data.reactions || []);
      setError(null);
    } catch (err) {
      // Rollback on error
      setReactions(previousReactions);
      setError(err instanceof Error ? err.message : "Failed to toggle reaction");
      console.error("Error toggling reaction:", err);
    }
  }, [user, reactions, contentType, contentId]);

  /**
   * Get list of users who reacted with a specific type
   * Used for tooltip display
   * Requirements: 2.1, 2.2, 2.3
   */
  const getReactors = useCallback(async (type: ReactionType): Promise<{ reactors: ReactorInfo[]; totalCount: number }> => {
    try {
      const params = new URLSearchParams({
        contentType,
        contentId,
        reactionType: type,
      });

      const res = await fetch(`/api/reactions/users?${params}`);

      if (!res.ok) {
        throw new Error("Failed to fetch reactors");
      }

      const data = await res.json();
      return {
        reactors: data.reactors || [],
        totalCount: data.totalCount || 0,
      };
    } catch (err) {
      console.error("Error fetching reactors:", err);
      return { reactors: [], totalCount: 0 };
    }
  }, [contentType, contentId]);

  return {
    reactions,
    isLoading,
    error,
    toggleReaction,
    getReactors,
  };
}
