'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase-browser';
import { queryKeys } from '@/lib/query-client';

interface Thread {
  id: string;
  title: string;
  content: string;
  forum_id: string;
  user_id: string;
  upvote_count: number;
  downvote_count: number;
  view_count: number;
  is_hidden: boolean;
  is_resource: boolean;
  created_at: string;
  profile?: { username: string; avatar_url: string | null };
  forum?: { name: string; slug: string };
}

interface Comment {
  id: string;
  thread_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  upvote_count: number;
  downvote_count: number;
  depth: number;
  created_at: string;
  profile?: { username: string; avatar_url: string | null };
}

interface ThreadFilters {
  forumSlug?: string;
  sort?: 'new' | 'hot' | 'top';
  page?: number;
  limit?: number;
}

// Fetch threads with filters
async function fetchThreads(filters: ThreadFilters = {}) {
  const supabase = createClient();
  const { forumSlug, sort = 'new', page = 1, limit = 20 } = filters;
  
  let query = supabase
    .from('threads')
    .select(`
      *,
      profile:profiles(username, avatar_url),
      forum:forums(name, slug)
    `)
    .eq('is_hidden', false);
  
  if (forumSlug) {
    const { data: forum } = await supabase
      .from('forums')
      .select('id')
      .eq('slug', forumSlug)
      .single();
    
    if (forum) {
      query = query.eq('forum_id', forum.id);
    }
  }
  
  // Sorting
  if (sort === 'new') {
    query = query.order('created_at', { ascending: false });
  } else if (sort === 'hot') {
    query = query.order('upvote_count', { ascending: false });
  } else if (sort === 'top') {
    query = query.order('upvote_count', { ascending: false });
  }
  
  // Pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data as Thread[];
}

// Fetch single thread
async function fetchThread(id: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('threads')
    .select(`
      *,
      profile:profiles(username, avatar_url, reputation),
      forum:forums(name, slug)
    `)
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data as Thread;
}

// Fetch comments for a thread
async function fetchComments(threadId: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('comments')
    .select(`
      *,
      profile:profiles(username, avatar_url, reputation)
    `)
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  return data as Comment[];
}

// Hook: Get threads list
export function useThreads(filters: ThreadFilters = {}) {
  return useQuery({
    queryKey: queryKeys.threads.list(filters as Record<string, unknown>),
    queryFn: () => fetchThreads(filters),
    staleTime: 30 * 1000, // 30 seconds for lists
  });
}

// Hook: Get single thread
export function useThread(id: string) {
  return useQuery({
    queryKey: queryKeys.threads.detail(id),
    queryFn: () => fetchThread(id),
    enabled: !!id,
  });
}

// Hook: Get thread comments
export function useComments(threadId: string) {
  return useQuery({
    queryKey: queryKeys.threads.comments(threadId),
    queryFn: () => fetchComments(threadId),
    enabled: !!threadId,
    staleTime: 15 * 1000, // 15 seconds for comments (more dynamic)
  });
}

// Hook: Create thread
export function useCreateThread() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { title: string; content: string; forum_id: string }) => {
      const response = await fetch('/api/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create thread');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate threads list to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.threads.lists() });
    },
  });
}

// Hook: Create comment
export function useCreateComment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { thread_id: string; content: string; parent_id?: string }) => {
      const response = await fetch(`/api/threads/${data.thread_id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create comment');
      }
      
      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate comments for this thread
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.threads.comments(variables.thread_id) 
      });
    },
  });
}

// Hook: Vote on thread/comment
export function useVote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { 
      targetId: string; 
      targetType: 'thread' | 'comment'; 
      voteType: 'up' | 'down';
      threadId?: string; // For invalidation
    }) => {
      const response = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_id: data.targetId,
          target_type: data.targetType,
          vote_type: data.voteType,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to vote');
      }
      
      return response.json();
    },
    onSuccess: (_, variables) => {
      if (variables.targetType === 'thread') {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.threads.detail(variables.targetId) 
        });
      } else if (variables.threadId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.threads.comments(variables.threadId) 
        });
      }
    },
  });
}
