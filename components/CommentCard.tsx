"use client";

import { useState, useRef } from "react";
import { Comment } from "@/lib/supabase";
import ReportButton from "@/components/ReportButton";
import EditCommentButton from "@/components/EditCommentButton";
import dynamic from "next/dynamic";
import DeleteCommentButton from "@/components/DeleteCommentButton";
import Link from "next/link";
import VoteButtons from "./VoteButtons";
import ReactionDisplay from "./ReactionDisplay";
import { useAuth } from "@/hooks/useAuth";
import { useTranslations } from "./TranslationsProvider";
import { useToast } from "@/contexts/ToastContext";
import { MentionAutocomplete, useMentionAutocomplete } from "./MentionAutocomplete";

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
}

export default function CommentCard({
  comment,
  threadId,
  onCommentAdded,
  onCommentDeleted,
  canReply = true,
}: CommentCardProps) {
  const { user } = useAuth();
  const { t } = useTranslations();
  const { showSuccess, showError } = useToast();
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Mention autocomplete for reply form
  const {
    isOpen: isMentionOpen,
    query: mentionQuery,
    position: mentionPosition,
    checkForMention,
    insertMention,
    close: closeMention,
  } = useMentionAutocomplete(replyTextareaRef);

  const isOwner = user?.id === comment.user_id;

  // Format date like Reddit (e.g., "5h ago", "2d ago")
  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffYears > 0) return `${diffYears}y`;
    if (diffMonths > 0) return `${diffMonths}mo`;
    if (diffDays > 0) return `${diffDays}d`;
    if (diffHours > 0) return `${diffHours}h`;
    if (diffMins > 0) return `${diffMins}m`;
    return "now";
  };

  const date = formatTimeAgo(comment.created_at);

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
    } catch {
      showError(t("threads.errorPosting"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    onCommentDeleted?.();
  };

  return (
    <div className="flex gap-5 p-5 card">
      {/* Voting column - left side like Reddit */}
      <div className="flex flex-col items-center gap-1 pt-1">
        <VoteButtons
          commentId={comment.id}
          initialUpvotes={comment.upvote_count || 0}
          initialDownvotes={comment.downvote_count || 0}
          orientation="vertical"
        />
      </div>

      {/* Content column */}
      <div className="flex-1 min-w-0">
        {/* Header - compact single line */}
        <div className="flex items-center gap-2 mb-3">
          {comment.profile?.username && (
            <Link
              href={`/u/${comment.profile.username}`}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                style={{
                  background:
                    "linear-gradient(135deg, var(--brand), var(--accent))",
                  color: "white",
                }}
              >
                {comment.profile.username.charAt(0).toUpperCase()}
              </div>
              <span
                className="font-semibold hover:underline text-sm"
                style={{ color: "var(--foreground)" }}
              >
                {comment.profile.username}
              </span>
            </Link>
          )}
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            •
          </span>
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            {date}
          </span>
        </div>

        {/* Comment content - compact prose */}
        <div className="prose prose-sm max-w-none text-sm leading-relaxed mb-4">
          <MarkdownRenderer content={comment.content} />
        </div>

        {/* Reactions - below content, before actions (Requirement 1.1) */}
        <div className="mb-3">
          <ReactionDisplay
            contentType="comment"
            contentId={comment.id}
            authorId={comment.user_id}
          />
        </div>

        {/* Action buttons - compact horizontal list */}
        <div className="flex items-center gap-4 text-sm">
          {canReply && (
            <button
              onClick={() => setIsReplying(!isReplying)}
              className="font-semibold transition-colors hover:opacity-80"
              style={{
                color: isReplying ? "var(--brand)" : "var(--muted)",
              }}
              disabled={!user}
            >
              {isReplying ? t("common.cancel") : t("threads.reply")}
            </button>
          )}

          {comment.reply_count > 0 && (
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              {comment.reply_count}{" "}
              {comment.reply_count === 1
                ? t("threads.oneReply")
                : t("threads.replies")}
            </span>
          )}

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

        {/* Reply form (inline) */}
        {isReplying && (
          <div className="mt-3 relative">
            <textarea
              ref={replyTextareaRef}
              value={replyContent}
              onChange={(e) => {
                setReplyContent(e.target.value);
                checkForMention(e.target.value, e.target.selectionStart);
              }}
              onKeyUp={(e) => {
                const textarea = e.currentTarget;
                checkForMention(textarea.value, textarea.selectionStart);
              }}
              onClick={(e) => {
                const textarea = e.currentTarget;
                checkForMention(textarea.value, textarea.selectionStart);
              }}
              placeholder={t("threads.replyPlaceholder")}
              className="w-full p-1.5 rounded border resize-none focus:outline-none focus:ring-1 transition-all"
              style={{
                background: "var(--card-bg)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
                fontSize: "0.75rem",
              }}
              rows={2}
            />
            {/* Mention Autocomplete */}
            {isMentionOpen && (
              <MentionAutocomplete
                query={mentionQuery}
                position={mentionPosition}
                onSelect={(username) => insertMention(username, replyContent, setReplyContent)}
                onClose={closeMention}
              />
            )}
            <div className="flex items-center gap-1 mt-2">
              <span className="text-xs mr-2" style={{ color: "var(--muted)" }}>
                Type @ to mention users
              </span>
              <button
                onClick={handleReply}
                disabled={isSubmitting || !replyContent.trim()}
                className="px-2 py-1 rounded font-medium transition-colors"
                style={{
                  background:
                    isSubmitting || !replyContent.trim()
                      ? "var(--muted)"
                      : "var(--brand)",
                  color: "white",
                  fontSize: "0.6875rem",
                }}
              >
                {isSubmitting ? t("threads.posting") : t("threads.postReply")}
              </button>
              <button
                onClick={() => {
                  setIsReplying(false);
                  setReplyContent("");
                }}
                className="px-2 py-1 rounded font-medium transition-colors"
                style={{
                  background: "transparent",
                  color: "var(--muted)",
                  fontSize: "0.6875rem",
                }}
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
