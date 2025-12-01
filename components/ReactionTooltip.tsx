"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ReactionType,
  ReactorInfo,
  REACTION_EMOJIS,
  REACTION_NAMES,
} from "@/lib/reactions";

interface ReactionTooltipProps {
  reactionType: ReactionType;
  getReactors: (type: ReactionType) => Promise<{ reactors: ReactorInfo[]; totalCount: number }>;
}

/**
 * ReactionTooltip - Shows list of users who reacted on hover
 * 
 * Features:
 * - Show list of usernames on hover (Requirement 2.1)
 * - Max 10 users with "+X more" indicator (Requirement 2.1)
 * - Current user shown first (Requirement 2.3)
 * 
 * Requirements: 2.1, 2.2, 2.3
 */
export default function ReactionTooltip({
  reactionType,
  getReactors,
}: ReactionTooltipProps) {
  const [reactors, setReactors] = useState<ReactorInfo[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);


  useEffect(() => {
    let isMounted = true;

    const fetchReactors = async () => {
      setIsLoading(true);
      try {
        const data = await getReactors(reactionType);
        if (isMounted) {
          setReactors(data.reactors);
          setTotalCount(data.totalCount);
        }
      } catch (error) {
        console.error("Error fetching reactors:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchReactors();

    return () => {
      isMounted = false;
    };
  }, [reactionType, getReactors]);

  // Calculate how many more users beyond the displayed list
  const remainingCount = totalCount - reactors.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="absolute bottom-full left-0 mb-2 z-50 pointer-events-none"
    >
      <div
        className="px-3 py-2 rounded-lg shadow-lg text-xs min-w-[120px] max-w-[200px]"
        style={{
          background: "var(--foreground)",
          color: "var(--background)",
        }}
      >
        {/* Header with emoji and name */}
        <div className="flex items-center gap-1.5 mb-1.5 pb-1.5 border-b border-[var(--background)]/20">
          <span className="text-sm">{REACTION_EMOJIS[reactionType]}</span>
          <span className="font-medium">{REACTION_NAMES[reactionType]}</span>
        </div>

        {isLoading ? (
          <div className="text-center py-1 opacity-70">Loading...</div>
        ) : reactors.length === 0 ? (
          <div className="text-center py-1 opacity-70">No reactions yet</div>
        ) : (
          <>
            {/* List of usernames (max 10, Requirement 2.1) */}
            <ul className="space-y-0.5">
              {reactors.map((reactor, index) => (
                <li key={reactor.userId} className="truncate">
                  {/* Current user shown first with "You" indicator (Requirement 2.3) */}
                  {index === 0 && reactor.username === "You" ? (
                    <span className="font-medium">You</span>
                  ) : (
                    reactor.username
                  )}
                </li>
              ))}
            </ul>

            {/* "+X more" indicator (Requirement 2.1) */}
            {remainingCount > 0 && (
              <div className="mt-1.5 pt-1.5 border-t border-[var(--background)]/20 opacity-70">
                +{remainingCount} more
              </div>
            )}
          </>
        )}

        {/* Arrow pointing down */}
        <div
          className="absolute top-full left-4 w-0 h-0"
          style={{
            borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent",
            borderTop: "6px solid var(--foreground)",
          }}
        />
      </div>
    </motion.div>
  );
}
