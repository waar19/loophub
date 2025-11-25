"use client";

import { Comment } from "@/lib/supabase";
import ReportButton from "@/components/ReportButton";
import EditCommentButton from "@/components/EditCommentButton";
import DeleteCommentButton from "@/components/DeleteCommentButton";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { useAuth } from "@/hooks/useAuth";

interface CommentCardProps {
  comment: Comment;
  onUpdate?: () => void;
}

export default function CommentCard({ comment, onUpdate }: CommentCardProps) {
  const { user } = useAuth();
  const isOwner = user?.id === comment.user_id;
  
  const date = new Date(comment.created_at).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

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
                  className="text-sm font-medium block"
                  style={{ color: "var(--foreground)" }}
                >
                  {comment.profile.username}
                </span>
                <span
                  className="text-xs"
                  style={{ color: "var(--muted)" }}
                >
                  {date}
                </span>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isOwner && (
            <>
              <EditCommentButton
                commentId={comment.id}
                currentContent={comment.content}
                onSuccess={onUpdate}
              />
              <DeleteCommentButton
                commentId={comment.id}
                onSuccess={onUpdate}
              />
            </>
          )}
          <ReportButton contentType="comment" contentId={comment.id} />
        </div>
      </div>
      <div className="prose prose-sm max-w-none">
        <MarkdownRenderer content={comment.content} />
      </div>
    </div>
  );
}
