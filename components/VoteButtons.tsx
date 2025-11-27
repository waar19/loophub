"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/contexts/ToastContext";
import { motion } from "framer-motion";

interface VoteButtonsProps {
  threadId?: string;
  commentId?: string;
  initialUpvotes?: number;
  initialDownvotes?: number;
  initialUserVote?: 1 | -1 | null;
  orientation?: "vertical" | "horizontal";
}

export default function VoteButtons({
  threadId,
  commentId,
  initialUpvotes = 0,
  initialDownvotes = 0,
  initialUserVote = null,
  orientation = "horizontal",
}: VoteButtonsProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState<1 | -1 | null>(initialUserVote);
  const [isVoting, setIsVoting] = useState(false);

  const score = upvotes - downvotes;

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

    const previousVote = userVote;
    const previousUpvotes = upvotes;
    const previousDownvotes = downvotes;

    let newUpvotes = upvotes;
    let newDownvotes = downvotes;
    let newUserVote: 1 | -1 | null = voteType;

    if (previousVote === voteType) {
      newUserVote = null;
      if (voteType === 1) {
        newUpvotes--;
      } else {
        newDownvotes--;
      }
    } else if (previousVote === null) {
      if (voteType === 1) {
        newUpvotes++;
      } else {
        newDownvotes++;
      }
    } else {
      if (voteType === 1) {
        newUpvotes++;
        newDownvotes--;
      } else {
        newUpvotes--;
        newDownvotes++;
      }
    }

    setUserVote(newUserVote);
    setUpvotes(newUpvotes);
    setDownvotes(newDownvotes);
    setIsVoting(true);

    try {
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
      className={`flex items-center rounded-full overflow-hidden transition-all ${
        orientation === "vertical" ? "flex-col" : "flex-row"
      }`}
      onClick={(e) => e.stopPropagation()}
      style={{
        background: "var(--card-hover)",
        border: "2px solid var(--border)",
      }}
    >
      {/* Upvote Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleVote(1);
        }}
        disabled={isVoting || !user}
        className="p-1.5 transition-colors hover:bg-[var(--border-light)] group"
        style={{
          color: userVote === 1 ? "var(--upvote)" : "var(--muted)",
        }}
        title={user ? "Upvote" : "Inicia sesión para votar"}
        aria-label="Upvote"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={userVote === 1 ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </motion.button>

      {/* Score */}
      <motion.span
        key={score}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`font-bold text-xs text-center transition-colors ${
          orientation === "vertical"
            ? "px-1.5 py-0.5 min-h-[1.5rem]"
            : "px-2 min-w-[2.5rem]"
        }`}
        style={{
          color:
            userVote === 1
              ? "var(--upvote)"
              : userVote === -1
              ? "var(--downvote)"
              : "var(--foreground)",
        }}
      >
        {score}
      </motion.span>

      {/* Downvote Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleVote(-1);
        }}
        disabled={isVoting || !user}
        className="p-1.5 transition-colors hover:bg-[var(--border-light)] group"
        style={{
          color: userVote === -1 ? "var(--downvote)" : "var(--muted)",
        }}
        title={user ? "Downvote" : "Inicia sesión para votar"}
        aria-label="Downvote"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={userVote === -1 ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      </motion.button>
    </div>
  );
}
