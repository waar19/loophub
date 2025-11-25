"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/contexts/ToastContext";
import InfiniteScroll from "@/components/InfiniteScroll";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useTranslations } from "@/components/TranslationsProvider";

interface Notification {
  id: string;
  type: "comment" | "reply" | "mention" | "thread_update";
  title: string;
  message: string;
  link?: string;
  read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { showError, showSuccess } = useToast();
  const { t } = useTranslations();

  useEffect(() => {
    if (user) {
      fetchNotifications();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const fetchNotifications = async (
    pageNum: number = 1,
    append: boolean = false
  ) => {
    if (!user) return;

    try {
      if (!append) setIsLoading(true);
      else setIsLoadingMore(true);

      const res = await fetch(
        `/api/notifications?limit=20&offset=${(pageNum - 1) * 20}`
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

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return t("common.justNow");
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${t("common.ago")} ${diffInMinutes} ${
        diffInMinutes === 1 ? t("common.minute") : t("common.minutes")
      }`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${t("common.ago")} ${diffInHours} ${
        diffInHours === 1 ? t("common.hour") : t("common.hours")
      }`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${t("common.ago")} ${diffInDays} ${
        diffInDays === 1 ? t("common.day") : t("common.days")
      }`;
    }

    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {
      return `${t("common.ago")} ${diffInWeeks} ${
        diffInWeeks === 1 ? t("common.week") : t("common.weeks")
      }`;
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
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="card text-center py-12">
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
        <div className="max-w-4xl mx-auto px-6 py-8">
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
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Breadcrumbs
          items={[
            { label: t("common.home"), href: "/" },
            { label: t("notifications.title") },
          ]}
        />

        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
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
                className="text-3xl font-bold"
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
                className="btn text-sm"
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
        </div>

        {notifications.length === 0 ? (
          <div className="card text-center py-16">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-6"
              style={{
                background: "var(--brand-light)",
              }}
            >
              🔔
            </div>
            <h3
              className="text-2xl font-bold mb-3"
              style={{ color: "var(--foreground)" }}
            >
              {t("notifications.noNotifications")}
            </h3>
            <p style={{ color: "var(--muted)" }} className="text-lg">
              {t("notifications.whenInteract")}
            </p>
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
            <div className="space-y-4">
              {notifications.map((notification) => (
                <a
                  key={notification.id}
                  href={notification.link || "#"}
                  onClick={() => {
                    if (!notification.read) {
                      markAsRead(notification.id);
                    }
                  }}
                  className={`card block transition-all hover:scale-[1.01] ${
                    !notification.read ? "border-l-4" : "opacity-75"
                  }`}
                  style={{
                    borderLeftColor: notification.read
                      ? "transparent"
                      : "var(--brand)",
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-3 h-3 rounded-full mt-2 shrink-0 ${
                        notification.read ? "opacity-0" : ""
                      }`}
                      style={{ background: "var(--brand)" }}
                    />
                    <div className="flex-1 min-w-0">
                      <h3
                        className="text-lg font-semibold mb-2"
                        style={{ color: "var(--foreground)" }}
                      >
                        {notification.title}
                      </h3>
                      <p
                        className="text-base mb-3"
                        style={{ color: "var(--muted)" }}
                      >
                        {notification.message}
                      </p>
                      <time
                        className="text-sm"
                        style={{ color: "var(--muted)" }}
                      >
                        {formatTimeAgo(notification.created_at)}
                      </time>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </InfiniteScroll>
        )}
      </div>
    </div>
  );
}
