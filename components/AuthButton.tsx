"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { useTranslations } from "@/components/TranslationsProvider";
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
  const { t } = useTranslations();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isMenuOpen]);

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
          {t("nav.login")}
        </Link>
        <Link href="/signup" className="btn btn-primary text-sm">
          {t("nav.signup")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {profile?.is_admin && (
        <Tooltip content={t("nav.admin")} position="bottom">
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
            {t("nav.admin")}
          </Link>
        </Tooltip>
      )}
      
      {/* User Menu Dropdown */}
      <div className="relative" ref={menuRef}>
        <Tooltip content={t("profile.myProfile")} position="bottom">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
            style={{
              background: isMenuOpen ? "var(--brand-light)" : "transparent",
              color: "var(--foreground)",
            }}
            onMouseEnter={(e) => {
              if (!isMenuOpen) {
                e.currentTarget.style.background = "var(--card-hover)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isMenuOpen) {
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
              style={{
                background: "var(--brand)",
                color: "white",
              }}
            >
              {profile?.username?.charAt(0).toUpperCase() || "U"}
            </div>
            <span className="text-sm font-medium hidden sm:inline">
              {profile?.username || user?.email}
            </span>
            <svg
              className="w-4 h-4 transition-transform"
              style={{
                transform: isMenuOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </Tooltip>

        {/* Dropdown Menu */}
        {isMenuOpen && (
          <div
            className="absolute right-0 mt-2 w-56 rounded-lg shadow-lg border overflow-hidden z-50"
            style={{
              background: "var(--card-bg)",
              borderColor: "var(--border)",
            }}
          >
            {/* User info header */}
            <div
              className="px-4 py-3 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <p
                className="text-sm font-medium"
                style={{ color: "var(--foreground)" }}
              >
                {profile?.username || "Usuario"}
              </p>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                {user?.email}
              </p>
            </div>

            {/* Menu items */}
            <div className="py-1">
              <Link
                href={`/u/${profile?.username}`}
                className="block px-4 py-2 text-sm transition-colors"
                style={{ color: "var(--foreground)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--card-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
                onClick={() => setIsMenuOpen(false)}
              >
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  {t("profile.myProfile")}
                </div>
              </Link>

              <Link
                href="/settings"
                className="block px-4 py-2 text-sm transition-colors"
                style={{ color: "var(--foreground)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--card-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
                onClick={() => setIsMenuOpen(false)}
              >
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  {t("settings.title")}
                </div>
              </Link>
            </div>

            {/* Logout */}
            <div
              className="border-t py-1"
              style={{ borderColor: "var(--border)" }}
            >
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="w-full text-left px-4 py-2 text-sm transition-colors"
                  style={{ color: "var(--foreground)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--card-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    {t("nav.logout")}
                  </div>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
