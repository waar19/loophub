"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useTranslations } from "@/components/TranslationsProvider";
import { useToast } from "@/contexts/ToastContext";
import BookmarkButton from "@/components/BookmarkButton";

interface Bookmark {
  id: string;
  created_at: string;
  thread: {
    id: string;
    title: string;
    content: string;
    created_at: string;
    upvotes: number;
    downvotes: number;
    forum: {
      name: string;
      slug: string;
    };
    author: {
      username: string;
    };
  };
}

export default function BookmarksPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslations();
  const { showError } = useToast();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const fetchBookmarks = async (reset = false) => {
    if (!user) return;

    try {
      const currentOffset = reset ? 0 : offset;
      const response = await fetch(`/api/bookmarks?limit=20&offset=${currentOffset}`);
      
      if (!response.ok) throw new Error("Failed to fetch bookmarks");
      
      const data = await response.json();
      
      if (reset) {
        setBookmarks(data.bookmarks);
        setOffset(20);
      } else {
        setBookmarks((prev) => [...prev, ...data.bookmarks]);
        setOffset((prev) => prev + 20);
      }
      
      setHasMore(data.hasMore);
    } catch (error) {
      console.error("Error fetching bookmarks:", error);
      showError(t("common.error"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchBookmarks(true);
    } else if (!authLoading) {
      setIsLoading(false);
    }
  }, [user, authLoading]);

  const handleRemoveBookmark = (bookmarkId: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (authLoading || isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">{t("bookmarks.title")}</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">{t("bookmarks.title")}</h1>
        <p style={{ color: "var(--muted)" }} className="mb-4">
          {t("common.loginRequired")}
        </p>
        <Link
          href="/login"
          className="btn-primary inline-block"
        >
          {t("auth.login")}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{t("bookmarks.title")}</h1>

      {bookmarks.length === 0 ? (
        <div className="card text-center py-12">
          <svg
            className="w-16 h-16 mx-auto mb-4"
            style={{ color: "var(--muted)" }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
          <p style={{ color: "var(--muted)" }}>{t("bookmarks.noBookmarks")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="card hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/thread/${bookmark.thread.id}`}
                    className="font-semibold hover:underline line-clamp-2"
                    style={{ color: "var(--foreground)" }}
                  >
                    {bookmark.thread.title}
                  </Link>
                  
                  <p
                    className="text-sm mt-1 line-clamp-2"
                    style={{ color: "var(--muted)" }}
                  >
                    {bookmark.thread.content}
                  </p>
                  
                  <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: "var(--muted)" }}>
                    <Link
                      href={`/forum/${bookmark.thread.forum.slug}`}
                      className="hover:underline"
                      style={{ color: "var(--accent)" }}
                    >
                      {bookmark.thread.forum.name}
                    </Link>
                    <span>•</span>
                    <span>
                      {t("common.postedBy")}{" "}
                      <Link
                        href={`/u/${bookmark.thread.author?.username || "anonymous"}`}
                        className="hover:underline"
                      >
                        {bookmark.thread.author?.username || t("common.anonymous")}
                      </Link>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <span style={{ color: "var(--success)" }}>↑{bookmark.thread.upvotes}</span>
                      <span style={{ color: "var(--error)" }}>↓{bookmark.thread.downvotes}</span>
                    </span>
                  </div>
                  
                  <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
                    {t("bookmarks.savedOn")} {formatDate(bookmark.created_at)}
                  </p>
                </div>
                
                <BookmarkButton
                  threadId={bookmark.thread.id}
                  initialBookmarked={true}
                  size="md"
                />
              </div>
            </div>
          ))}

          {hasMore && (
            <button
              onClick={() => fetchBookmarks()}
              className="btn-secondary w-full"
            >
              {t("common.loadMore")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
