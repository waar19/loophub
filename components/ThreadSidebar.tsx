"use client";

import Link from "next/link";
import { Thread, Forum } from "@/lib/supabase";
import { useTranslations } from "./TranslationsProvider";

interface ThreadSidebarProps {
  thread: Thread & { forum: Forum };
}

export default function ThreadSidebar({ thread }: ThreadSidebarProps) {
  const { t, locale } = useTranslations();
  
  const date = new Date(thread.created_at).toLocaleDateString(locale === "es" ? "es-ES" : locale === "pt" ? "pt-BR" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <aside className="hidden xl:block w-56 shrink-0">
      <div className="sticky top-20 space-y-1.5">
        {/* Thread Info Card */}
        <div className="card p-2">
          <h3
            className="text-xs font-semibold mb-1.5 uppercase tracking-wider"
            style={{ color: "var(--muted)" }}
          >
            {t("threads.threadInfo")}
          </h3>
          <div className="space-y-1.5">
            {/* Author */}
            {thread.profile?.username && (
              <div>
                <p
                  className="text-xs font-medium mb-0.5"
                  style={{ color: "var(--muted)" }}
                >
                  {t("profile.author")}
                </p>
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center text-xs font-medium"
                    style={{
                      background: "var(--brand)",
                      color: "white",
                    }}
                  >
                    {thread.profile.username.charAt(0).toUpperCase()}
                  </div>
                  <span
                    className="text-xs font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    {thread.profile.username}
                  </span>
                </div>
              </div>
            )}

            {/* Forum */}
            <div>
              <p
                className="text-xs font-medium mb-0.5"
                style={{ color: "var(--muted)" }}
              >
                {t("common.forum")}
              </p>
              <Link
                href={`/forum/${thread.forum.slug}`}
                className="inline-block"
              >
                <span
                  className="badge text-xs font-semibold px-1.5 py-0.5"
                  style={{
                    background: "var(--brand)",
                    color: "white",
                  }}
                >
                  {thread.forum.name}
                </span>
              </Link>
            </div>

            {/* Date */}
            <div>
              <p
                className="text-xs font-medium mb-0.5"
                style={{ color: "var(--muted)" }}
              >
                {t("threads.published")}
              </p>
              <p className="text-xs" style={{ color: "var(--foreground)" }}>
                {date}
              </p>
            </div>

            {/* Comment count */}
            {thread._count && (
              <div>
                <p
                  className="text-xs font-medium mb-0.5"
                  style={{ color: "var(--muted)" }}
                >
                  {t("threads.comments")}
                </p>
                <p className="text-xs font-semibold" style={{ color: "var(--brand)" }}>
                  {thread._count.comments || 0}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Related Links */}
        <div className="card p-2">
          <h3
            className="text-xs font-semibold mb-1.5 uppercase tracking-wider"
            style={{ color: "var(--muted)" }}
          >
            {t("threads.relatedLinks")}
          </h3>
          <div className="space-y-0.5">
            <Link
              href={`/forum/${thread.forum.slug}`}
              className="block text-xs transition-colors"
              style={{ color: "var(--muted)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--brand)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--muted)";
              }}
            >
              {t("threads.viewAllThreads")} {thread.forum.name}
            </Link>
            <Link
              href={`/forum/${thread.forum.slug}/new`}
              className="block text-xs transition-colors"
              style={{ color: "var(--muted)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--brand)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--muted)";
              }}
            >
              {t("threads.createNewThread")}
            </Link>
          </div>
        </div>

        {/* Forum Rules */}
        <div className="card p-2">
          <h3
            className="text-xs font-semibold mb-1.5 uppercase tracking-wider"
            style={{ color: "var(--muted)" }}
          >
            {t("threads.forumRules")}
          </h3>
          <ul className="space-y-0.5 text-xs" style={{ color: "var(--muted)" }}>
            <li>• {t("threads.rule1")}</li>
            <li>• {t("threads.rule2")}</li>
            <li>• {t("threads.rule3")}</li>
          </ul>
        </div>
      </div>
    </aside>
  );
}

