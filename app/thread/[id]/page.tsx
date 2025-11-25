"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CommentCard from "@/components/CommentCard";
import SimpleForm from "@/components/SimpleForm";
import InfiniteScroll from "@/components/InfiniteScroll";
import { CommentSkeleton } from "@/components/LoadingSkeleton";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import Breadcrumbs from "@/components/Breadcrumbs";
import ThreadSidebar from "@/components/ThreadSidebar";
import TrendingPanel from "@/components/TrendingPanel";
import { useToast } from "@/contexts/ToastContext";

import { Thread, Comment, Forum } from "@/lib/supabase";

interface ThreadData {
  thread: Thread & { forum: Forum };
  comments: Comment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export default function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<ThreadData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (!append) setIsLoading(true);
      else setIsLoadingMore(true);

      const res = await fetch(
        `/api/threads/${id}/comments?page=${pageNum}&limit=20`
      );
      if (!res.ok) throw new Error("Failed to fetch thread");
      const threadData: ThreadData = await res.json();

      if (append && data) {
        setData({
          ...threadData,
          comments: [...data.comments, ...threadData.comments],
        });
      } else {
        setData(threadData);
        setPage(1);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && data?.pagination.hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchData(nextPage, true);
    }
  };

  const handleCommentSubmit = async (formData: Record<string, string>) => {
    try {
      const res = await fetch(`/api/threads/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al publicar el comentario");
      }

      showSuccess("¡Comentario publicado exitosamente!");
      setPage(1);
      await fetchData(1, false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al publicar el comentario";
      showError(errorMessage);
      throw error;
    }
  };

  if (isLoading && !data) {
    return (
      <div className="lg:ml-[var(--sidebar-width)] xl:mr-80">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="skeleton h-6 w-48 mb-6" />
          <div className="card mb-8">
            <div className="skeleton h-8 w-3/4 mb-3" />
            <div className="skeleton h-4 w-48 mb-4" />
            <div className="space-y-2">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-5/6" />
            </div>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <CommentSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="lg:ml-[var(--sidebar-width)] xl:mr-80">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="card text-center py-12">
            <p style={{ color: "var(--muted)" }}>
              Hilo no encontrado
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { thread, comments } = data;

  return (
    <div className="lg:ml-[var(--sidebar-width)] xl:mr-80">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Breadcrumbs
          items={[
            { label: "Inicio", href: "/" },
            { label: thread.forum.name, href: `/forum/${thread.forum.slug}` },
            { label: thread.title },
          ]}
        />

        <div className="flex gap-8 items-start">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Thread Header */}
            <div className="card mb-8">
              <h1
                className="text-3xl font-bold mb-4"
                style={{ color: "var(--foreground)" }}
              >
                {thread.title}
              </h1>
              <div className="text-lg">
                <MarkdownRenderer content={thread.content} />
              </div>
            </div>

            {/* Comments Section */}
            <div className="mb-6">
              <h2
                className="text-2xl font-semibold mb-6"
                style={{ color: "var(--foreground)" }}
              >
                Comentarios ({data.pagination.total})
              </h2>

              {comments.length === 0 && !isLoading ? (
                <div className="card text-center py-8">
                  <p style={{ color: "var(--muted)" }}>
                    Aún no hay comentarios. ¡Sé el primero en comentar!
                  </p>
                </div>
              ) : (
                <InfiniteScroll
                  hasMore={data.pagination.hasMore}
                  isLoading={isLoadingMore}
                  onLoadMore={handleLoadMore}
                  loader={
                    <div className="space-y-4 mt-4">
                      {[1, 2].map((i) => (
                        <CommentSkeleton key={i} />
                      ))}
                    </div>
                  }
                  endMessage={
                    <p
                      className="text-center py-4"
                      style={{ color: "var(--muted)" }}
                    >
                      No hay más comentarios para cargar
                    </p>
                  }
                >
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <CommentCard key={comment.id} comment={comment} />
                    ))}
                  </div>
                </InfiniteScroll>
              )}
            </div>

            {/* Comment Form */}
            <div className="card">
              <h3
                className="text-xl font-semibold mb-4"
                style={{ color: "var(--foreground)" }}
              >
                Agregar Comentario
              </h3>
              <SimpleForm
                fields={[
                  {
                    name: "content",
                    label: "Tu Comentario",
                    type: "markdown",
                    placeholder:
                      "Comparte tus pensamientos... (Markdown soportado)",
                    required: true,
                    maxLength: 10000,
                  },
                ]}
                onSubmit={handleCommentSubmit}
                submitText="Publicar Comentario"
              />
            </div>
          </div>

          {/* Sidebar */}
          <ThreadSidebar thread={thread} />
        </div>
      </div>

      {/* Trending Panel */}
      <TrendingPanel />
    </div>
  );
}
