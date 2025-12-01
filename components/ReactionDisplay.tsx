"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useReactions } from "@/hooks/useReactions";
import { useToast } from "@/contexts/ToastContext";
import {
  ReactionType,
  ContentType,
  ReactionSummary,
  REACTION_EMOJIS,
  REACTION_NAMES,
} from "@/lib/reactions";
import ReactionPicker from "./ReactionPicker";
import ReactionTooltip from "./ReactionTooltip";

interface ReactionDisplayProps {
  contentType: ContentType;
  contentId: string;
  initialReactions?: ReactionSummary[];
  authorId?: string;
}

/**
 * ReactionDisplay - Shows reactions with counts and add reaction button
 * 
 * Features:
 * - Show reactions with counts (only non-zero) (Requirement 1.4)
 * - Highlight user's own reactions (Requirement 1.5)
 * - Add reaction button to open picker
 * 
 * Requirements: 1.4, 1.5
 */
export default function ReactionDisplay({
  contentType,
  contentId,
  initialReactions = [],
}: ReactionDisplayProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [hoveredReaction, setHoveredReaction] = useState<ReactionType | null>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);


  const {
    reactions,
    isLoading,
    toggleReaction,
    getReactors,
  } = useReactions({
    contentType,
    contentId,
    initialReactions,
  });

  const handleToggleReaction = async (type: ReactionType) => {
    if (!user) {
      showToast("Debes iniciar sesión para reaccionar", "error");
      return;
    }
    await toggleReaction(type);
    setIsPickerOpen(false);
  };

  const handleAddButtonClick = () => {
    if (!user) {
      showToast("Debes iniciar sesión para reaccionar", "error");
      return;
    }
    setIsPickerOpen(!isPickerOpen);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-1">
        <div 
          className="w-16 h-6 rounded-full animate-pulse"
          style={{ background: "var(--border)" }}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* Existing reactions with counts (Requirement 1.4 - only non-zero) */}
      <AnimatePresence mode="popLayout">
        {reactions.map((reaction) => (
          <motion.div
            key={reaction.type}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="relative"
            onMouseEnter={() => setHoveredReaction(reaction.type)}
            onMouseLeave={() => setHoveredReaction(null)}
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleToggleReaction(reaction.type)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-sm transition-all ${
                reaction.hasReacted ? "ring-1" : ""
              }`}
              style={{
                background: reaction.hasReacted 
                  ? "var(--brand-light, rgba(var(--brand-rgb), 0.1))" 
                  : "var(--card-hover)",
                border: `1px solid ${reaction.hasReacted ? "var(--brand)" : "var(--border)"}`,
                color: reaction.hasReacted ? "var(--brand)" : "var(--foreground)",
              }}
              title={`${REACTION_NAMES[reaction.type]} (${reaction.count})`}
              aria-label={`${REACTION_NAMES[reaction.type]}: ${reaction.count} reactions${reaction.hasReacted ? ", you reacted" : ""}`}
            >
              <span className="text-base leading-none">{REACTION_EMOJIS[reaction.type]}</span>
              <span className="font-medium text-xs">{reaction.count}</span>
            </motion.button>

            {/* Tooltip showing who reacted */}
            {hoveredReaction === reaction.type && (
              <ReactionTooltip
                reactionType={reaction.type}
                getReactors={getReactors}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Add reaction button */}
      <div className="relative">
        <motion.button
          ref={addButtonRef}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleAddButtonClick}
          className="flex items-center justify-center w-7 h-7 rounded-full transition-colors"
          style={{
            background: isPickerOpen ? "var(--border)" : "var(--card-hover)",
            border: "1px solid var(--border)",
            color: "var(--muted)",
          }}
          title={user ? "Add reaction" : "Sign in to react"}
          aria-label="Add reaction"
          aria-expanded={isPickerOpen}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
        </motion.button>

        {/* Reaction picker popup */}
        {isPickerOpen && (
          <ReactionPicker
            onSelect={handleToggleReaction}
            onClose={() => setIsPickerOpen(false)}
            position="top"
            triggerRef={addButtonRef}
          />
        )}
      </div>
    </div>
  );
}
