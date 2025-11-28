'use client';

import { useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';

interface SearchResult {
  id: string;
  type: 'thread' | 'comment' | 'user';
  title?: string;
  content?: string;
  username?: string;
  created_at: string;
  score?: number;
}

interface SearchFilters {
  type?: 'all' | 'threads' | 'comments' | 'users';
  forum?: string;
  author?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: 'relevance' | 'date' | 'votes';
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  hasMore: boolean;
}

// Fetch search results
async function fetchSearchResults(
  query: string, 
  filters: SearchFilters = {},
  page = 1
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    q: query,
    page: String(page),
    ...(filters.type && { type: filters.type }),
    ...(filters.forum && { forum: filters.forum }),
    ...(filters.author && { author: filters.author }),
    ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
    ...(filters.dateTo && { dateTo: filters.dateTo }),
    ...(filters.sort && { sort: filters.sort }),
  });
  
  const response = await fetch(`/api/search?${params}`);
  
  if (!response.ok) {
    throw new Error('Search failed');
  }
  
  return response.json();
}

// Hook: Search with pagination
export function useSearch(query: string, filters: SearchFilters = {}) {
  return useQuery({
    queryKey: queryKeys.search.results(query, filters as Record<string, unknown>),
    queryFn: () => fetchSearchResults(query, filters),
    enabled: query.length >= 2,
    staleTime: 60 * 1000, // Cache search results for 1 minute
  });
}

// Hook: Infinite scroll search
export function useInfiniteSearch(query: string, filters: SearchFilters = {}) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.search.results(query, filters as Record<string, unknown>), 'infinite'],
    queryFn: ({ pageParam = 1 }) => fetchSearchResults(query, filters, pageParam),
    getNextPageParam: (lastPage) => {
      if (lastPage.hasMore) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: query.length >= 2,
    staleTime: 60 * 1000,
  });
}

// Hook: Prefetch search (for autocomplete)
export function usePrefetchSearch() {
  const queryClient = useQueryClient();
  
  return (query: string, filters: SearchFilters = {}) => {
    if (query.length >= 2) {
      queryClient.prefetchQuery({
        queryKey: queryKeys.search.results(query, filters as Record<string, unknown>),
        queryFn: () => fetchSearchResults(query, filters),
        staleTime: 60 * 1000,
      });
    }
  };
}
