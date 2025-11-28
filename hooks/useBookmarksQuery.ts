'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase-browser';
import { queryKeys } from '@/lib/query-client';

interface Bookmark {
  id: string;
  thread_id: string;
  created_at: string;
  thread?: {
    id: string;
    title: string;
    created_at: string;
    profile?: { username: string };
    forum?: { name: string; slug: string };
  };
}

// Fetch user's bookmarks
async function fetchBookmarks() {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('bookmarks')
    .select(`
      *,
      thread:threads(
        id,
        title,
        created_at,
        profile:profiles(username),
        forum:forums(name, slug)
      )
    `)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data as Bookmark[];
}

// Check if thread is bookmarked
async function checkBookmark(threadId: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('thread_id', threadId)
    .maybeSingle();
  
  if (error) throw error;
  return !!data;
}

// Hook: Get all bookmarks
export function useBookmarks() {
  return useQuery({
    queryKey: queryKeys.bookmarks.list(),
    queryFn: fetchBookmarks,
    staleTime: 60 * 1000, // 1 minute
  });
}

// Hook: Check if thread is bookmarked
export function useIsBookmarked(threadId: string) {
  return useQuery({
    queryKey: queryKeys.bookmarks.check(threadId),
    queryFn: () => checkBookmark(threadId),
    enabled: !!threadId,
    staleTime: 30 * 1000,
  });
}

// Hook: Toggle bookmark
export function useToggleBookmark() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ threadId, isBookmarked }: { threadId: string; isBookmarked: boolean }) => {
      const response = await fetch('/api/bookmarks', {
        method: isBookmarked ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: threadId }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to toggle bookmark');
      }
      
      return response.json();
    },
    onMutate: async ({ threadId, isBookmarked }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.bookmarks.check(threadId) });
      
      // Snapshot previous value
      const previousValue = queryClient.getQueryData(queryKeys.bookmarks.check(threadId));
      
      // Optimistically update
      queryClient.setQueryData(queryKeys.bookmarks.check(threadId), !isBookmarked);
      
      return { previousValue };
    },
    onError: (_, variables, context) => {
      // Rollback on error
      if (context?.previousValue !== undefined) {
        queryClient.setQueryData(
          queryKeys.bookmarks.check(variables.threadId), 
          context.previousValue
        );
      }
    },
    onSettled: (_, __, variables) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.bookmarks.check(variables.threadId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookmarks.list() });
    },
  });
}
