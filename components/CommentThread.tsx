"use client";

import CommentCard from "./CommentCard";
import type { Comment } from "@/lib/supabase";
import { useTranslations } from "./TranslationsProvider";

interface CommentThreadProps {
  comments: Comment[];
  threadId: string;
  onCommentAdded?: () => void;
  onCommentDeleted?: () => void;
  maxDepth?: number;
}

export default function CommentThread({
  comments,
  threadId,
  onCommentAdded,
  onCommentDeleted,
  maxDepth = 5,
}: CommentThreadProps) {
  const { t } = useTranslations();

  // Build tree structure from flat list
  const buildTree = (flatComments: Comment[]): Comment[] => {
    const commentMap = new Map<string, Comment>();
    const rootComments: Comment[] = [];

    // First pass: create map of all comments
    flatComments.forEach((comment) => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Second pass: build tree structure
    flatComments.forEach((comment) => {
      const commentWithReplies = commentMap.get(comment.id)!;
      
      if (comment.parent_id) {
        // This is a reply
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          parent.replies = parent.replies || [];
          parent.replies.push(commentWithReplies);
        } else {
          // Parent not found (might be deleted), treat as root
          rootComments.push(commentWithReplies);
        }
      } else {
        // This is a root comment
        rootComments.push(commentWithReplies);
      }
    });

    return rootComments;
  };

  const commentTree = buildTree(comments);

  const renderComment = (comment: Comment, depth: number = 0) => {
    const hasReplies = comment.replies && comment.replies.length > 0;
    const canReply = depth < maxDepth;

    return (
      <div key={comment.id} className="comment-thread-item relative">
        {/* Vertical line indicator for nested comments */}
        {depth > 0 && (
          <div
            className="absolute left-0 top-0 bottom-0"
            style={{
              width: "1px",
              background: "var(--border)",
              marginLeft: `${(depth - 1) * 16 + 8}px`,
              opacity: 0.3,
            }}
          />
        )}

        {/* Comment card with indentation */}
        <div
          style={{
            marginLeft: depth > 0 ? `${depth * 16}px` : "0",
            paddingLeft: depth > 0 ? "8px" : "0",
          }}
          className="relative"
        >
          <CommentCard
            comment={comment}
            threadId={threadId}
            onCommentAdded={onCommentAdded}
            onCommentDeleted={onCommentDeleted}
            canReply={canReply}
            depth={depth}
          />
        </div>

        {/* Render replies recursively */}
        {hasReplies && (
          <div className="replies-container">
            {comment.replies!.map((reply) =>
              renderComment(reply, depth + 1)
            )}
          </div>
        )}

        {/* Max depth reached indicator */}
        {!canReply && hasReplies && (
          <div
            className="text-xs italic py-1"
            style={{
              color: "var(--muted)",
              marginLeft: `${(depth + 1) * 16}px`,
              paddingLeft: "8px",
            }}
          >
            {t("threads.maxDepthReached") || "Nivel máximo de respuestas alcanzado"}
          </div>
        )}
      </div>
    );
  };

  if (comments.length === 0) {
    return (
      <div className="text-center py-12">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-4"
          style={{ background: "var(--brand-light)" }}
        >
          💬
        </div>
        <h3
          className="text-xl font-bold mb-2"
          style={{ color: "var(--foreground)" }}
        >
          {t("threads.noComments")}
        </h3>
        <p style={{ color: "var(--muted)" }}>{t("threads.beFirst")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {commentTree.map((comment) => renderComment(comment, 0))}
    </div>
  );
}
