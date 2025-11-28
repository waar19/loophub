import { QueryClient } from '@tanstack/react-query';

// Shared query client for server-side usage
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time - data considered fresh for 1 minute
      staleTime: 60 * 1000,
      // Garbage collection time - 5 minutes after becoming unused
      gcTime: 5 * 60 * 1000,
      // Retry failed requests up to 2 times with exponential backoff
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus for critical data
      refetchOnWindowFocus: 'always',
      // Don't refetch on mount if data is fresh
      refetchOnMount: true,
      // Refetch on reconnect
      refetchOnReconnect: true,
      // Keep previous data while fetching new data
      placeholderData: (prev: unknown) => prev,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// Query keys factory for type-safe and organized query keys
export const queryKeys = {
  // Threads
  threads: {
    all: ['threads'] as const,
    lists: () => [...queryKeys.threads.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.threads.lists(), filters] as const,
    details: () => [...queryKeys.threads.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.threads.details(), id] as const,
    comments: (threadId: string) => [...queryKeys.threads.detail(threadId), 'comments'] as const,
  },
  
  // Forums
  forums: {
    all: ['forums'] as const,
    lists: () => [...queryKeys.forums.all, 'list'] as const,
    detail: (slug: string) => [...queryKeys.forums.all, 'detail', slug] as const,
    threads: (slug: string, filters?: Record<string, unknown>) => 
      [...queryKeys.forums.detail(slug), 'threads', filters] as const,
  },
  
  // Users/Profiles
  profiles: {
    all: ['profiles'] as const,
    detail: (username: string) => [...queryKeys.profiles.all, username] as const,
    threads: (username: string) => [...queryKeys.profiles.detail(username), 'threads'] as const,
    comments: (username: string) => [...queryKeys.profiles.detail(username), 'comments'] as const,
    badges: (userId: string) => [...queryKeys.profiles.all, 'badges', userId] as const,
  },
  
  // Notifications
  notifications: {
    all: ['notifications'] as const,
    list: (filters?: { unreadOnly?: boolean }) => [...queryKeys.notifications.all, 'list', filters] as const,
    unreadCount: () => [...queryKeys.notifications.all, 'unread-count'] as const,
  },
  
  // Bookmarks
  bookmarks: {
    all: ['bookmarks'] as const,
    list: () => [...queryKeys.bookmarks.all, 'list'] as const,
    check: (threadId: string) => [...queryKeys.bookmarks.all, 'check', threadId] as const,
  },
  
  // Tags
  tags: {
    all: ['tags'] as const,
    popular: () => [...queryKeys.tags.all, 'popular'] as const,
    forThread: (threadId: string) => [...queryKeys.tags.all, 'thread', threadId] as const,
  },
  
  // Search
  search: {
    all: ['search'] as const,
    results: (query: string, filters?: Record<string, unknown>) => 
      [...queryKeys.search.all, query, filters] as const,
  },
  
  // Analytics (admin)
  analytics: {
    all: ['analytics'] as const,
    dashboard: (dateRange: string) => [...queryKeys.analytics.all, 'dashboard', dateRange] as const,
    metrics: (date: string) => [...queryKeys.analytics.all, 'metrics', date] as const,
  },
  
  // Votes
  votes: {
    all: ['votes'] as const,
    thread: (threadId: string) => [...queryKeys.votes.all, 'thread', threadId] as const,
    comment: (commentId: string) => [...queryKeys.votes.all, 'comment', commentId] as const,
  },
  
  // Polls
  polls: {
    all: ['polls'] as const,
    forThread: (threadId: string) => [...queryKeys.polls.all, 'thread', threadId] as const,
  },
  
  // Moderators
  moderators: {
    all: ['moderators'] as const,
    forForum: (forumId: string) => [...queryKeys.moderators.all, 'forum', forumId] as const,
    status: (forumId: string, userId: string) => [...queryKeys.moderators.all, 'status', forumId, userId] as const,
  },
};

// Cache time presets for different data types
export const cachePresets = {
  // Static data that rarely changes
  static: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  },
  // Dynamic data that changes frequently
  dynamic: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  },
  // Real-time data (notifications, votes)
  realtime: {
    staleTime: 0, // Always stale
    gcTime: 60 * 1000, // 1 minute
  },
  // User-specific data
  user: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  },
};

// Helper to invalidate related queries after mutations
export const invalidationHelpers = {
  // After creating/updating a thread
  thread: (queryClient: QueryClient, threadId?: string, forumSlug?: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.threads.all });
    if (threadId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.threads.detail(threadId) });
    }
    if (forumSlug) {
      queryClient.invalidateQueries({ queryKey: queryKeys.forums.threads(forumSlug) });
    }
  },
  
  // After creating/updating a comment
  comment: (queryClient: QueryClient, threadId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.threads.comments(threadId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.threads.detail(threadId) });
  },
  
  // After voting
  vote: (queryClient: QueryClient, threadId?: string, commentId?: string) => {
    if (threadId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.votes.thread(threadId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.threads.detail(threadId) });
    }
    if (commentId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.votes.comment(commentId) });
    }
  },
  
  // After notification actions
  notifications: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
  },
};

// Optimistic update helpers
export const optimisticHelpers = {
  // Optimistic vote update
  vote: (
    queryClient: QueryClient,
    params: {
      threadId?: string;
      commentId?: string;
      voteType: 1 | -1;
      previousVote: 1 | -1 | null;
    }
  ) => {
    const { threadId, voteType, previousVote } = params;
    
    if (threadId) {
      queryClient.setQueryData(queryKeys.threads.detail(threadId), (old: Record<string, unknown> | undefined) => {
        if (!old) return old;
        
        let upvoteDelta = 0;
        let downvoteDelta = 0;
        
        if (previousVote === voteType) {
          // Removing vote
          if (voteType === 1) upvoteDelta = -1;
          else downvoteDelta = -1;
        } else if (previousVote === null) {
          // New vote
          if (voteType === 1) upvoteDelta = 1;
          else downvoteDelta = 1;
        } else {
          // Changing vote
          if (voteType === 1) {
            upvoteDelta = 1;
            downvoteDelta = -1;
          } else {
            upvoteDelta = -1;
            downvoteDelta = 1;
          }
        }
        
        return {
          ...old,
          upvote_count: ((old.upvote_count as number) || 0) + upvoteDelta,
          downvote_count: ((old.downvote_count as number) || 0) + downvoteDelta,
        };
      });
    }
  },
};
