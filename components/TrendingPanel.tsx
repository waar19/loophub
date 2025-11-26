"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "@/components/TranslationsProvider";
import Tooltip from "./Tooltip";
import { createClient } from "@/lib/supabase-browser";

interface TrendingThread {
  id: string;
  title: string;
  forum_slug: string;
  forum_name: string;
  comment_count: number;
}

interface RecentComment {
  id: string;
  content: string;
  created_at: string;
  threads: {
    id: string;
    title: string;
    forum_id: string;
  };
  profiles: {
    username: string;
  } | null;
}

interface ThreadWithRelations {
  id: string;
  title: string;
  forum_id: string;
  forums: Array<{
    slug: string;
    name: string;
  }>;
  comments: Array<{ count: number }>;
}

export default function TrendingPanel() {
  const { t } = useTranslations();
  const [trending, setTrending] = useState<TrendingThread[]>([]);
  const [recentComments, setRecentComments] = useState<RecentComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();

      // Fetch trending threads (most commented in last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: threads } = await supabase
        .from("threads")
        .select(
          `
          id,
          title,
          forum_id,
          forums!inner(slug, name),
          comments(count)
        `
        )
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(10);

      if (threads) {
        const trendingData = threads
          .map((thread: ThreadWithRelations) => ({
            id: thread.id,
            title: thread.title,
            forum_slug: thread.forums[0]?.slug || "",
            forum_name: thread.forums[0]?.name || "",
            comment_count: thread.comments?.[0]?.count || 0,
          }))
          .filter((t) => t.comment_count > 0)
          .sort((a, b) => b.comment_count - a.comment_count)
          .slice(0, 5);

        setTrending(trendingData);
      }

      // Fetch recent comments
      const { data: comments } = await supabase
        .from("comments")
        .select(
          `
          id,
          content,
          created_at,
          threads!inner(id, title, forum_id),
          profiles(username)
        `
        )
        .order("created_at", { ascending: false })
        .limit(5);

      if (comments) {
        setRecentComments(comments as unknown as RecentComment[]);
      }

      setLoading(false);
    }

    fetchData();
  }, []);

  return (
    <aside
      className="hidden xl:block w-80 fixed right-0 top-0 bottom-0 overflow-y-auto border-l"
      style={{
        marginTop: "var(--header-height)",
        background: "var(--card-bg)",
        borderColor: "var(--border)",
      }}
    >
      <div className="p-6 space-y-8">
        {/* Create Thread Button */}
        <Link
          href="/forum/general/new"
          className="btn btn-primary w-full justify-center"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          {t("threads.createThread")}
        </Link>

        {/* Trending Threads */}
        <div>
          <h3
            className="text-sm font-semibold mb-3"
            style={{ color: "var(--foreground)" }}
          >
            {t("home.featuredThreads")}
          </h3>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-16" />
              ))}
            </div>
          ) : trending.length > 0 ? (
            <div className="space-y-2">
              {trending.map((thread) => (
                <Link
                  key={thread.id}
                  href={`/thread/${thread.id}`}
                  className="block p-2 rounded border transition-colors"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--card-bg)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-hover)";
                    e.currentTarget.style.background = "var(--card-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.background = "var(--card-bg)";
                  }}
                >
                  <p
                    className="text-sm font-medium mb-1 line-clamp-2"
                    style={{ color: "var(--foreground)" }}
                  >
                    {thread.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className="badge font-semibold"
                      style={{
                        background: "var(--brand)",
                        color: "white",
                      }}
                    >
                      {thread.forum_name}
                    </span>
                    <span style={{ color: "var(--muted)" }}>
                      {thread.comment_count}{" "}
                      {thread.comment_count === 1
                        ? t("threads.comment")
                        : t("threads.comments")}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              {t("home.noThreads")}
            </p>
          )}
        </div>

        {/* Recent Comments */}
        <div>
          <h3
            className="text-sm font-semibold mb-3"
            style={{ color: "var(--foreground)" }}
          >
            {t("notifications.title")}
          </h3>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-20" />
              ))}
            </div>
          ) : recentComments.length > 0 ? (
            <div className="space-y-3">
              {recentComments.map((comment) => (
                <Link
                  key={comment.id}
                  href={`/thread/${comment.threads.id}`}
                  className="block p-2 rounded border transition-colors"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--card-bg)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-hover)";
                    e.currentTarget.style.background = "var(--card-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.background = "var(--card-bg)";
                  }}
                >
                  <p
                    className="text-xs mb-2 line-clamp-2"
                    style={{ color: "var(--muted)" }}
                  >
                    {comment.content.substring(0, 100)}...
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    <span style={{ color: "var(--foreground)" }}>
                      {comment.profiles?.username || t("common.anonymous")}
                    </span>
                    <span style={{ color: "var(--muted)" }}>•</span>
                    <span style={{ color: "var(--muted)" }}>
                      {new Date(comment.created_at).toLocaleDateString(
                        "es-ES",
                        {
                          month: "short",
                          day: "numeric",
                        }
                      )}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              {t("threads.noComments")}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
