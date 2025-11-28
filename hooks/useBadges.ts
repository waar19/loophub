'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';

interface Badge {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  category: string;
}

interface UserBadge {
  id: string;
  earned_at: string;
  badge: Badge;
}

export function useBadges(userId?: string) {
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBadges, setNewBadges] = useState<{ badge_name: string; badge_slug: string }[]>([]);
  const supabase = createClient();

  const fetchUserBadges = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('user_badges')
      .select(`
        id,
        earned_at,
        badge:badges(
          id,
          name,
          slug,
          description,
          icon,
          color,
          category
        )
      `)
      .eq('user_id', uid)
      .order('earned_at', { ascending: false });

    if (data) {
      setBadges(data as unknown as UserBadge[]);
    }
  }, [supabase]);

  const fetchAllBadges = useCallback(async () => {
    const { data } = await supabase
      .from('badges')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true });

    if (data) {
      setAllBadges(data);
    }
  }, [supabase]);

  const checkAndAwardBadges = useCallback(async () => {
    try {
      const response = await fetch('/api/badges', { method: 'POST' });
      const data = await response.json();
      
      if (data.newBadges && data.newBadges.length > 0) {
        setNewBadges(data.newBadges);
        // Refetch user badges to update the list
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await fetchUserBadges(user.id);
        }
      }
      
      return data.newBadges || [];
    } catch (error) {
      console.error('Error checking badges:', error);
      return [];
    }
  }, [supabase, fetchUserBadges]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      
      if (userId) {
        await fetchUserBadges(userId);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await fetchUserBadges(user.id);
        }
      }
      
      await fetchAllBadges();
      setLoading(false);
    };

    init();
  }, [userId, supabase, fetchUserBadges, fetchAllBadges]);

  const clearNewBadges = () => setNewBadges([]);

  return {
    badges,
    allBadges,
    loading,
    newBadges,
    checkAndAwardBadges,
    clearNewBadges,
    refetch: () => userId ? fetchUserBadges(userId) : null,
  };
}
