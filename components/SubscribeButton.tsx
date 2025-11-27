"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/contexts/ToastContext";

interface SubscribeButtonProps {
  threadId: string;
  initialSubscribed?: boolean;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function SubscribeButton({
  threadId,
  initialSubscribed = false,
  showText = false,
  size = "md",
  className = "",
}: SubscribeButtonProps) {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [isSubscribed, setIsSubscribed] = useState(initialSubscribed);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const checkSubscription = async () => {
      try {
        const response = await fetch(`/api/subscriptions?threadId=${threadId}`);
        if (response.ok) {
          const data = await response.json();
          setIsSubscribed(data.subscribed);
        }
      } catch (error) {
        console.error("Error checking subscription:", error);
      }
    };

    checkSubscription();
  }, [user, threadId]);

  const handleToggle = async () => {
    if (!user) {
      showError("Inicia sesión para seguir este hilo");
      return;
    }

    setIsLoading(true);
    const previousState = isSubscribed;
    setIsSubscribed(!isSubscribed);

    try {
      const response = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId }),
      });

      if (!response.ok) {
        throw new Error("Failed to toggle subscription");
      }

      const data = await response.json();
      setIsSubscribed(data.subscribed);
      
      showSuccess(
        data.subscribed 
          ? "Ahora sigues este hilo"
          : "Dejaste de seguir este hilo"
      );
    } catch (error) {
      console.error("Error toggling subscription:", error);
      setIsSubscribed(previousState);
      showError("Error al cambiar suscripción");
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: "p-1.5 text-xs",
    md: "p-2 text-sm",
    lg: "p-2.5 text-base",
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
      className={`rounded-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 ${sizeClasses[size]} ${className}`}
      style={{
        background: isSubscribed ? "var(--brand-light)" : "transparent",
        color: isSubscribed ? "var(--brand)" : "var(--muted)",
      }}
      title={isSubscribed ? "Dejar de seguir" : "Seguir hilo"}
      aria-label={isSubscribed ? "Unsubscribe from thread" : "Subscribe to thread"}
    >
      <svg
        className={`${iconSizes[size]} transition-transform ${isLoading ? "animate-pulse" : ""}`}
        fill={isSubscribed ? "currentColor" : "none"}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      {showText && (
        <span className="font-medium">
          {isSubscribed ? "Siguiendo" : "Seguir"}
        </span>
      )}
    </button>
  );
}
