"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/contexts/ToastContext";

interface VoteButtonsProps {
  threadId?: string;
  commentId?: string;
  initialUpvotes?: number;
  initialDownvotes?: number;
  initialUserVote?: 1 | -1 | null;
}

export default function VoteButtons({
  threadId,
  commentId,
  initialUpvotes = 0,
  initialDownvotes = 0,
  initialUserVote = null,
}: VoteButtonsProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState<1 | -1 | null>(initialUserVote);
  const [isVoting, setIsVoting] = useState(false);

  // Calculate score
  const score = upvotes - downvotes;

  // Load vote status when component mounts (if not provided initially)
  useEffect(() => {
    if (!user || initialUserVote !== null) return;

    const loadVoteStatus = async () => {
      try {
        const params = new URLSearchParams();
        if (threadId) params.set("threadId", threadId);
        if (commentId) params.set("commentId", commentId);

        const res = await fetch(`/api/votes?${params}`);
        if (res.ok) {
          const data = await res.json();
          setUserVote(data.userVote);
          setUpvotes(data.upvotes);
          setDownvotes(data.downvotes);
        }
      } catch (error) {
        console.error("Error loading vote status:", error);
      }
    };

    loadVoteStatus();
  }, [user, threadId, commentId, initialUserVote]);

  const handleVote = async (voteType: 1 | -1) => {
    if (!user) {
      showToast("Debes iniciar sesión para votar", "error");
      return;
    }

    if (isVoting) return;

    // Optimistic UI update
    const previousVote = userVote;
    const previousUpvotes = upvotes;
    const previousDownvotes = downvotes;

    // Calculate new values
    let newUpvotes = upvotes;
    let newDownvotes = downvotes;
    let newUserVote: 1 | -1 | null = voteType;

    if (previousVote === voteType) {
      // Clicking the same vote removes it
      newUserVote = null;
      if (voteType === 1) {
        newUpvotes--;
      } else {
        newDownvotes--;
      }
    } else if (previousVote === null) {
      // No previous vote, add new one
      if (voteType === 1) {
        newUpvotes++;
      } else {
        newDownvotes++;
      }
    } else {
      // Changing vote from up to down or vice versa
      if (voteType === 1) {
        newUpvotes++;
        newDownvotes--;
      } else {
        newUpvotes--;
        newDownvotes++;
      }
    }

    // Update UI optimistically
    setUserVote(newUserVote);
    setUpvotes(newUpvotes);
    setDownvotes(newDownvotes);
    setIsVoting(true);

    try {
      // If clicking the same vote, remove it (DELETE)
      if (previousVote === voteType) {
        const params = new URLSearchParams();
        if (threadId) params.set("threadId", threadId);
        if (commentId) params.set("commentId", commentId);

        const res = await fetch(`/api/votes?${params}`, {
          method: "DELETE",
        });

        if (!res.ok) throw new Error("Failed to remove vote");

        const data = await res.json();
        setUpvotes(data.upvotes);
        setDownvotes(data.downvotes);
      } else {
        // Create or update vote
        const res = await fetch("/api/votes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            threadId,
            commentId,
            voteType,
          }),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to vote");
        }

        const data = await res.json();
        setUpvotes(data.upvotes);
        setDownvotes(data.downvotes);
      }
    } catch (error) {
      // Revert optimistic update on error
      setUserVote(previousVote);
      setUpvotes(previousUpvotes);
      setDownvotes(previousDownvotes);
      
      console.error("Error voting:", error);
      showToast(
        error instanceof Error ? error.message : "Error al votar",
        "error"
      );
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.25rem",
      }}
    >
      {/* Upvote Button */}
      <button
        onClick={() => handleVote(1)}
        disabled={isVoting || !user}
        style={{
          background: "none",
          border: "none",
          cursor: user ? (isVoting ? "not-allowed" : "pointer") : "not-allowed",
          padding: "0.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: isVoting ? 0.5 : 1,
          transition: "all 0.2s ease",
          color: userVote === 1 ? "var(--brand)" : "var(--foreground-secondary)",
        }}
        onMouseEnter={(e) => {
          if (user && !isVoting) {
            e.currentTarget.style.transform = "scale(1.2)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
        title={user ? "Upvote" : "Inicia sesión para votar"}
        aria-label="Upvote"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill={userVote === 1 ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 19V6M5 12l7-7 7 7" />
        </svg>
      </button>

      {/* Score */}
      <span
        style={{
          fontSize: "0.875rem",
          fontWeight: "600",
          color:
            score > 0
              ? "var(--success)"
              : score < 0
              ? "var(--danger)"
              : "var(--foreground)",
          minWidth: "2rem",
          textAlign: "center",
        }}
      >
        {score}
      </span>

      {/* Downvote Button */}
      <button
        onClick={() => handleVote(-1)}
        disabled={isVoting || !user}
        style={{
          background: "none",
          border: "none",
          cursor: user ? (isVoting ? "not-allowed" : "pointer") : "not-allowed",
          padding: "0.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: isVoting ? 0.5 : 1,
          transition: "all 0.2s ease",
          color: userVote === -1 ? "var(--danger)" : "var(--foreground-secondary)",
        }}
        onMouseEnter={(e) => {
          if (user && !isVoting) {
            e.currentTarget.style.transform = "scale(1.2)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
        title={user ? "Downvote" : "Inicia sesión para votar"}
        aria-label="Downvote"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill={userVote === -1 ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 5v13M5 12l7 7 7-7" />
        </svg>
      </button>
    </div>
  );
}
