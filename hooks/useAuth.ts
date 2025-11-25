"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

interface User {
  id: string;
  email?: string;
}

interface Profile {
  username: string;
  is_admin?: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      const supabase = createClient();
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (currentUser) {
        setUser(currentUser);
        const { data: profileData } = await supabase
          .from("profiles")
          .select("username, is_admin")
          .eq("id", currentUser.id)
          .single();
        setProfile(profileData || null);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    }

    fetchUser();

    // Listen for auth changes
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      fetchUser();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, profile, loading };
}

