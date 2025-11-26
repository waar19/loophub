"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";
import { useTranslations } from "@/components/TranslationsProvider";
import KarmaProgress from "@/components/KarmaProgress";

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const { t } = useTranslations();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    bio: "",
    website: "",
    location: "",
  });

  useEffect(() => {
    // Wait for auth to load
    if (authLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    // Load current profile data
    const loadProfile = async () => {
      try {
        const res = await fetch(`/api/profile/${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setFormData({
            username: data.username || "",
            bio: data.bio || "",
            website: data.website || "",
            location: data.location || "",
          });
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        showToast(t("settings.errorLoad"), "error");
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user, authLoading, router, showToast, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        showToast(t("settings.updated"), "success");
      } else {
        const data = await res.json();
        showToast(data.error || t("settings.errorUpdate"), "error");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      showToast(t("settings.errorUpdate"), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (isLoading) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <div className="card">
          <div className="skeleton h-8 w-48 mb-6" />
          <div className="space-y-4">
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-32 w-full" />
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto py-4 sm:py-8 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Main Settings Form */}
        <div className="lg:col-span-2 order-2 lg:order-1">
          <div className="card">
            <h1
              className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6"
              style={{ color: "var(--foreground)" }}
            >
              {t("settings.title")}
            </h1>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Username (Read-only) */}
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--foreground)" }}
            >
              {t("settings.username")}
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              disabled
              className="input w-full opacity-60 cursor-not-allowed"
              style={{
                background: "var(--card-background)",
                borderColor: "var(--border)",
                color: "var(--muted)",
              }}
            />
            <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
              {t("settings.usernameReadonly")}
            </p>
          </div>

          {/* Bio */}
          <div>
            <label
              htmlFor="bio"
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--foreground)" }}
            >
              {t("settings.bio")}
            </label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={4}
              maxLength={500}
              placeholder={t("settings.bioPlaceholder")}
              className="input w-full"
              style={{
                background: "var(--card-background)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
            />
            <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
              {formData.bio.length}/500 {t("settings.bioCount")}
            </p>
          </div>

          {/* Website */}
          <div>
            <label
              htmlFor="website"
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--foreground)" }}
            >
              {t("settings.website")}
            </label>
            <input
              type="url"
              id="website"
              name="website"
              value={formData.website}
              onChange={handleChange}
              placeholder={t("settings.websitePlaceholder")}
              className="input w-full"
              style={{
                background: "var(--card-background)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
            />
          </div>

          {/* Location */}
          <div>
            <label
              htmlFor="location"
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--foreground)" }}
            >
              {t("settings.location")}
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder={t("settings.locationPlaceholder")}
              maxLength={100}
              className="input w-full"
              style={{
                background: "var(--card-background)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary flex-1"
              style={{
                background: isSaving ? "var(--muted)" : "var(--brand)",
                color: "white",
                opacity: isSaving ? 0.6 : 1,
              }}
            >
              {isSaving ? t("settings.saving") : t("settings.save")}
            </button>

            <button
              type="button"
              onClick={() => router.back()}
              className="btn"
              style={{
                background: "var(--card-background)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
            >
              {t("settings.cancel")}
            </button>
          </div>
        </form>

        {/* Additional Info */}
        <div
          className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <h2
            className="text-base sm:text-lg font-semibold mb-2 sm:mb-3"
            style={{ color: "var(--foreground)" }}
          >
            {t("settings.additionalInfo")}
          </h2>
          <div className="space-y-2 text-xs sm:text-sm" style={{ color: "var(--muted)" }}>
            <p>• {t("settings.reputationInfo")}</p>
            <p>
              • {t("settings.profilePublic")}{" "}
              <code
                className="px-1 py-0.5 rounded text-xs"
                style={{
                  background: "var(--brand-light)",
                  color: "var(--brand-dark)",
                }}
              >
                /u/{formData.username}
              </code>
            </p>
          </div>
        </div>
          </div>
        </div>

        {/* Karma Progress Sidebar */}
        <div className="lg:col-span-1 order-1 lg:order-2">
          <div className="lg:sticky lg:top-4">
            <KarmaProgress />
          </div>
        </div>
      </div>
    </div>
  );
}
