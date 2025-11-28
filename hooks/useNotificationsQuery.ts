'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase-browser';
import { queryKeys } from '@/lib/query-client';

interface Notification {
  id: string;
  type: string;
  message: string;
  link: string;
  is_read: boolean;
  created_at: string;
  actor?: { username: string; avatar_url: string | null };
}

// Fetch notifications
async function fetchNotifications(unreadOnly = false) {
  const supabase = createClient();
  
  let query = supabase
    .from('notifications')
    .select(`
      *,
      actor:profiles!notifications_actor_id_fkey(username, avatar_url)
    `)
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (unreadOnly) {
    query = query.eq('is_read', false);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data as Notification[];
}

// Fetch unread count
async function fetchUnreadCount() {
  const supabase = createClient();
  
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false);
  
  if (error) throw error;
  return count || 0;
}

// Hook: Get notifications
export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: queryKeys.notifications.list({ unreadOnly }),
    queryFn: () => fetchNotifications(unreadOnly),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

// Hook: Get unread count
export function useUnreadCount() {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: fetchUnreadCount,
    staleTime: 15 * 1000, // 15 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });
}

// Hook: Mark notification as read
export function useMarkAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: true }),
      });
      
      if (!response.ok) throw new Error('Failed to mark as read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

// Hook: Mark all as read
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Failed to mark all as read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}
