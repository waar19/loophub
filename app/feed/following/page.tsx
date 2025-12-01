"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslations } from "@/components/TranslationsProvider";
import Link from "next/link";
import ThreadCard from "@/components/ThreadCard";

interface Thread {
  id: string;
  title: string;
  content: string;
  created_at: string;
  score: number;
  upvote_count: number;
  downvote_count: number;
  comment_count: number;
  author: {
    id: string;
    username: string;
    avatar_url?: string;
    level: number;
  };
  forum: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export default function FollowingFeedPage() {
  const { user } = useAuth();
  const { t } = useTranslations();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (user) {
      fetchThreads(1);
    }
  }, [user]);

  const fetchThreads = async (pageNum: number, append = false) => {
    try {
      const loadingState = pageNum === 1 ? setLoading : setLoadingMore;
      loadingState(true);

      const res = await fetch(`/api/feed/following?page=${pageNum}&limit=20`);

      if (!res.ok) {
        throw new Error("Failed to fetch feed");
      }

      const data = await res.json();

      if (append) {
        setThreads((prev) => [...prev, ...data.threads]);
      } else {
        setThreads(data.threads);
      }

      setHasMore(data.hasMore);
      setPage(pageNum);
    } catch (error) {
      console.error("Error fetching following feed:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchThreads(page + 1, true);
    }
  };

  if (!user) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">🔒</div>
          <h2
            className="text-xl font-bold mb-2"
            style={{ color: "var(--foreground)" }}
          >
            Inicia sesión para ver tu feed
          </h2>
          <p className="mb-4" style={{ color: "var(--muted)" }}>
            Sigue a otros usuarios para ver su contenido aquí
          </p>
          <Link href="/login" className="btn-primary inline-block">
            Iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="mb-6">
          <h1
            className="text-3xl font-bold"
            style={{ color: "var(--foreground)" }}
          >
            Feed de Seguidos
          </h1>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-6">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-3xl font-bold mb-2"
          style={{ color: "var(--foreground)" }}
        >
          Feed de Seguidos
        </h1>
        <p style={{ color: "var(--muted)" }}>
          Contenido de las personas que sigues
        </p>
      </div>

      {/* Threads */}
      {threads.length > 0 ? (
        <>
          <div className="space-y-4">
            {threads.map((thread) => (
              <div key={thread.id} className="card">
                <Link
                  href={`/thread/${thread.id}`}
                  className="block p-6 hover:bg-[var(--hover)]"
                >
                  {/* Author info */}
                  <div className="flex items-center gap-2 mb-3">
                    {thread.author.avatar_url ? (
                      <img
                        src={thread.author.avatar_url}
                        alt={thread.author.username}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{
                          background: "var(--accent)",
                          color: "white",
                        }}
                      >
                        {thread.author.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <span
                        className="font-medium"
                        style={{ color: "var(--foreground)" }}
                      >
                        @{thread.author.username}
                      </span>
                      <span style={{ color: "var(--muted)" }}>•</span>
                      <span style={{ color: "var(--muted)" }}>
                        {new Date(thread.created_at).toLocaleDateString(
                          "es-ES",
                          {
                            month: "short",
                            day: "numeric",
                          }
                        )}
                      </span>
                      {thread.forum && (
                        <>
                          <span style={{ color: "var(--muted)" }}>•</span>
                          <span
                            className="px-2 py-0.5 rounded text-xs"
                            style={{
                              background: "var(--brand-light)",
                              color: "var(--brand-dark)",
                            }}
                          >
                            {thread.forum.name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Thread content */}
                  <h2
                    className="text-xl font-bold mb-2"
                    style={{ color: "var(--foreground)" }}
                  >
                    {thread.title}
                  </h2>

                  {thread.content && (
                    <p
                      className="text-sm mb-3 line-clamp-2"
                      style={{ color: "var(--muted)" }}
                    >
                      {thread.content.substring(0, 200)}
                      {thread.content.length > 200 ? "..." : ""}
                    </p>
                  )}

                  {/* Stats */}
                  <div
                    className="flex items-center gap-4 text-sm"
                    style={{ color: "var(--muted)" }}
                  >
                    <span className="flex items-center gap-1">
                      {thread.score > 0 ? "↑" : thread.score < 0 ? "↓" : "•"}
                      <span
                        style={{
                          color:
                            thread.score > 0
                              ? "var(--success)"
                              : thread.score < 0
                              ? "var(--error)"
                              : "var(--muted)",
                        }}
                      >
                        {Math.abs(thread.score)}
                      </span>
                    </span>
                    <span>💬 {thread.comment_count}</span>
                  </div>
                </Link>
              </div>
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="mt-6 text-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="btn-secondary"
              >
                {loadingMore ? "Cargando..." : "Cargar más"}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">👥</div>
          <h2
            className="text-xl font-bold mb-2"
            style={{ color: "var(--foreground)" }}
          >
            Tu feed está vacío
          </h2>
          <p className="mb-4" style={{ color: "var(--muted)" }}>
            Sigue a otros usuarios para ver su contenido aquí
          </p>
          <Link href="/" className="btn-primary inline-block">
            Explorar hilos
          </Link>
        </div>
      )}
    </div>
  );
}
