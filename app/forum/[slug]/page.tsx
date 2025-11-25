"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import ThreadCard from "@/components/ThreadCard";
import InfiniteScroll from "@/components/InfiniteScroll";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { Thread } from "@/lib/supabase";

interface Forum {
  id: string;
  name: string;
  slug: string;
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
        const errorMessage = errorData.error || errorData.details || `Failed to fetch forum data: ${res.status}`;
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
      // Only set error state if it's the initial load
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
      <div>
        <div className="mb-8">
          <div className="h-10 rounded w-64 mb-2 animate-pulse" style={{ backgroundColor: "var(--border)" }}></div>
          <div className="h-5 rounded w-32 animate-pulse" style={{ backgroundColor: "var(--border)" }}></div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <LoadingSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!data && !isLoading) {
    return (
      <div className="card text-center py-12">
        <p style={{ color: "var(--muted)" }} className="mb-4">
          Error al cargar el foro. Por favor, intenta refrescar la página.
        </p>
        <button
          onClick={() => fetchData(1, false)}
          className="btn btn-primary"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { forum, threads, pagination } = data;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">{forum.name}</h1>
          <p style={{ color: "var(--muted)" }}>
            {pagination.total} {pagination.total === 1 ? "hilo" : "hilos"}
          </p>
        </div>
        <Link href={`/forum/${slug}/new`} className="btn btn-primary">
          Nuevo Hilo
        </Link>
      </div>

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
            <p style={{ color: "var(--muted)" }}>
              No hay más hilos para cargar
            </p>
          }
        >
          <div className="space-y-4">
            {threads.map((thread) => (
              <ThreadCard key={thread.id} thread={thread} forumSlug={slug} />
            ))}
          </div>
        </InfiniteScroll>
      )}
    </div>
  );
}
