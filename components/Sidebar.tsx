"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "@/components/TranslationsProvider";
import { useAuth } from "@/hooks/useAuth";
import Tooltip from "./Tooltip";

interface Forum {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

interface SidebarProps {
  forums: Forum[];
}

export default function Sidebar({ forums }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useTranslations();
  const { user } = useAuth();
  const [threadCounts, setThreadCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    console.log("Sidebar received forums:", forums?.length || 0);
    async function fetchCounts() {
      try {
        const response = await fetch("/api/forums/stats");
        if (response.ok) {
          const data = await response.json();
          setThreadCounts(data.counts || {});
        }
      } catch (error) {
        console.error("Error fetching thread counts:", error);
      }
    }
    fetchCounts();
  }, [forums]);

  const isActive = (slug: string) => {
    return pathname === `/forum/${slug}`;
  };

  return (
    <aside
      className="hidden lg:block fixed left-0 top-0 bottom-0 overflow-y-auto border-r bg-[var(--card-bg)] border-[var(--border)]"
      style={{
        width: "var(--sidebar-width)",
        marginTop: "var(--header-height)",
      }}
      aria-label="Navegación principal de foros"
    >
      <nav className="p-4 space-y-1">
        <div className="mb-4">
          <Link
            href="/"
            className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${
              pathname === "/"
                ? "bg-[var(--card-hover)] text-[var(--foreground)]"
                : "text-[var(--muted)] hover:bg-[var(--card-hover)] hover:text-[var(--foreground)]"
            }`}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            {t("nav.home")}
          </Link>

          {/* Bookmarks - only for logged in users */}
          {user && (
            <Link
              href="/bookmarks"
              className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${
                pathname === "/bookmarks"
                  ? "bg-[var(--card-hover)] text-[var(--foreground)]"
                  : "text-[var(--muted)] hover:bg-[var(--card-hover)] hover:text-[var(--foreground)]"
              }`}
            >
              <svg
                className="w-5 h-5"
                fill={pathname === "/bookmarks" ? "currentColor" : "none"}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
              {t("nav.bookmarks")}
            </Link>
          )}

          {/* Communities */}
          <Link
            href="/communities"
            className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${
              pathname.startsWith("/communities") || pathname.startsWith("/c/")
                ? "bg-[var(--card-hover)] text-[var(--foreground)]"
                : "text-[var(--muted)] hover:bg-[var(--card-hover)] hover:text-[var(--foreground)]"
            }`}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            {t("communities.title")}
          </Link>
        </div>

        <div className="mb-4">
          <h3 className="px-3 text-xs font-bold uppercase tracking-wider mb-2 text-[var(--muted)]">
            {t("nav.forums")}
          </h3>
          <div className="space-y-0.5">
            {forums.length === 0 ? (
              <p className="px-3 text-sm text-[var(--muted)]">
                {t("common.noForumsAvailable")}
              </p>
            ) : (
              forums.map((forum) => {
                const active = isActive(forum.slug);
                const count = threadCounts[forum.id] || 0;
                return (
                  <Link
                    key={forum.id}
                    href={`/forum/${forum.slug}`}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded text-sm transition-colors ${
                      active
                        ? "bg-[var(--card-hover)] text-[var(--foreground)] font-medium"
                        : "text-[var(--muted)] hover:bg-[var(--card-hover)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    <span className="truncate">{forum.name}</span>
                    {count > 0 && (
                      <Tooltip
                        content={`${count} ${
                          count === 1
                            ? t("threads.thread")
                            : t("threads.threads")
                        } ${t("common.inThisForum")}`}
                        position="right"
                      >
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                            active
                              ? "bg-[var(--foreground)] text-[var(--card-bg)]"
                              : "bg-[var(--border-light)] text-[var(--muted)]"
                          }`}
                        >
                          {count}
                        </span>
                      </Tooltip>
                    )}
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </nav>
    </aside>
  );
}
