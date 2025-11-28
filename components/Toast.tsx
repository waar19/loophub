"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

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
  const [progress, setProgress] = useState(100);
  const duration = toast.duration || 4000;

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      
      if (remaining <= 0) {
        clearInterval(interval);
        onClose(toast.id);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [toast.id, duration, onClose]);

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
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="card flex flex-col min-w-[300px] max-w-[500px] shadow-lg overflow-hidden"
      style={{
        borderLeft: `4px solid ${styles.borderColor}`,
        background: styles.background,
        color: styles.color,
      }}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 p-4">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
          style={{ color: styles.iconColor }}
          className="shrink-0"
        >
          {getIcon()}
        </motion.div>
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
      {/* Progress bar */}
      <div 
        className="h-1 w-full"
        style={{ background: 'rgba(0,0,0,0.1)' }}
      >
        <motion.div
          className="h-full"
          style={{ 
            background: styles.borderColor,
            width: `${progress}%`,
          }}
          transition={{ duration: 0.05 }}
        />
      </div>
    </motion.div>
  );
}

