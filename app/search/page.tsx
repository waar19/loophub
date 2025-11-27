"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "@/components/TranslationsProvider";
import ThreadCard from "@/components/ThreadCard";
import ForumCard from "@/components/ForumCard";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import Breadcrumbs from "@/components/Breadcrumbs";
import SearchFilters from "@/components/SearchFilters";
import TagBadge from "@/components/TagBadge";
import { Thread } from "@/lib/supabase";
import MetaHead from "@/components/MetaHead";

interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface SearchResults {
  threads: (Thread & {
    profile?: { username: string };
    forum?: { name: string; slug: string };
    tags?: Tag[];
    _count?: { comments: number };
  })[];
  comments: {
    id: string;
    content: string;
    user_id: string;
    thread_id: string;
    created_at: string;
    thread_title: string;
    profile?: { username: string };
  }[];
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
  filters: {
    query: string;
    type: string;
    forum: string | null;
    author: string | null;
    tags: string[] | null;
    date: string | null;
    sort: string;
  };
}

function SearchPageContent() {
  const { t } = useTranslations();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const type = searchParams.get("type") || "all";

  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    fetchResults();
  }, [searchParams.toString()]);

  const fetchResults = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/search?${searchParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch search results");
      const data = await res.json();
      setResults(data);
    } catch (error) {
      console.error("Error fetching search results:", error);
      setResults({
        threads: [],
        comments: [],
        forums: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasMore: false },
        filters: { query: "", type: "all", forum: null, author: null, tags: null, date: null, sort: "relevance" },
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Empty state when no query
  if (!query && !searchParams.get("forum") && !searchParams.get("tags")) {
    return (
      <>
        <MetaHead
          title={`${t("search.title")} - Loophub`}
          description="Search for threads and forums on Loophub"
        />
        <div className="lg:ml-[var(--sidebar-width)]">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <Breadcrumbs items={[{ label: t("search.title"), href: "/search" }]} />
            <div className="card text-center py-16">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-6"
                style={{ background: "var(--brand-light)" }}
              >
                🔍
              </div>
              <h2 className="text-2xl font-bold mb-3" style={{ color: "var(--foreground)" }}>
                {t("search.title")} en LoopHub
              </h2>
              <p style={{ color: "var(--muted)" }} className="text-lg">
                {t("common.searchPrompt")}
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <MetaHead
        title={`${query ? `"${query}"` : t("search.title")} - Loophub`}
        description={`Search results for "${query}" on Loophub`}
      />
      <div className="lg:ml-[var(--sidebar-width)]">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Breadcrumbs items={[{ label: t("search.title"), href: "/search" }]} />

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                  style={{ background: "var(--brand)", color: "white" }}
                >
                  🔍
                </div>
                <h1
                  className="text-2xl sm:text-3xl font-extrabold"
                  style={{
                    background: "linear-gradient(135deg, var(--foreground) 0%, var(--brand) 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {t("search.title")}
                </h1>
              </div>
              
              {/* Mobile filter toggle */}
              <button
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="lg:hidden px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                {t("search.filters")}
              </button>
            </div>

            {query && (
              <p className="text-lg" style={{ color: "var(--muted)" }}>
                <span className="font-medium" style={{ color: "var(--foreground)" }}>
                  {results?.pagination.total || 0}
                </span>{" "}
                {t("search.resultsFor")}{" "}
                <span className="font-semibold" style={{ color: "var(--brand)" }}>
                  "{query}"
                </span>
              </p>
            )}
          </div>

          {/* Mobile Filters Panel */}
          {showMobileFilters && (
            <div className="lg:hidden mb-6 card">
              <SearchFilters isMobile onClose={() => setShowMobileFilters(false)} />
            </div>
          )}

          <div className="flex gap-6">
            {/* Main Results */}
            <div className="flex-1 min-w-0">
              {/* Tabs */}
              <div className="flex gap-2 mb-6 border-b" style={{ borderColor: "var(--border)" }}>
                {[
                  { key: "all", label: t("search.typeAll") },
                  { key: "threads", label: t("search.typeThreads") },
                  { key: "comments", label: t("search.typeComments") },
                  { key: "forums", label: t("search.typeForums") },
                ].map(({ key, label }) => (
                  <Link
                    key={key}
                    href={`/search?${new URLSearchParams({ ...Object.fromEntries(searchParams.entries()), type: key === "all" ? "" : key }).toString()}`}
                    className="px-4 py-2 text-sm font-medium transition-colors relative"
                    style={{ color: (type === key || (key === "all" && type === "all")) ? "var(--brand)" : "var(--muted)" }}
                  >
                    {label}
                    {(type === key || (key === "all" && type === "all")) && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "var(--brand)" }} />
                    )}
                  </Link>
                ))}
              </div>

              {/* Results */}
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => <LoadingSkeleton key={i} />)}
                </div>
              ) : (
                <>
                  {/* Threads Results */}
                  {(type === "all" || type === "threads") && results?.threads && results.threads.length > 0 && (
                    <section className="mb-8">
                      {type === "all" && (
                        <h2 className="text-lg font-bold mb-4" style={{ color: "var(--foreground)" }}>
                          {t("search.typeThreads")} ({results.threads.length})
                        </h2>
                      )}
                      <div className="space-y-4">
                        {results.threads.map((thread) => (
                          <div key={thread.id}>
                            <ThreadCard thread={thread} forumSlug={thread.forum?.slug || ""} />
                            {thread.tags && thread.tags.length > 0 && (
                              <div className="flex gap-1 mt-2 ml-4">
                                {thread.tags.map((tag) => (
                                  <TagBadge
                                    key={tag.id}
                                    name={tag.name}
                                    slug={tag.slug}
                                    color={tag.color}
                                    size="sm"
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Comments Results */}
                  {type === "comments" && results?.comments && results.comments.length > 0 && (
                    <section className="mb-8">
                      <div className="space-y-4">
                        {results.comments.map((comment) => (
                          <Link
                            key={comment.id}
                            href={`/thread/${comment.thread_id}#comment-${comment.id}`}
                            className="card block p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-center gap-2 mb-2 text-sm" style={{ color: "var(--muted)" }}>
                              <span className="font-medium" style={{ color: "var(--foreground)" }}>
                                {comment.profile?.username || "Anónimo"}
                              </span>
                              <span>•</span>
                              <span>{t("common.postedBy")} </span>
                              <span className="font-medium" style={{ color: "var(--brand)" }}>
                                {comment.thread_title}
                              </span>
                            </div>
                            <p className="line-clamp-2" style={{ color: "var(--foreground)" }}>
                              {comment.content.replace(/[#*`_~\[\]()]/g, "").substring(0, 200)}...
                            </p>
                          </Link>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Forums Results */}
                  {(type === "all" || type === "forums") && results?.forums && results.forums.length > 0 && (
                    <section className="mb-8">
                      {type === "all" && (
                        <h2 className="text-lg font-bold mb-4" style={{ color: "var(--foreground)" }}>
                          {t("search.typeForums")} ({results.forums.length})
                        </h2>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {results.forums.map((forum) => (
                          <ForumCard key={forum.id} forum={forum} />
                        ))}
                      </div>
                    </section>
                  )}

                  {/* No Results */}
                  {results?.threads.length === 0 && results?.forums.length === 0 && (results?.comments?.length || 0) === 0 && (
                    <div className="card text-center py-12">
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-4"
                        style={{ background: "var(--brand-light)" }}
                      >
                        😕
                      </div>
                      <h3 className="text-xl font-bold mb-2" style={{ color: "var(--foreground)" }}>
                        {t("search.noResults")}
                      </h3>
                      <p style={{ color: "var(--muted)" }}>
                        {t("search.tryDifferent")}
                      </p>
                    </div>
                  )}

                  {/* Pagination */}
                  {results && results.pagination.totalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-8">
                      {Array.from({ length: Math.min(results.pagination.totalPages, 5) }, (_, i) => i + 1).map((page) => (
                        <Link
                          key={page}
                          href={`/search?${new URLSearchParams({ ...Object.fromEntries(searchParams.entries()), page: page.toString() }).toString()}`}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            results.pagination.page === page ? "" : "hover:bg-[var(--card-hover)]"
                          }`}
                          style={{
                            background: results.pagination.page === page ? "var(--brand)" : "var(--card-bg)",
                            color: results.pagination.page === page ? "white" : "var(--foreground)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          {page}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Desktop Filters Sidebar */}
            <aside className="hidden lg:block w-72 shrink-0">
              <div className="card sticky top-20">
                <SearchFilters />
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <SearchPageContent />
    </Suspense>
  );
}
