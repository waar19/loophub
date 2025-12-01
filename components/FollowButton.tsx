"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslations } from "@/components/TranslationsProvider";
import { useToast } from "@/contexts/ToastContext";

interface FollowButtonProps {
  userId: string;
  username: string;
  initialIsFollowing?: boolean;
  initialFollowerCount?: number;
  showCount?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary";
}

export default function FollowButton({
  userId,
  username,
  initialIsFollowing = false,
  initialFollowerCount = 0,
  showCount = true,
  size = "md",
  variant = "primary",
}: FollowButtonProps) {
  const { user } = useAuth();
  const { t } = useTranslations();
  const { showSuccess, showError } = useToast();

  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [isLoading, setIsLoading] = useState(false);

  // Don't show button for own profile
  if (user?.id === userId) {
    return null;
  }

  const handleToggleFollow = async () => {
    if (!user) {
      showError(t("common.loginRequired"));
      return;
    }

    setIsLoading(true);

    // Optimistic update
    const wasFollowing = isFollowing;
    const previousCount = followerCount;
    setIsFollowing(!wasFollowing);
    setFollowerCount(wasFollowing ? followerCount - 1 : followerCount + 1);

    try {
      const res = await fetch(`/api/users/${userId}/follow`, {
        method: wasFollowing ? "DELETE" : "POST",
      });

      if (!res.ok) {
        // Revert on error
        setIsFollowing(wasFollowing);
        setFollowerCount(previousCount);
        const data = await res.json();
        showError(data.error || t("common.error"));
        return;
      }

      const data = await res.json();

      // Update with server response
      setIsFollowing(data.isFollowing);
      setFollowerCount(data.followerCount);

      showSuccess(
        data.isFollowing
          ? `Ahora sigues a ${username}`
          : `Dejaste de seguir a ${username}`
      );
    } catch (error) {
      // Revert on error
      setIsFollowing(wasFollowing);
      setFollowerCount(previousCount);
      console.error("Error toggling follow:", error);
      showError(t("common.error"));
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: "px-3 py-1 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  const variantClasses = {
    primary: isFollowing
      ? "border border-[var(--border)] hover:bg-red-500/10 hover:border-red-500 hover:text-red-500"
      : "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]",
    secondary: isFollowing
      ? "border border-[var(--border)] hover:bg-red-500/10 hover:border-red-500 hover:text-red-500"
      : "border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)]/10",
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleToggleFollow}
        disabled={isLoading}
        className={`
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          rounded-lg font-medium transition-all
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center gap-2
        `}
        style={{
          color: !isFollowing && variant === "primary" ? "white" : undefined,
        }}
      >
        {isLoading ? (
          <>
            <span className="animate-spin">⏳</span>
            {t("common.loading")}
          </>
        ) : (
          <>
            {isFollowing ? (
              <>
                <span>✓</span>
                Siguiendo
              </>
            ) : (
              <>
                <span>+</span>
                Seguir
              </>
            )}
          </>
        )}
      </button>

      {showCount && (
        <span className="text-sm" style={{ color: "var(--muted)" }}>
          {followerCount} {followerCount === 1 ? "seguidor" : "seguidores"}
        </span>
      )}
    </div>
  );
}
