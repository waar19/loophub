"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "@/components/TranslationsProvider";
import ThreadCard from "@/components/ThreadCard";
import ForumCard from "@/components/ForumCard";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import Breadcrumbs from "@/components/Breadcrumbs";
import TrendingPanel from "@/components/TrendingPanel";
import { Thread } from "@/lib/supabase";

interface SearchResults {
  threads: (Thread & {
    profile?: { username: string };
    forum?: { name: string; slug: string };
    _count?: { comments: number };
  })[];
  forums: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    created_at: string;
    _count: { threads: number };
  }[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export default function SearchPage() {
  const { t } = useTranslations();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const type = searchParams.get("type") || "all";

  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "threads" | "forums">(
    (type as "all" | "threads" | "forums") || "all"
  );

  useEffect(() => {
    if (query) {
      fetchResults();
    } else {
      setIsLoading(false);
    }
  }, [query, activeTab]);

  const fetchResults = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&type=${activeTab}`
      );
      if (!res.ok) throw new Error("Failed to fetch search results");
      const data = await res.json();
      setResults(data);
    } catch (error) {
      console.error("Error fetching search results:", error);
      setResults({
        threads: [],
        forums: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasMore: false,
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!query) {
    return (
      <div className="lg:ml-[var(--sidebar-width)] xl:mr-80">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Breadcrumbs
            items={[{ label: t("common.search"), href: "/search" }]}
          />
          <div className="card text-center py-16">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-6"
              style={{
                background: "var(--brand-light)",
              }}
            >
              🔍
            </div>
            <h2
              className="text-2xl font-bold mb-3"
              style={{ color: "var(--foreground)" }}
            >
              {t("common.search")} en LoopHub
            </h2>
            <p style={{ color: "var(--muted)" }} className="text-lg">
              {t("common.searchPrompt")}
            </p>
          </div>
        </div>
        <TrendingPanel />
      </div>
    );
  }

  return (
    <div className="lg:ml-[var(--sidebar-width)] xl:mr-80">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Breadcrumbs items={[{ label: t("common.search"), href: "/search" }]} />

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
              style={{
                background: "var(--brand)",
                color: "white",
              }}
            >
              🔍
            </div>
            <h1
              className="text-3xl sm:text-4xl font-extrabold"
              style={{
                background:
                  "linear-gradient(135deg, var(--foreground) 0%, var(--brand) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {t("common.searchResults") || "Resultados de búsqueda"}
            </h1>
          </div>
          <p className="text-lg" style={{ color: "var(--muted)" }}>
            {t("common.search")}:{" "}
            <span
              className="font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              {'"'}
              {query}
              {'"'}
            </span>
          </p>
        </div>

        {/* Tabs */}
        <div
          className="flex gap-2 mb-8 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          {(["all", "threads", "forums"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-2 text-sm font-medium transition-colors relative"
              style={{
                color: activeTab === tab ? "var(--brand)" : "var(--muted)",
              }}
            >
              {tab === "all" && t("common.search")}
              {tab === "threads" && t("threads.threads")}
              {tab === "forums" && t("forums.forums")}
              {activeTab === tab && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ background: "var(--brand)" }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <LoadingSkeleton key={i} />
            ))}
          </div>
        ) : (
          <>
            {/* Threads Results */}
            {(activeTab === "all" || activeTab === "threads") && (
              <section className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <h2
                    className="text-2xl font-bold"
                    style={{ color: "var(--foreground)" }}
                  >
                    {t("threads.threads")} ({results?.pagination.total || 0})
                  </h2>
                </div>
                {results?.threads.length === 0 ? (
                  <div className="card text-center py-12">
                    <p style={{ color: "var(--muted)" }}>
                      {t("common.noResultsFor")}{" "}
                      {t("forums.forums").toLowerCase()} {'"'}
                      {query}
                      {'"'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {results?.threads.map((thread) => (
                      <ThreadCard
                        key={thread.id}
                        thread={thread}
                        forumSlug={thread.forum?.slug || ""}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Forums Results */}
            {(activeTab === "all" || activeTab === "forums") && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <h2
                    className="text-2xl font-bold"
                    style={{ color: "var(--foreground)" }}
                  >
                    {t("forums.forums")} ({results?.forums.length || 0})
                  </h2>
                </div>
                {results?.forums.length === 0 ? (
                  <div className="card text-center py-12">
                    <p style={{ color: "var(--muted)" }}>
                      {t("common.noResultsFor")}{" "}
                      {t("forums.forums").toLowerCase()} {'"'}
                      {query}
                      {'"'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {results?.forums.map((forum) => (
                      <ForumCard key={forum.id} forum={forum} />
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>

      <TrendingPanel />
    </div>
  );
}
