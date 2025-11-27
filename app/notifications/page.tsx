"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/contexts/ToastContext";
import InfiniteScroll from "@/components/InfiniteScroll";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useTranslations } from "@/components/TranslationsProvider";

interface Notification {
  id: string;
  type: "comment" | "reply" | "mention" | "thread_update" | "upvote" | "downvote" | "vote_milestone";
  title: string;
  message: string;
  link?: string;
  read: boolean;
  created_at: string;
  related_user_id?: string;
  related_user_username?: string;
}

type FilterType = "all" | "unread";

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const { showError, showSuccess } = useToast();
  const { t } = useTranslations();

  useEffect(() => {
    if (user) {
      setPage(1);
      setNotifications([]);
      fetchNotifications(1, false);
    } else {
      setIsLoading(false);
    }
  }, [user, filter]);

  const fetchNotifications = async (
    pageNum: number = 1,
    append: boolean = false
  ) => {
    if (!user) return;

    try {
      if (!append) setIsLoading(true);
      else setIsLoadingMore(true);

      const unreadOnly = filter === "unread" ? "&unread=true" : "";
      const res = await fetch(
        `/api/notifications?limit=20&offset=${(pageNum - 1) * 20}${unreadOnly}`
      );
      if (!res.ok) throw new Error("Failed to fetch notifications");
      const data = await res.json();

      if (append) {
        setNotifications((prev) => [...prev, ...(data.notifications || [])]);
      } else {
        setNotifications(data.notifications || []);
      }

      setUnreadCount(data.unreadCount || 0);
      setHasMore((data.notifications || []).length === 20);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      showError(
        t("notifications.errorLoading") || "Error al cargar notificaciones"
      );
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchNotifications(nextPage, true);
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
      showError(t("notifications.errorMarking"));
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
      showSuccess(t("notifications.allMarkedRead"));
    } catch (error) {
      console.error("Error marking all as read:", error);
      showError(t("notifications.errorMarkingAll"));
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "upvote":
      case "vote_milestone":
        return "⬆️";
      case "downvote":
        return "⬇️";
      case "comment":
      case "reply":
        return "💬";
      case "mention":
        return "@";
      case "thread_update":
        return "📝";
      default:
        return "🔔";
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return t("notifications.justNow") || t("common.justNow");
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours}h`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays}d`;
    }

    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {
      return `${diffInWeeks}w`;
    }

    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  if (!user) {
    return (
      <div className="lg:ml-[var(--sidebar-width)]">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="card text-center py-6">
            <p style={{ color: "var(--muted)" }}>
              {t("notifications.mustLogin")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading && notifications.length === 0) {
    return (
      <div className="lg:ml-[var(--sidebar-width)]">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card">
                <div className="skeleton h-6 w-3/4 mb-2" />
                <div className="skeleton h-4 w-full mb-2" />
                <div className="skeleton h-3 w-1/4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:ml-[var(--sidebar-width)]">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <Breadcrumbs
          items={[
            { label: t("common.home"), href: "/" },
            { label: t("notifications.title") },
          ]}
        />

        <div className="mb-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                style={{
                  background: "var(--brand)",
                  color: "white",
                }}
              >
                🔔
              </div>
              <h1
                className="text-2xl sm:text-3xl font-bold"
                style={{ color: "var(--foreground)" }}
              >
                {t("notifications.title")}
                {unreadCount > 0 && (
                  <span
                    className="ml-3 px-3 py-1 rounded-lg text-sm font-semibold"
                    style={{
                      background: "var(--brand-light)",
                      color: "var(--brand)",
                    }}
                  >
                    {unreadCount} {t("notifications.unread")}
                  </span>
                )}
              </h1>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="btn text-sm self-start sm:self-auto"
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
              >
                {t("notifications.markAllRead")}
              </button>
            )}
          </div>

          {/* Filters */}
          <div
            className="flex gap-2 p-1 rounded-lg w-fit"
            style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}
          >
            <button
              onClick={() => setFilter("all")}
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
              style={{
                background: filter === "all" ? "var(--brand)" : "transparent",
                color: filter === "all" ? "white" : "var(--foreground)",
              }}
            >
              {t("notifications.filterAll")}
            </button>
            <button
              onClick={() => setFilter("unread")}
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
              style={{
                background: filter === "unread" ? "var(--brand)" : "transparent",
                color: filter === "unread" ? "white" : "var(--foreground)",
              }}
            >
              {t("notifications.filterUnread")}
              {unreadCount > 0 && (
                <span
                  className="px-1.5 py-0.5 rounded-full text-xs"
                  style={{
                    background: filter === "unread" ? "rgba(255,255,255,0.2)" : "var(--brand-light)",
                    color: filter === "unread" ? "white" : "var(--brand)",
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="card text-center py-12">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-4"
              style={{
                background: "var(--brand-light)",
              }}
            >
              {filter === "unread" ? "✓" : "🔔"}
            </div>
            <h3
              className="text-xl font-bold mb-2"
              style={{ color: "var(--foreground)" }}
            >
              {filter === "unread" 
                ? t("notifications.allMarkedRead")
                : t("notifications.noNotifications")
              }
            </h3>
            <p style={{ color: "var(--muted)" }} className="text-base">
              {t("notifications.whenInteract")}
            </p>
            {filter === "unread" && (
              <button
                onClick={() => setFilter("all")}
                className="mt-4 text-sm font-medium"
                style={{ color: "var(--brand)" }}
              >
                {t("notifications.viewAll")}
              </button>
            )}
          </div>
        ) : (
          <InfiniteScroll
            hasMore={hasMore}
            isLoading={isLoadingMore}
            onLoadMore={handleLoadMore}
            loader={
              <div className="space-y-4 mt-4">
                {[1, 2].map((i) => (
                  <div key={i} className="card">
                    <div className="skeleton h-6 w-3/4 mb-2" />
                    <div className="skeleton h-4 w-full mb-2" />
                    <div className="skeleton h-3 w-1/4" />
                  </div>
                ))}
              </div>
            }
            endMessage={
              <p className="text-center py-4" style={{ color: "var(--muted)" }}>
                {t("notifications.noMoreNotifications")}
              </p>
            }
          >
            <div className="space-y-3">
              {notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.link || "#"}
                  onClick={() => {
                    if (!notification.read) {
                      markAsRead(notification.id);
                    }
                  }}
                  className={`card block transition-all hover:scale-[1.01] hover:shadow-lg ${
                    !notification.read ? "border-l-4" : ""
                  }`}
                  style={{
                    borderLeftColor: notification.read
                      ? "transparent"
                      : "var(--brand)",
                    background: notification.read 
                      ? "var(--card-bg)" 
                      : "var(--brand-light)",
                  }}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0"
                      style={{
                        background: notification.read ? "var(--border)" : "var(--brand)",
                        color: notification.read ? "var(--foreground)" : "white",
                      }}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3
                          className={`text-base font-semibold ${!notification.read ? "" : "opacity-75"}`}
                          style={{ color: "var(--foreground)" }}
                        >
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5"
                            style={{ background: "var(--brand)" }}
                          />
                        )}
                      </div>
                      
                      <p
                        className={`text-sm mb-2 ${!notification.read ? "" : "opacity-75"}`}
                        style={{ color: "var(--muted)" }}
                      >
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center gap-3">
                        {notification.related_user_username && (
                          <span
                            className="text-xs font-medium"
                            style={{ color: "var(--brand)" }}
                          >
                            @{notification.related_user_username}
                          </span>
                        )}
                        <time
                          className="text-xs"
                          style={{ color: "var(--muted)" }}
                        >
                          {formatTimeAgo(notification.created_at)}
                        </time>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </InfiniteScroll>
        )}

        {/* Settings Link */}
        <div className="mt-8 text-center">
          <Link
            href="/settings"
            className="text-sm inline-flex items-center gap-2 transition-colors hover:opacity-80"
            style={{ color: "var(--muted)" }}
          >
            ⚙️ {t("notifications.settings.title")}
          </Link>
        </div>
      </div>
    </div>
  );
}
