'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useAuth } from './useAuth';

interface Notification {
  id: string;
  user_id: string;
  type: 'comment' | 'reply' | 'mention' | 'thread_update' | 'upvote' | 'downvote' | 'vote_milestone';
  title: string;
  message: string;
  link: string | null;
  related_thread_id: string | null;
  related_comment_id: string | null;
  related_user_id: string | null;
  read: boolean;
  created_at: string;
}

interface NotificationWithUser extends Notification {
  related_user_username?: string;
  related_user_avatar?: string | null;
}

export function useRealtimeNotifications() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<NotificationWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      setRecentNotifications([]);
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      
      // Get unread count
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      setUnreadCount(count || 0);

      // Get recent notifications (last 10)
      const { data: notifications, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (notifError) {
        console.error('Error fetching notifications:', notifError);
      }

      if (notifications) {
        // Fetch related user profiles
        const userIds = notifications
          .filter(n => n.related_user_id)
          .map(n => n.related_user_id);

        let profilesMap = new Map();
        
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', userIds);

          if (profiles) {
            profiles.forEach(p => {
              profilesMap.set(p.id, p);
            });
          }
        }

        const mapped = notifications.map((n: Notification) => {
          const profile = n.related_user_id ? profilesMap.get(n.related_user_id) : null;
          return {
            ...n,
            related_user_username: profile?.username,
            related_user_avatar: profile?.avatar_url,
          };
        });
        setRecentNotifications(mapped);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return;

    try {
      const supabase = createClient();
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      // Update local state
      setRecentNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [user]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      const supabase = createClient();
      await supabase.rpc('mark_all_notifications_read', { p_user_id: user.id });

      // Update local state
      setRecentNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Subscribe to Realtime changes
  useEffect(() => {
    if (!user) return;

    const supabase = createClient();

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const newNotification = payload.new as Notification;

          // Fetch related user info if exists
          let notificationWithUser: NotificationWithUser = newNotification;
          
          if (newNotification.related_user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', newNotification.related_user_id)
              .single();

            if (profile) {
              notificationWithUser = {
                ...newNotification,
                related_user_username: profile.username,
                related_user_avatar: profile.avatar_url,
              };
            }
          }

          // Add to recent notifications (prepend)
          setRecentNotifications(prev => [notificationWithUser, ...prev].slice(0, 10));
          
          // Increment unread count
          setUnreadCount(prev => prev + 1);

          // Optional: Play sound or show browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(newNotification.title, {
              body: newNotification.message,
              icon: '/logo.png',
              tag: newNotification.id,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as Notification;
          
          // Update in local state
          setRecentNotifications(prev =>
            prev.map(n => n.id === updated.id ? { ...n, ...updated } : n)
          );

          // Update unread count if read status changed
          if (updated.read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    unreadCount,
    recentNotifications,
    isLoading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  };
}
