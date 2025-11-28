import { QueryClient } from '@tanstack/react-query';

// Shared query client for server-side usage
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 2,
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
};
