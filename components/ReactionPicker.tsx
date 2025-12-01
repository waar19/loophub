"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ReactionType,
  REACTION_TYPES,
  REACTION_EMOJIS,
  REACTION_NAMES,
} from "@/lib/reactions";

interface ReactionPickerProps {
  onSelect: (reactionType: ReactionType) => void;
  onClose: () => void;
  position?: "top" | "bottom";
  triggerRef?: React.RefObject<HTMLElement | null>;
}

/**
 * ReactionPicker - Emoji selector popup for adding reactions
 * 
 * Features:
 * - Display 6 emoji options (Requirement 3.1)
 * - Click outside to close (Requirement 3.2)
 * - Select emoji to add reaction and close (Requirement 3.3)
 * - Position to avoid viewport overflow (Requirement 3.4)
 * - Keyboard navigation support
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */
export default function ReactionPicker({
  onSelect,
  onClose,
  position = "top",
  triggerRef,
}: ReactionPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [adjustedPosition, setAdjustedPosition] = useState(position);


  // Handle click outside to close (Requirement 3.2)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node) &&
        (!triggerRef?.current || !triggerRef.current.contains(event.target as Node))
      ) {
        onClose();
      }
    };

    // Use mousedown for immediate response
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose, triggerRef]);

  // Adjust position to avoid viewport overflow (Requirement 3.4)
  useEffect(() => {
    if (!pickerRef.current) return;

    const rect = pickerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    if (position === "top" && rect.top < 0) {
      setAdjustedPosition("bottom");
    } else if (position === "bottom" && rect.bottom > viewportHeight) {
      setAdjustedPosition("top");
    } else {
      setAdjustedPosition(position);
    }
  }, [position]);

  // Keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case "Escape":
        event.preventDefault();
        onClose();
        break;
      case "ArrowLeft":
        event.preventDefault();
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : REACTION_TYPES.length - 1));
        break;
      case "ArrowRight":
        event.preventDefault();
        setFocusedIndex(prev => (prev < REACTION_TYPES.length - 1 ? prev + 1 : 0));
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        onSelect(REACTION_TYPES[focusedIndex]);
        break;
    }
  }, [focusedIndex, onClose, onSelect]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Handle emoji selection (Requirement 3.3)
  const handleSelect = (type: ReactionType) => {
    onSelect(type);
    // onClose is called by parent after selection
  };

  const positionClasses = adjustedPosition === "top"
    ? "bottom-full mb-2"
    : "top-full mt-2";

  return (
    <AnimatePresence>
      <motion.div
        ref={pickerRef}
        initial={{ opacity: 0, scale: 0.9, y: adjustedPosition === "top" ? 10 : -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.15 }}
        className={`absolute ${positionClasses} left-0 z-50`}
        role="listbox"
        aria-label="Select a reaction"
      >
        <div
          className="flex items-center gap-1 p-2 rounded-lg shadow-lg"
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--border)",
          }}
        >
          {/* 6 emoji options (Requirement 3.1) */}
          {REACTION_TYPES.map((type, index) => (
            <motion.button
              key={type}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleSelect(type)}
              onMouseEnter={() => setFocusedIndex(index)}
              className={`p-1.5 rounded-md transition-colors text-xl leading-none ${
                focusedIndex === index ? "bg-[var(--border)]" : ""
              }`}
              style={{
                background: focusedIndex === index ? "var(--border)" : "transparent",
              }}
              role="option"
              aria-selected={focusedIndex === index}
              aria-label={REACTION_NAMES[type]}
              title={REACTION_NAMES[type]}
            >
              {REACTION_EMOJIS[type]}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
