"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import Tooltip from "./Tooltip";

interface User {
  id: string;
  email?: string;
}

interface Profile {
  username: string;
  is_admin?: boolean;
}

export default function AuthButton() {
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

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="skeleton h-9 w-24" />
        <div className="skeleton h-9 w-28" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login" className="btn btn-ghost text-sm">
          Iniciar sesión
        </Link>
        <Link href="/signup" className="btn btn-primary text-sm">
          Registrarse
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {profile?.is_admin && (
        <Tooltip content="Panel de administración" position="bottom">
          <Link
            href="/admin"
            className="text-sm font-medium transition-colors"
            style={{ color: "var(--brand)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.textDecoration = "underline";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textDecoration = "none";
            }}
          >
            Admin
          </Link>
        </Tooltip>
      )}
      <Tooltip content={`Usuario: ${profile?.username || user.email}`} position="bottom">
        <span
          className="text-sm font-medium hidden sm:inline"
          style={{ color: "var(--foreground)" }}
        >
          {profile?.username || user.email}
        </span>
      </Tooltip>
      <form action="/auth/signout" method="post">
        <Tooltip content="Cerrar sesión" position="bottom">
          <button type="submit" className="btn btn-ghost text-sm">
            Salir
          </button>
        </Tooltip>
      </form>
    </div>
  );
}
