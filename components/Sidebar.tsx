"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "@/components/TranslationsProvider";
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
      className="hidden lg:block fixed left-0 top-0 bottom-0 overflow-y-auto border-r"
      style={{
        width: "var(--sidebar-width)",
        marginTop: "var(--header-height)",
        background: "var(--card-bg)",
        borderColor: "var(--border)",
      }}
      aria-label="Navegación principal de foros"
    >
      <nav className="p-6 space-y-1">
        <div className="mb-6">
          <Link
            href="/"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname === "/" ? "" : ""
            }`}
            style={
              pathname === "/"
                ? {
                    background: "var(--brand)",
                    color: "white",
                    boxShadow: "0 2px 8px rgba(88, 101, 242, 0.3)",
                  }
                : {
                    color: "var(--muted)",
                  }
            }
            onMouseEnter={(e) => {
              if (pathname !== "/") {
                e.currentTarget.style.background = "var(--card-hover)";
                e.currentTarget.style.color = "var(--foreground)";
              }
            }}
            onMouseLeave={(e) => {
              if (pathname !== "/") {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--muted)";
              }
            }}
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
        </div>

        <div className="mb-4">
          <h3
            className="px-3 text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: "var(--muted)" }}
          >
            {t("nav.forums")}
          </h3>
          <div className="space-y-1">
            {forums.length === 0 ? (
              <p className="px-3 text-sm" style={{ color: "var(--muted)" }}>
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
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      active ? "" : ""
                    }`}
                    style={
                      active
                        ? {
                            background: "var(--brand)",
                            color: "white",
                            boxShadow: "0 2px 8px rgba(88, 101, 242, 0.3)",
                          }
                        : {
                            color: "var(--muted)",
                          }
                    }
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = "var(--card-hover)";
                        e.currentTarget.style.color = "var(--foreground)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "var(--muted)";
                      }
                    }}
                  >
                    <span className="font-medium">{forum.name}</span>
                    {count > 0 && (
                      <Tooltip
                        content={`${count} ${count === 1 ? t("threads.thread") : t("threads.threads")} ${t("common.inThisForum")}`}
                        position="right"
                      >
                        <span
                          className="text-xs px-2 py-0.5 rounded font-bold"
                          style={{
                            background: active
                              ? "white"
                              : "var(--brand)",
                            color: active ? "var(--brand)" : "white",
                            boxShadow: active 
                              ? "0 1px 3px rgba(88, 101, 242, 0.2)"
                              : "0 1px 3px rgba(88, 101, 242, 0.3)",
                          }}
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

