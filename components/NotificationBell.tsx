"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/contexts/ToastContext";

interface Notification {
  id: string;
  type: "comment" | "reply" | "mention" | "thread_update";
  title: string;
  message: string;
  link?: string;
  read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { showError } = useToast();

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const res = await fetch("/api/notifications?limit=10");
      if (!res.ok) throw new Error("Failed to fetch notifications");
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });

      if (!res.ok) throw new Error("Failed to mark as read");

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
      showError("Error al marcar notificación como leída");
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch("/api/notifications/read-all", {
        method: "POST",
      });

      if (!res.ok) throw new Error("Failed to mark all as read");

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
      showError("Error al marcar todas como leídas");
    }
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg transition-colors hover:bg-[var(--card-hover)]"
        aria-label="Notificaciones"
        title="Notificaciones"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          style={{ color: "var(--foreground)" }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span
            className="absolute top-0 right-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: "var(--brand)" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div
            className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-lg shadow-xl border z-50 max-h-[500px] overflow-hidden flex flex-col"
            style={{
              background: "var(--card-bg)",
              borderColor: "var(--border)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-4 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <h3
                className="text-lg font-bold"
                style={{ color: "var(--foreground)" }}
              >
                Notificaciones
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm font-medium transition-colors hover:opacity-80"
                  style={{ color: "var(--brand)" }}
                >
                  Marcar todas como leídas
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-4"
                    style={{ background: "var(--brand-light)" }}
                  >
                    🔔
                  </div>
                  <p style={{ color: "var(--muted)" }}>
                    No tienes notificaciones
                  </p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {notifications.map((notification) => (
                    <Link
                      key={notification.id}
                      href={notification.link || "#"}
                      onClick={() => {
                        if (!notification.read) {
                          markAsRead(notification.id);
                        }
                        setIsOpen(false);
                      }}
                      className={`block p-4 transition-colors hover:bg-[var(--card-hover)] ${
                        !notification.read ? "bg-[var(--brand-light)] bg-opacity-30" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                            notification.read ? "opacity-0" : ""
                          }`}
                          style={{ background: "var(--brand)" }}
                        />
                        <div className="flex-1 min-w-0">
                          <h4
                            className="font-semibold mb-1"
                            style={{ color: "var(--foreground)" }}
                          >
                            {notification.title}
                          </h4>
                          <p
                            className="text-sm mb-2 line-clamp-2"
                            style={{ color: "var(--muted)" }}
                          >
                            {notification.message}
                          </p>
                          <time
                            className="text-xs"
                            style={{ color: "var(--muted)" }}
                          >
                            {formatTimeAgo(notification.created_at)}
                          </time>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div
                className="p-4 border-t text-center"
                style={{ borderColor: "var(--border)" }}
              >
                <Link
                  href="/notifications"
                  onClick={() => setIsOpen(false)}
                  className="text-sm font-medium transition-colors hover:opacity-80"
                  style={{ color: "var(--brand)" }}
                >
                  Ver todas las notificaciones
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "Hace unos segundos";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `Hace ${diffInMinutes} ${diffInMinutes === 1 ? "minuto" : "minutos"}`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `Hace ${diffInHours} ${diffInHours === 1 ? "hora" : "horas"}`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `Hace ${diffInDays} ${diffInDays === 1 ? "día" : "días"}`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `Hace ${diffInWeeks} ${diffInWeeks === 1 ? "semana" : "semanas"}`;
  }

  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

