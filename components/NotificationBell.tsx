"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { useTranslations } from "@/components/TranslationsProvider";

export default function NotificationBell() {
  const { user } = useAuth();
  const { t } = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const {
    unreadCount,
    recentNotifications,
    isLoading,
    markAsRead,
    markAllAsRead,
  } = useRealtimeNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleNotificationClick = async (notificationId: string, isRead: boolean) => {
    if (!isRead) {
      await markAsRead(notificationId);
    }
    setIsOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'upvote':
      case 'vote_milestone':
        return '⬆️';
      case 'downvote':
        return '⬇️';
      case 'comment':
      case 'reply':
        return '💬';
      case 'mention':
        return '@';
      case 'thread_update':
        return '📝';
      default:
        return '🔔';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return t('notifications.justNow') || 'Ahora';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
    return date.toLocaleDateString();
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-label={t("notifications.title")}
        title={t("notifications.title")}
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
            className="absolute top-0 right-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white animate-pulse"
            style={{ background: "var(--brand)" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
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
              {t("notifications.title")}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm font-medium transition-colors hover:opacity-80"
                style={{ color: "var(--brand)" }}
              >
                {t("notifications.markAllRead")}
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-current border-t-transparent rounded-full mx-auto" style={{ color: "var(--brand)" }} />
              </div>
            ) : recentNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-4"
                  style={{ background: "var(--brand-light)" }}
                >
                  🔔
                </div>
                <p style={{ color: "var(--muted)" }}>
                  {t("notifications.noNotifications")}
                </p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {recentNotifications.map((notification) => {
                  console.log('Notification:', notification); // Debug
                  
                  return (
                    <Link
                      key={notification.id}
                      href={notification.link || "/notifications"}
                      onClick={() => handleNotificationClick(notification.id, notification.read)}
                      className={`block p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                        !notification.read ? "bg-blue-50 dark:bg-blue-900/20" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon based on notification type */}
                        <div className="text-2xl shrink-0">
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {!notification.read && (
                              <div
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ background: "var(--brand)" }}
                              />
                            )}
                            <h4
                              className="font-semibold text-sm"
                              style={{ color: "var(--foreground)" }}
                            >
                              {notification.title || 'Sin título'}
                            </h4>
                          </div>
                          
                          <p
                            className="text-sm mb-2 line-clamp-2"
                            style={{ color: "var(--muted)" }}
                          >
                            {notification.message || 'Sin mensaje'}
                          </p>
                          
                          <div className="flex items-center gap-2">
                            {notification.related_user_username && (
                              <span className="text-xs font-medium" style={{ color: "var(--brand)" }}>
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
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {recentNotifications.length > 0 && (
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
                {t("notifications.viewAll")}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
