"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import ThreadCard from "@/components/ThreadCard";
import InfiniteScroll from "@/components/InfiniteScroll";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import Breadcrumbs from "@/components/Breadcrumbs";
import TrendingPanel from "@/components/TrendingPanel";
import { Thread } from "@/lib/supabase";

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
  const [data, setData] = useState<ForumData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);

  const fetchData = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (!append) setIsLoading(true);
      else setIsLoadingMore(true);

      const res = await fetch(
        `/api/forums/${slug}/threads?page=${pageNum}&limit=20`
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
  }, [slug]);

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
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="card text-center py-12">
            <p style={{ color: "var(--muted)" }}>
              Error al cargar el foro. Por favor, intenta de nuevo.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { forum, threads, pagination } = data;
  const forumColor = forumColors[slug] || "var(--brand)";
  const forumIcon = forumIcons[slug] || "💬";

  return (
    <div className="lg:ml-[var(--sidebar-width)] xl:mr-80">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Breadcrumbs
          items={[
            { label: "Inicio", href: "/" },
            { label: forum.name, href: `/forum/${slug}` },
          ]}
        />

        {/* Forum Header */}
        <div
          className="card mb-8 overflow-hidden"
          style={{
            borderLeft: `4px solid ${forumColor}`,
            background: `linear-gradient(to right, ${forumColor}08, var(--card-bg))`,
          }}
        >
          <div className="flex items-start gap-6">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl shrink-0"
              style={{
                background: `${forumColor}15`,
              }}
            >
              {forumIcon}
            </div>
            <div className="flex-1">
              <h1
                className="text-3xl font-bold mb-2"
                style={{ color: "var(--foreground)" }}
              >
                {forum.name}
              </h1>
              {forum.description && (
                <p className="text-base mb-4" style={{ color: "var(--muted)" }}>
                  {forum.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-sm">
                <span style={{ color: "var(--muted)" }}>
                  {pagination.total}{" "}
                  {pagination.total === 1 ? "hilo" : "hilos"}
                </span>
                <Link
                  href={`/forum/${slug}/new`}
                  className="btn btn-primary text-sm"
                >
                  Nuevo Hilo
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Threads List */}
        {threads.length === 0 ? (
          <div className="card text-center py-12">
            <p style={{ color: "var(--muted)" }} className="mb-4">
              Aún no hay hilos. ¡Sé el primero en iniciar una discusión!
            </p>
            <Link href={`/forum/${slug}/new`} className="btn btn-primary">
              Crear Primer Hilo
            </Link>
          </div>
        ) : (
          <InfiniteScroll
            hasMore={pagination.hasMore}
            isLoading={isLoadingMore}
            onLoadMore={handleLoadMore}
            loader={
              <div className="space-y-4 mt-4">
                {[1, 2].map((i) => (
                  <LoadingSkeleton key={i} />
                ))}
              </div>
            }
            endMessage={
              <p className="text-center mt-6" style={{ color: "var(--muted)" }}>
                No hay más hilos para cargar
              </p>
            }
          >
            <div className="space-y-4">
              {threads.map((thread) => (
                <ThreadCard
                  key={thread.id}
                  thread={thread}
                  forumSlug={slug}
                />
              ))}
            </div>
          </InfiniteScroll>
        )}

        {/* Forum Rules */}
        <div className="card mt-8">
          <h3
            className="text-lg font-semibold mb-3"
            style={{ color: "var(--foreground)" }}
          >
            Reglas del Foro
          </h3>
          <ul className="space-y-2 text-sm" style={{ color: "var(--muted)" }}>
            <li className="flex items-start gap-2">
              <span className="shrink-0">•</span>
              <span>
                Mantén las discusiones respetuosas y constructivas
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="shrink-0">•</span>
              <span>
                Busca antes de crear un hilo para evitar duplicados
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="shrink-0">•</span>
              <span>
                Usa títulos descriptivos y claros para tus hilos
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Trending Panel */}
      <TrendingPanel />
    </div>
  );
}
