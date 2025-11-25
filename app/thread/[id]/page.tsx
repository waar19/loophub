"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CommentCard from "@/components/CommentCard";
import SimpleForm from "@/components/SimpleForm";
import InfiniteScroll from "@/components/InfiniteScroll";
import { CommentSkeleton } from "@/components/LoadingSkeleton";
import MarkdownRenderer from "@/components/MarkdownRenderer";

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

export default function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<ThreadData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const router = useRouter();

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
    const res = await fetch(`/api/threads/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to post comment");
    }

    // Reset to first page and reload
    setPage(1);
    await fetchData(1, false);
  };

  if (isLoading && !data) {
    return (
      <div>
        <div className="mb-4">
          <div className="h-5 rounded w-32 animate-pulse" style={{ backgroundColor: "var(--border)" }}></div>
        </div>
        <div className="card mb-8">
          <div className="h-8 rounded w-3/4 mb-3 animate-pulse" style={{ backgroundColor: "var(--border)" }}></div>
          <div className="h-4 rounded w-48 mb-4 animate-pulse" style={{ backgroundColor: "var(--border)" }}></div>
          <div className="space-y-2">
            <div className="h-4 rounded w-full animate-pulse" style={{ backgroundColor: "var(--border)" }}></div>
            <div className="h-4 rounded w-5/6 animate-pulse" style={{ backgroundColor: "var(--border)" }}></div>
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <CommentSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card text-center py-12">
        <p style={{ color: "var(--muted)" }}>Thread not found</p>
      </div>
    );
  }

  const { thread, comments } = data;
  const date = new Date(thread.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div>
      <div className="mb-4">
        <Link
          href={`/forum/${thread.forum.slug}`}
          className="text-sm"
          style={{ color: "var(--accent)" }}
        >
          ← Back to {thread.forum.name}
        </Link>
      </div>

      <div className="card mb-8">
        <h1 className="text-3xl font-bold mb-3">{thread.title}</h1>
        <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
          Posted on {date}
        </p>
        <div className="text-lg">
          <MarkdownRenderer content={thread.content} />
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">
          Comments ({data.pagination.total})
        </h2>

        {comments.length === 0 && !isLoading ? (
          <div className="card text-center py-8">
            <p style={{ color: "var(--muted)" }}>
              No comments yet. Be the first to comment!
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
              <p style={{ color: "var(--muted)" }} className="text-center py-4">
                No more comments to load
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

      <div className="card max-w-2xl">
        <h3 className="text-xl font-semibold mb-4">Add a Comment</h3>
        <SimpleForm
          fields={[
            {
              name: "content",
              label: "Your Comment",
              type: "markdown",
              placeholder: "Share your thoughts... (Markdown supported)",
              required: true,
              maxLength: 10000,
            },
          ]}
          onSubmit={handleCommentSubmit}
          submitText="Post Comment"
        />
      </div>
    </div>
  );
}
