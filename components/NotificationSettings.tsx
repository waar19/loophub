"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/contexts/ToastContext";
import { useTranslations } from "@/components/TranslationsProvider";

interface NotificationSettings {
  notify_comments: boolean;
  notify_replies: boolean;
  notify_mentions: boolean;
  notify_upvotes: boolean;
  notify_downvotes: boolean;
  notify_milestones: boolean;
  browser_notifications: boolean;
  sound_enabled: boolean;
  email_digest: boolean;
  email_mentions: boolean;
  digest_frequency: 'daily' | 'weekly' | 'monthly' | 'never';
}

const defaultSettings: NotificationSettings = {
  notify_comments: true,
  notify_replies: true,
  notify_mentions: true,
  notify_upvotes: true,
  notify_downvotes: false,
  notify_milestones: true,
  browser_notifications: false,
  sound_enabled: false,
  email_digest: false,
  email_mentions: false,
  digest_frequency: 'weekly',
};

export default function NotificationSettings() {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const { t } = useTranslations();
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (user) {
      fetchSettings();
      // Check browser notification permission
      if ("Notification" in window) {
        setBrowserPermission(Notification.permission);
      }
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/notifications/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSettings({
            notify_comments: data.settings.notify_comments ?? true,
            notify_replies: data.settings.notify_replies ?? true,
            notify_mentions: data.settings.notify_mentions ?? true,
            notify_upvotes: data.settings.notify_upvotes ?? true,
            notify_downvotes: data.settings.notify_downvotes ?? false,
            notify_milestones: data.settings.notify_milestones ?? true,
            browser_notifications: data.settings.browser_notifications ?? false,
            sound_enabled: data.settings.sound_enabled ?? false,
            email_digest: data.settings.email_digest ?? false,
            email_mentions: data.settings.email_mentions ?? false,
            digest_frequency: data.settings.digest_frequency ?? 'weekly',
          });
        }
      }
    } catch (error) {
      console.error("Error fetching notification settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (key: keyof NotificationSettings) => {
    const newValue = !settings[key];
    
    // Special handling for browser notifications
    if (key === "browser_notifications" && newValue) {
      if ("Notification" in window) {
        const permission = await Notification.requestPermission();
        setBrowserPermission(permission);
        if (permission !== "granted") {
          showError(t("notifications.settings.browserPermissionDenied"));
          return;
        }
      } else {
        showError(t("notifications.settings.browserNotSupported"));
        return;
      }
    }

    setSettings((prev) => ({ ...prev, [key]: newValue }));
    
    // Auto-save
    setIsSaving(true);
    try {
      const res = await fetch("/api/notifications/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: newValue }),
      });

      if (!res.ok) {
        throw new Error("Failed to save");
      }
      
      showSuccess(t("notifications.settings.saved"));
    } catch (error) {
      console.error("Error saving notification settings:", error);
      showError(t("notifications.settings.errorSaving"));
      // Revert on error
      setSettings((prev) => ({ ...prev, [key]: !newValue }));
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="card p-6">
        <div className="skeleton h-6 w-48 mb-4" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const SettingToggle = ({
    settingKey,
    icon,
    title,
    description,
    disabled = false,
  }: {
    settingKey: keyof NotificationSettings;
    icon: string;
    title: string;
    description: string;
    disabled?: boolean;
  }) => (
    <div
      className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
        disabled ? "opacity-50" : "hover:bg-gray-50 dark:hover:bg-gray-800"
      }`}
      style={{ background: "var(--card-background)" }}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <div>
          <h4
            className="font-medium text-sm"
            style={{ color: "var(--foreground)" }}
          >
            {title}
          </h4>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            {description}
          </p>
        </div>
      </div>
      <button
        onClick={() => !disabled && handleToggle(settingKey)}
        disabled={disabled || isSaving}
        className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
          disabled ? "cursor-not-allowed" : "cursor-pointer"
        }`}
        style={{
          background: settings[settingKey] ? "var(--brand)" : "var(--border)",
        }}
        aria-label={`Toggle ${title}`}
      >
        <span
          className="absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow-sm"
          style={{
            left: settings[settingKey] ? "calc(100% - 20px)" : "4px",
          }}
        />
      </button>
    </div>
  );

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
          style={{ background: "var(--brand-light)", color: "var(--brand)" }}
        >
          🔔
        </div>
        <div>
          <h2
            className="text-lg font-bold"
            style={{ color: "var(--foreground)" }}
          >
            {t("notifications.settings.title")}
          </h2>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {t("notifications.settings.subtitle")}
          </p>
        </div>
      </div>

      {/* In-App Notifications */}
      <div className="mb-6">
        <h3
          className="text-sm font-semibold uppercase tracking-wide mb-3"
          style={{ color: "var(--muted)" }}
        >
          {t("notifications.settings.inApp")}
        </h3>
        <div
          className="space-y-1 rounded-lg border overflow-hidden"
          style={{ borderColor: "var(--border)" }}
        >
          <SettingToggle
            settingKey="notify_comments"
            icon="💬"
            title={t("notifications.settings.comments")}
            description={t("notifications.settings.commentsDesc")}
          />
          <SettingToggle
            settingKey="notify_replies"
            icon="↩️"
            title={t("notifications.settings.replies")}
            description={t("notifications.settings.repliesDesc")}
          />
          <SettingToggle
            settingKey="notify_mentions"
            icon="@"
            title={t("notifications.settings.mentions")}
            description={t("notifications.settings.mentionsDesc")}
          />
          <SettingToggle
            settingKey="notify_upvotes"
            icon="⬆️"
            title={t("notifications.settings.upvotes")}
            description={t("notifications.settings.upvotesDesc")}
          />
          <SettingToggle
            settingKey="notify_downvotes"
            icon="⬇️"
            title={t("notifications.settings.downvotes")}
            description={t("notifications.settings.downvotesDesc")}
          />
          <SettingToggle
            settingKey="notify_milestones"
            icon="🏆"
            title={t("notifications.settings.milestones")}
            description={t("notifications.settings.milestonesDesc")}
          />
        </div>
      </div>

      {/* Browser & Sound */}
      <div className="mb-6">
        <h3
          className="text-sm font-semibold uppercase tracking-wide mb-3"
          style={{ color: "var(--muted)" }}
        >
          {t("notifications.settings.browserSound")}
        </h3>
        <div
          className="space-y-1 rounded-lg border overflow-hidden"
          style={{ borderColor: "var(--border)" }}
        >
          <SettingToggle
            settingKey="browser_notifications"
            icon="🌐"
            title={t("notifications.settings.browser")}
            description={
              browserPermission === "denied"
                ? t("notifications.settings.browserBlocked")
                : t("notifications.settings.browserDesc")
            }
            disabled={browserPermission === "denied"}
          />
          <SettingToggle
            settingKey="sound_enabled"
            icon="🔊"
            title={t("notifications.settings.sound")}
            description={t("notifications.settings.soundDesc")}
          />
        </div>
      </div>

      {/* Email Notifications */}
      <div>
        <h3
          className="text-sm font-semibold uppercase tracking-wide mb-3"
          style={{ color: "var(--muted)" }}
        >
          {t("notifications.settings.email")}
        </h3>
        <div
          className="space-y-1 rounded-lg border overflow-hidden"
          style={{ borderColor: "var(--border)" }}
        >
          <SettingToggle
            settingKey="email_digest"
            icon="📧"
            title={t("notifications.settings.emailDigest")}
            description={t("notifications.settings.emailDigestDesc")}
          />
          
          {/* Frequency selector - only show when digest is enabled */}
          {settings.email_digest && (
            <div
              className="flex items-center justify-between p-4 rounded-lg transition-colors"
              style={{ background: "var(--card-background)" }}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">📅</span>
                <div>
                  <h4
                    className="font-medium text-sm"
                    style={{ color: "var(--foreground)" }}
                  >
                    {t("notifications.settings.digestFrequency")}
                  </h4>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    {t("notifications.settings.digestFrequencyDesc")}
                  </p>
                </div>
              </div>
              <select
                value={settings.digest_frequency}
                onChange={async (e) => {
                  const newValue = e.target.value as 'daily' | 'weekly' | 'monthly' | 'never';
                  setSettings((prev) => ({ ...prev, digest_frequency: newValue }));
                  setIsSaving(true);
                  try {
                    const res = await fetch("/api/notifications/settings", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ digest_frequency: newValue }),
                    });
                    if (!res.ok) throw new Error("Failed to save");
                    showSuccess(t("notifications.settings.saved"));
                  } catch (error) {
                    console.error("Error saving frequency:", error);
                    showError(t("notifications.settings.errorSaving"));
                  } finally {
                    setIsSaving(false);
                  }
                }}
                disabled={isSaving}
                className="px-3 py-1.5 rounded-lg text-sm border"
                style={{
                  background: "var(--background)",
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                }}
              >
                <option value="daily">{t("notifications.settings.frequencyDaily")}</option>
                <option value="weekly">{t("notifications.settings.frequencyWeekly")}</option>
                <option value="monthly">{t("notifications.settings.frequencyMonthly")}</option>
              </select>
            </div>
          )}
          
          <SettingToggle
            settingKey="email_mentions"
            icon="📩"
            title={t("notifications.settings.emailMentions")}
            description={t("notifications.settings.emailMentionsDesc")}
          />
        </div>
      </div>
    </div>
  );
}
