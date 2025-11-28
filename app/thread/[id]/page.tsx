"use client";

import { use, useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import CommentThread from "@/components/CommentThread";
import CommentFormWithDraft from "@/components/CommentFormWithDraft";
import InfiniteScroll from "@/components/InfiniteScroll";
import { CommentSkeleton } from "@/components/LoadingSkeleton";
// Lazy load MarkdownRenderer
const MarkdownRenderer = dynamic(
  () => import("@/components/MarkdownRenderer"),
  {
    loading: () => <div className="skeleton h-20 w-full" />,
  }
);
import Breadcrumbs from "@/components/Breadcrumbs";
import ThreadSidebar from "@/components/ThreadSidebar";
import MobileThreadSidebar from "@/components/MobileThreadSidebar";
import TrendingPanel from "@/components/TrendingPanel";
import EditThreadButton from "@/components/EditThreadButton";
import DeleteButton from "@/components/DeleteButton";
import ShareButtons from "@/components/ShareButtons";
import BookmarkButton from "@/components/BookmarkButton";
import SubscribeButton from "@/components/SubscribeButton";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/hooks/useAuth";
import { useTranslations } from "@/components/TranslationsProvider";
import MetaHead from "@/components/MetaHead";
import { ThreadStructuredData } from "@/components/StructuredData";

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
  const [showCommentForm, setShowCommentForm] = useState(false);
  const { showSuccess, showError } = useToast();
  const { user } = useAuth();
  const { t } = useTranslations();

  const fetchData = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
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
    },
    [id, data]
  );

  useEffect(() => {
    fetchData();
  }, [id, fetchData]);

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
        throw new Error(error.error || t("threads.errorPosting"));
      }

      showSuccess(t("threads.commentPosted"));
      setPage(1);
      await fetchData(1, false);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t("threads.errorPosting");
      showError(errorMessage);
      throw error;
    }
  };

  if (isLoading && !data) {
    return (
      <div className="lg:ml-[var(--sidebar-width)] xl:mr-80">
        <div className="max-w-7xl mx-auto px-4 py-4">
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
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="card text-center py-6">
            <p style={{ color: "var(--muted)" }}>
              {t("threads.threadNotFound")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { thread, comments } = data;
  
  // Calculate comment count
  const commentCount = data.pagination?.total || comments.length;

  return (
    <>
      <MetaHead
        title={`${thread.title} - Loophub`}
        description={thread.content
          .replace(/[#*`_~\[\]()]/g, "")
          .replace(/\n/g, " ")
          .substring(0, 155)
          .trim()}
        ogParams={{
          type: "thread",
          forum: thread.forum?.name,
          author: thread.profile?.username,
          votes: (thread.upvote_count || 0) - (thread.downvote_count || 0),
          comments: commentCount,
          // Tags are fetched separately if needed
        }}
      />
      <ThreadStructuredData thread={thread} author={thread.profile} />
      <div className="lg:ml-[var(--sidebar-width)] xl:mr-80">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Breadcrumbs
            items={[
              { label: t("common.home"), href: "/" },
              { label: thread.forum.name, href: `/forum/${thread.forum.slug}` },
              { label: thread.title },
            ]}
          />

          <div className="flex gap-4 items-start">
            {/* Main Content */}
            <div className="flex-1 min-w-0 space-y-6">
              {/* Thread Header */}
              <article
                className="card p-8"
                style={{
                  borderLeft: "3px solid var(--brand)",
                }}
              >
                <div className="flex items-start justify-between gap-4 mb-6">
                  <h1
                    className="font-bold leading-tight flex-1 text-2xl"
                    style={{
                      color: "var(--foreground)",
                    }}
                  >
                    {thread.title}
                  </h1>
                  {user?.id === thread.user_id && (
                    <div className="flex items-center gap-2 shrink-0">
                      <EditThreadButton
                        threadId={thread.id}
                        currentTitle={thread.title}
                        currentContent={thread.content}
                        onSuccess={() => fetchData(1, false)}
                      />
                      <DeleteButton id={thread.id} type="thread" />
                    </div>
                  )}
                </div>
                <div className="leading-relaxed markdown-content text-base mb-8">
                  <MarkdownRenderer content={thread.content} />
                </div>

                {/* Share Buttons */}
                <div
                  className="pt-6 pb-2 border-t flex items-center justify-between"
                  style={{ borderColor: "var(--border)" }}
                >
                  <ShareButtons
                    title={thread.title}
                    url={`/thread/${thread.id}`}
                    description={thread.content
                      .replace(/[#*`_~\[\]()]/g, "")
                      .replace(/\n/g, " ")
                      .substring(0, 100)
                      .trim()}
                  />
                  <div className="flex items-center gap-2">
                    <BookmarkButton threadId={thread.id} size="md" />
                    <SubscribeButton threadId={thread.id} showText size="md" />
                  </div>
                </div>
              </article>

              {/* Comments Section */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--brand), var(--accent))",
                      color: "white",
                    }}
                  >
                    💬
                  </div>
                  <h2
                    className="font-bold text-xl"
                    style={{ color: "var(--foreground)" }}
                  >
                    {t("threads.comments")}
                  </h2>
                  <div
                    className="px-3 py-1 rounded-full font-bold text-sm"
                    style={{
                      background: "var(--brand)",
                      color: "white",
                    }}
                  >
                    {data.pagination.total}
                  </div>
                </div>

                {comments.length === 0 && !isLoading ? (
                  <div className="card text-center py-12 mb-4">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl"
                      style={{
                        background: "var(--brand-light)",
                      }}
                    >
                      💭
                    </div>
                    <h3
                      className="font-semibold text-lg mb-2"
                      style={{ color: "var(--foreground)" }}
                    >
                      {t("threads.noComments")}
                    </h3>
                    <p className="text-sm" style={{ color: "var(--muted)" }}>
                      {t("threads.beFirst")}
                    </p>
                  </div>
                ) : (
                  <InfiniteScroll
                    hasMore={data.pagination.hasMore}
                    isLoading={isLoadingMore}
                    onLoadMore={handleLoadMore}
                    loader={
                      <div className="space-y-1 mt-1">
                        {[1, 2].map((i) => (
                          <CommentSkeleton key={i} />
                        ))}
                      </div>
                    }
                    endMessage={
                      <p
                        className="text-center py-0.5"
                        style={{ color: "var(--muted)", fontSize: "0.6875rem" }}
                      >
                        {t("threads.noMoreComments")}
                      </p>
                    }
                  >
                    <CommentThread
                      comments={comments}
                      threadId={id}
                      onCommentAdded={() => fetchData(1, false)}
                      onCommentDeleted={() => fetchData(1, false)}
                    />
                  </InfiniteScroll>
                )}
              </section>

              {/* Comment Form */}
              {!showCommentForm ? (
                <button
                  onClick={() => setShowCommentForm(true)}
                  className="card p-5 pl-6 w-full text-left hover:bg-[var(--card-hover)] transition-all mb-6 relative overflow-visible"
                  style={{
                    borderLeft: "3px solid var(--brand)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-lg relative z-10"
                      style={{
                        background: "var(--brand)",
                        color: "white",
                      }}
                    >
                      ➕
                    </div>
                    <span
                      className="font-semibold text-base"
                      style={{ color: "var(--foreground)" }}
                    >
                      {t("threads.addComment")}
                    </span>
                  </div>
                </button>
              ) : (
                <div
                  className="card p-6 mb-6"
                  style={{
                    borderLeft: "3px solid var(--brand)",
                  }}
                >
                  <CommentFormWithDraft
                    threadId={id}
                    onSubmit={async (values) => {
                      await handleCommentSubmit(values);
                      setShowCommentForm(false);
                    }}
                    onCancel={() => setShowCommentForm(false)}
                  />
                </div>
              )}
            </div>

            {/* Sidebar */}
            <ThreadSidebar thread={thread} />
            <MobileThreadSidebar thread={thread} />
          </div>
        </div>

        {/* Trending Panel */}
        <TrendingPanel />
      </div>
    </>
  );
}
