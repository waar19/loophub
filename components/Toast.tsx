"use client";

import { useEffect } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

export default function Toast({ toast, onClose }: ToastProps) {
  useEffect(() => {
    const duration = toast.duration || 4000;
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        );
      case "error":
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        );
      case "warning":
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        );
      case "info":
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
    }
  };

  const getStyles = () => {
    switch (toast.type) {
      case "success":
        return {
          background: "var(--card-bg)",
          borderColor: "var(--success)",
          color: "var(--foreground)",
          iconColor: "var(--success)",
        };
      case "error":
        return {
          background: "var(--card-bg)",
          borderColor: "var(--error)",
          color: "var(--foreground)",
          iconColor: "var(--error)",
        };
      case "warning":
        return {
          background: "var(--card-bg)",
          borderColor: "var(--warning)",
          color: "var(--foreground)",
          iconColor: "var(--warning)",
        };
      case "info":
        return {
          background: "var(--card-bg)",
          borderColor: "var(--brand)",
          color: "var(--foreground)",
          iconColor: "var(--brand)",
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      className="card flex items-center gap-3 p-4 min-w-[300px] max-w-[500px] shadow-lg animate-slide-in"
      style={{
        borderLeft: `4px solid ${styles.borderColor}`,
        background: styles.background,
        color: styles.color,
      }}
      role="alert"
      aria-live="polite"
    >
      <div style={{ color: styles.iconColor }} className="shrink-0">
        {getIcon()}
      </div>
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={() => onClose(toast.id)}
        className="shrink-0 p-1 rounded hover:bg-card-hover transition-colors"
        aria-label="Cerrar notificación"
        style={{ color: "var(--muted)" }}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}

