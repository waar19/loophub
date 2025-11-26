"use client";

import { useState } from "react";
import { Comment } from "@/lib/supabase";
import ReportButton from "@/components/ReportButton";
import EditCommentButton from "@/components/EditCommentButton";
import dynamic from "next/dynamic";
import DeleteCommentButton from "@/components/DeleteCommentButton";
import Tooltip from "./Tooltip";
import Link from "next/link";
import VoteButtons from "./VoteButtons";
import { useAuth } from "@/hooks/useAuth";
import { useTranslations } from "./TranslationsProvider";
import { useToast } from "@/contexts/ToastContext";

// Lazy load MarkdownRenderer
const MarkdownRenderer = dynamic(
  () => import("@/components/MarkdownRenderer"),
  {
    loading: () => <div className="skeleton h-12 w-full" />,
  }
);

interface CommentCardProps {
  comment: Comment;
  threadId: string;
  onCommentAdded?: () => void;
  onCommentDeleted?: () => void;
  canReply?: boolean;
  depth?: number;
}

export default function CommentCard({ 
  comment, 
  threadId,
  onCommentAdded,
  onCommentDeleted,
  canReply = true,
  depth = 0,
}: CommentCardProps) {
  const { user } = useAuth();
  const { t } = useTranslations();
  const { showSuccess, showError } = useToast();
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isOwner = user?.id === comment.user_id;

  const date = new Date(comment.created_at).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleReply = async () => {
    if (!user) {
      showError("Debes iniciar sesión para responder");
      return;
    }

    if (!replyContent.trim()) {
      showError(t("threads.commentPlaceholder"));
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/threads/${threadId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: replyContent,
          parent_id: comment.id,
        }),
      });

      if (!res.ok) throw new Error("Failed to post reply");

      showSuccess(t("threads.commentPosted"));
      setReplyContent("");
      setIsReplying(false);
      onCommentAdded?.();
    } catch (error) {
      showError(t("threads.errorPosting"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    onCommentDeleted?.();
  };

  return (
    <div
      className="card transition-all duration-200"
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--border-hover)";
        e.currentTarget.style.boxShadow = "var(--shadow-md)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.boxShadow = "var(--shadow-sm)";
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {comment.profile?.username && (
            <>
              <Link
                href={`/u/${comment.profile.username}`}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0"
                  style={{
                    background: "var(--brand-light)",
                    color: "var(--brand-dark)",
                  }}
                >
                  {comment.profile.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span
                    className="text-sm font-medium block hover:underline"
                    style={{ color: "var(--foreground)" }}
                  >
                    {comment.profile.username}
                  </span>
                  <span className="text-xs" style={{ color: "var(--muted)" }}>
                    {date}
                  </span>
                </div>
              </Link>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Vote buttons */}
          <VoteButtons
            commentId={comment.id}
            initialUpvotes={comment.upvote_count || 0}
            initialDownvotes={comment.downvote_count || 0}
          />

          {isOwner && (
            <>
              <EditCommentButton
                commentId={comment.id}
                currentContent={comment.content}
                onSuccess={onCommentAdded}
              />
              <DeleteCommentButton
                commentId={comment.id}
                onSuccess={handleDelete}
              />
            </>
          )}
          <ReportButton contentType="comment" contentId={comment.id} />
        </div>
      </div>
      
      <div className="prose prose-sm max-w-none">
        <MarkdownRenderer content={comment.content} />
      </div>

      {/* Reply button and count */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
        {canReply && (
          <button
            onClick={() => setIsReplying(!isReplying)}
            className="text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: isReplying ? "var(--brand)" : "var(--muted)" }}
            disabled={!user}
          >
            {isReplying ? t("common.cancel") : t("threads.reply")}
          </button>
        )}
        
        {comment.reply_count > 0 && (
          <span className="text-sm" style={{ color: "var(--muted)" }}>
            {comment.reply_count} {comment.reply_count === 1 ? t("threads.oneReply") : t("threads.replies")}
          </span>
        )}
      </div>

      {/* Reply form (inline) */}
      {isReplying && (
        <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder={t("threads.replyPlaceholder")}
            className="w-full p-3 rounded-lg border resize-none focus:outline-none focus:ring-2 transition-all"
            style={{
              background: "var(--card-bg)",
              borderColor: "var(--border)",
              color: "var(--foreground)",
            }}
            rows={3}
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleReply}
              disabled={isSubmitting || !replyContent.trim()}
              className="btn btn-primary text-sm px-4 py-2"
            >
              {isSubmitting ? t("threads.posting") : t("threads.postReply")}
            </button>
            <button
              onClick={() => {
                setIsReplying(false);
                setReplyContent("");
              }}
              className="btn btn-secondary text-sm px-4 py-2"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
