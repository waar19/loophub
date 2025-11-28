"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import ThreadCard from "@/components/ThreadCard";
import InfiniteScroll from "@/components/InfiniteScroll";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import Breadcrumbs from "@/components/Breadcrumbs";
import TrendingPanel from "@/components/TrendingPanel";
import ThreadSortFilter from "@/components/ThreadSortFilter";
import { Thread } from "@/lib/supabase";
import { useTranslations } from "@/components/TranslationsProvider";
import MetaHead from "@/components/MetaHead";
import { ForumStructuredData } from "@/components/StructuredData";

interface Forum {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

interface ForumData {
  forum: Forum;
  threads: Thread[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// Forum icons mapping
const forumIcons: Record<string, string> = {
  "minimalismo-digital": "🧹",
  "organizacion-personal": "📋",
  "productividad-inteligente": "⚡",
  "apps-herramientas": "🛠️",
  "workflows-setup": "⚙️",
};

// Forum colors
const forumColors: Record<string, string> = {
  "minimalismo-digital": "#10B981", // Green
  "organizacion-personal": "#3B82F6", // Blue
  "productividad-inteligente": "#F59E0B", // Amber
  "apps-herramientas": "#8B5CF6", // Purple
  "workflows-setup": "#EC4899", // Pink
};

export default function ForumPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { t } = useTranslations();
  const [data, setData] = useState<ForumData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "most_comments" | "least_comments"
  >("newest");

  const fetchData = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (!append) setIsLoading(true);
      else setIsLoadingMore(true);

      const res = await fetch(
        `/api/forums/${slug}/threads?page=${pageNum}&limit=20&sort=${sortBy}`
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage =
          errorData.error ||
          errorData.details ||
          `Failed to fetch forum data: ${res.status}`;
        console.error("API Error:", errorMessage, errorData);
        throw new Error(errorMessage);
      }

      const forumData: ForumData = await res.json();

      if (append && data) {
        setData({
          ...forumData,
          threads: [...data.threads, ...forumData.threads],
        });
      } else {
        setData(forumData);
      }
    } catch (error) {
      console.error("Error fetching forum data:", error);
      if (!append && !data) {
        setData(null);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (slug) {
      fetchData(1, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, sortBy]);

  const handleLoadMore = () => {
    if (!isLoadingMore && data?.pagination.hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchData(nextPage, true);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="lg:ml-[var(--sidebar-width)] xl:mr-80">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <LoadingSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="lg:ml-[var(--sidebar-width)] xl:mr-80">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="card text-center py-6">
            <p style={{ color: "var(--muted)" }}>{t("forums.errorLoading")}</p>
          </div>
        </div>
      </div>
    );
  }

  const { forum, threads, pagination } = data;
  const forumColor = forumColors[slug] || "var(--brand)";
  const forumIcon = forumIcons[slug] || "💬";
  const threadCount = data.pagination?.total || data.threads.length;

  return (
    <>
      <MetaHead
        title={`${forum.name} - Loophub`}
        description={
          forum.description ||
          `Explore discussions in ${forum.name} forum on Loophub`
        }
        ogParams={{
          type: "forum",
          threadCount: threadCount,
        }}
      />
      <ForumStructuredData forum={forum} />
      <div className="lg:ml-[var(--sidebar-width)] xl:mr-80">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Breadcrumbs
            items={[
              { label: t("common.home"), href: "/" },
              { label: forum.name, href: `/forum/${slug}` },
            ]}
          />

          {/* Forum Header */}
          <div
            className="card mb-6 overflow-hidden p-8"
            style={{
              borderLeft: `4px solid ${forumColor}`,
              background: `linear-gradient(to right, ${forumColor}15, var(--card-bg))`,
              boxShadow: `0 4px 12px ${forumColor}20, var(--shadow-md)`,
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0 transition-transform hover:scale-110"
                style={{
                  background: `linear-gradient(135deg, ${forumColor} 0%, ${forumColor}CC 100%)`,
                  boxShadow: `0 4px 12px ${forumColor}40`,
                }}
              >
                {forumIcon}
              </div>
              <div className="flex-1">
                <h1
                  className="text-2xl sm:text-3xl font-extrabold mb-2"
                  style={{
                    color: "var(--foreground)",
                    background: `linear-gradient(135deg, var(--foreground) 0%, ${forumColor} 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {forum.name}
                </h1>
                {forum.description && (
                  <p
                    className="text-base mb-3 leading-relaxed"
                    style={{ color: "var(--muted)" }}
                  >
                    {forum.description}
                  </p>
                )}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
                      style={{
                        background: "var(--brand)",
                        color: "white",
                        boxShadow: "0 2px 8px rgba(88, 101, 242, 0.3)",
                      }}
                    >
                      📝
                    </div>
                    <span
                      className="text-base font-semibold"
                      style={{ color: "var(--foreground)" }}
                    >
                      {pagination.total}{" "}
                      {pagination.total === 1
                        ? t("threads.thread")
                        : t("threads.threads")}
                    </span>
                  </div>
                  <Link href={`/forum/${slug}/new`} className="btn btn-primary">
                    + {t("threads.newThread")}
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Threads List */}
          {threads.length === 0 ? (
            <div className="card text-center py-8 mb-6 p-8">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-xl mx-auto mb-3"
                style={{
                  background: "var(--brand-light)",
                }}
              >
                💭
              </div>
              <h3
                className="text-2xl font-bold mb-3"
                style={{ color: "var(--foreground)" }}
              >
                {t("threads.noThreads")}
              </h3>
              <p style={{ color: "var(--muted)" }} className="mb-6 text-lg">
                {t("threads.beFirstDiscussion")}
              </p>
              <Link href={`/forum/${slug}/new`} className="btn btn-primary">
                {t("threads.createFirstThread")}
              </Link>
            </div>
          ) : (
            <div className="mb-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                    style={{
                      background: "var(--brand)",
                      color: "white",
                    }}
                  >
                    📋
                  </div>
                  <h2
                    className="text-3xl font-bold"
                    style={{ color: "var(--foreground)" }}
                  >
                    {t("threads.title")}
                  </h2>
                </div>
                <ThreadSortFilter
                  currentSort={sortBy}
                  onSortChange={(sort) => {
                    setSortBy(sort);
                    setPage(1);
                    setData(null);
                  }}
                />
              </div>
              <InfiniteScroll
                hasMore={pagination.hasMore}
                isLoading={isLoadingMore}
                onLoadMore={handleLoadMore}
                loader={
                  <div className="space-y-6 mt-4">
                    {[1, 2].map((i) => (
                      <LoadingSkeleton key={i} />
                    ))}
                  </div>
                }
                endMessage={
                  <p
                    className="text-center mt-6 text-lg"
                    style={{ color: "var(--muted)" }}
                  >
                    {t("threads.noMoreThreads")}
                  </p>
                }
              >
                <div className="space-y-6">
                  {threads.map((thread) => (
                    <ThreadCard
                      key={thread.id}
                      thread={thread}
                      forumSlug={slug}
                    />
                  ))}
                </div>
              </InfiniteScroll>
            </div>
          )}

          {/* Forum Rules */}
          <div
            className="card mt-12 p-8"
            style={{
              borderLeft: `4px solid var(--brand)`,
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                style={{
                  background: "var(--brand)",
                  color: "white",
                }}
              >
                📜
              </div>
              <h3
                className="text-2xl font-bold"
                style={{ color: "var(--foreground)" }}
              >
                {t("forums.rules")}
              </h3>
            </div>
            <ul
              className="space-y-4 text-base"
              style={{ color: "var(--muted)" }}
            >
              <li className="flex items-start gap-3">
                <span
                  className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: "var(--brand-light)",
                    color: "var(--brand)",
                  }}
                >
                  1
                </span>
                <span>{t("forums.rule1")}</span>
              </li>
              <li className="flex items-start gap-3">
                <span
                  className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: "var(--brand-light)",
                    color: "var(--brand)",
                  }}
                >
                  2
                </span>
                <span>{t("forums.rule2")}</span>
              </li>
              <li className="flex items-start gap-3">
                <span
                  className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: "var(--brand-light)",
                    color: "var(--brand)",
                  }}
                >
                  3
                </span>
                <span>{t("forums.rule3")}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Trending Panel */}
        <TrendingPanel />
      </div>
    </>
  );
}
