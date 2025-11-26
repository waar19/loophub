"use client";

import { Comment } from "@/lib/supabase";
import ReportButton from "@/components/ReportButton";
import EditCommentButton from "@/components/EditCommentButton";
import dynamic from "next/dynamic";
import DeleteCommentButton from "@/components/DeleteCommentButton";
import { useState, useEffect } from "react";
import Tooltip from "./Tooltip";
// Lazy load MarkdownRenderer
const MarkdownRenderer = dynamic(
  () => import("@/components/MarkdownRenderer"),
  {
    loading: () => <div className="skeleton h-12 w-full" />,
  }
);
import { useAuth } from "@/hooks/useAuth";

interface CommentCardProps {
  comment: Comment;
  onUpdate?: () => void;
}

export default function CommentCard({ comment, onUpdate }: CommentCardProps) {
  const { user } = useAuth();
  const isOwner = user?.id === comment.user_id;
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(comment.like_count || 0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if user has liked this comment
    if (user) {
      fetch(`/api/likes?commentId=${comment.id}`)
        .then((res) => res.json())
        .then((data) => {
          setIsLiked(data.isLiked);
          setLikeCount(data.likeCount);
        })
        .catch(console.error);
    }
  }, [user, comment.id]);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user || isLoading) return;

    setIsLoading(true);
    try {
      if (isLiked) {
        // Unlike
        const res = await fetch(`/api/likes?commentId=${comment.id}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (res.ok) {
          setIsLiked(false);
          setLikeCount(data.likeCount);
        }
      } else {
        // Like
        const res = await fetch("/api/likes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ commentId: comment.id }),
        });
        const data = await res.json();
        if (res.ok) {
          setIsLiked(true);
          setLikeCount(data.likeCount);
        }
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    } finally {
      setIsLoading(false);
    }
  };

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
                <span className="text-xs" style={{ color: "var(--muted)" }}>
                  {date}
                </span>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Like button */}
          {user && (
            <Tooltip
              content={isLiked ? "Quitar me gusta" : "Me gusta"}
              position="top"
            >
              <button
                onClick={handleLike}
                disabled={isLoading}
                className="flex items-center gap-1 text-sm transition-all hover:scale-110"
                style={{
                  color: isLiked ? "var(--brand)" : "var(--muted)",
                }}
              >
                <svg
                  className="w-4 h-4"
                  fill={isLiked ? "currentColor" : "none"}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={isLiked ? 0 : 2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                {likeCount > 0 && (
                  <span className="font-medium">{likeCount}</span>
                )}
              </button>
            </Tooltip>
          )}

          {/* Like count for non-authenticated users */}
          {!user && likeCount > 0 && (
            <Tooltip content="Me gusta" position="top">
              <div className="flex items-center gap-1 text-sm">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  style={{ color: "var(--muted)" }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                <span style={{ color: "var(--muted)" }}>{likeCount}</span>
              </div>
            </Tooltip>
          )}

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
