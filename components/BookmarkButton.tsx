"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/contexts/ToastContext";
import { useTranslations } from "@/components/TranslationsProvider";

interface BookmarkButtonProps {
  threadId: string;
  initialBookmarked?: boolean;
  showCount?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function BookmarkButton({
  threadId,
  initialBookmarked = false,
  size = "md",
  className = "",
}: BookmarkButtonProps) {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const { t } = useTranslations();
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [isLoading, setIsLoading] = useState(false);

  // Check initial bookmark status
  useEffect(() => {
    if (!user) return;

    const checkBookmark = async () => {
      try {
        const response = await fetch(`/api/bookmarks?threadId=${threadId}`);
        if (response.ok) {
          const data = await response.json();
          setIsBookmarked(data.bookmarked);
        }
      } catch (error) {
        console.error("Error checking bookmark:", error);
      }
    };

    checkBookmark();
  }, [user, threadId]);

  const handleToggle = async () => {
    if (!user) {
      showError(t("common.loginRequired") || "Inicia sesión para guardar");
      return;
    }

    setIsLoading(true);
    const previousState = isBookmarked;
    
    // Optimistic update
    setIsBookmarked(!isBookmarked);

    try {
      const response = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId }),
      });

      if (!response.ok) {
        throw new Error("Failed to toggle bookmark");
      }

      const data = await response.json();
      setIsBookmarked(data.bookmarked);
      
      showSuccess(
        data.bookmarked 
          ? (t("bookmarks.added") || "Guardado en favoritos")
          : (t("bookmarks.removed") || "Eliminado de favoritos")
      );
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      setIsBookmarked(previousState);
      showError(t("common.error") || "Error al guardar");
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: "p-1.5",
    md: "p-2",
    lg: "p-2.5",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`rounded-lg transition-all hover:scale-105 active:scale-95 ${sizeClasses[size]} ${className}`}
      style={{
        background: isBookmarked ? "var(--brand-light)" : "transparent",
        color: isBookmarked ? "var(--brand)" : "var(--muted)",
      }}
      title={isBookmarked ? (t("bookmarks.remove") || "Quitar de favoritos") : (t("bookmarks.add") || "Guardar en favoritos")}
      aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
    >
      <svg
        className={`${iconSizes[size]} transition-transform ${isLoading ? "animate-pulse" : ""}`}
        fill={isBookmarked ? "currentColor" : "none"}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
        />
      </svg>
    </button>
  );
}
