"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useTranslations } from "@/components/TranslationsProvider";
import { useToast } from "@/contexts/ToastContext";
import Breadcrumbs from "@/components/Breadcrumbs";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

export default function CreateCommunityPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const { t } = useTranslations();
  const { showSuccess, showError } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [visibility, setVisibility] = useState<
    "public" | "private" | "invite_only"
  >("public");
  const [memberLimit, setMemberLimit] = useState("");
  const [rules, setRules] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const canCreateCommunity = profile?.is_admin || (profile?.level || 0) >= 3;

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (!canCreateCommunity) {
      router.push("/communities");
      return;
    }

    fetchCategories();
  }, [user, canCreateCommunity, router, authLoading, profile]);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/communities/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
        if (data.categories?.length > 0) {
          setCategoryId(data.categories[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = t("communities.nameRequired");
    } else if (name.trim().length < 3) {
      newErrors.name = t("communities.nameTooShort");
    }

    if (memberLimit && parseInt(memberLimit) < 1) {
      newErrors.memberLimit = "El límite debe ser mayor a 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch("/api/communities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          category_id: categoryId || null,
          visibility,
          member_limit: memberLimit ? parseInt(memberLimit) : null,
          rules: rules.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data.error || t("common.error"));
        return;
      }

      showSuccess(t("communities.created"));
      router.push(`/c/${data.community.slug}`);
    } catch (error) {
      console.error("Error creating community:", error);
      showError(t("common.error"));
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (!canCreateCommunity) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: t("common.home"), href: "/" },
          { label: t("communities.title"), href: "/communities" },
          { label: t("communities.create") },
        ]}
      />

      <div className="mb-8">
        <h1
          className="text-3xl font-bold"
          style={{ color: "var(--foreground)" }}
        >
          {t("communities.create")}
        </h1>
        <p className="mt-2" style={{ color: "var(--muted)" }}>
          Crea tu propia comunidad y construye un espacio para tu audiencia
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card">
        {/* Name */}
        <div className="mb-6">
          <label
            className="block font-medium mb-2"
            style={{ color: "var(--foreground)" }}
          >
            {t("communities.name")} *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("communities.namePlaceholder")}
            className="w-full px-4 py-3 rounded-lg border"
            style={{
              background: "var(--background)",
              borderColor: errors.name ? "var(--error)" : "var(--border)",
              color: "var(--foreground)",
            }}
            maxLength={100}
          />
          {errors.name && (
            <p className="text-sm mt-1" style={{ color: "var(--error)" }}>
              {errors.name}
            </p>
          )}
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            {name.length}/100 caracteres
          </p>
        </div>

        {/* Description */}
        <div className="mb-6">
          <label
            className="block font-medium mb-2"
            style={{ color: "var(--foreground)" }}
          >
            {t("communities.description")}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("communities.descriptionPlaceholder")}
            className="w-full px-4 py-3 rounded-lg border resize-none"
            style={{
              background: "var(--background)",
              borderColor: "var(--border)",
              color: "var(--foreground)",
            }}
            rows={3}
            maxLength={500}
          />
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            {description.length}/500 caracteres
          </p>
        </div>

        {/* Category */}
        <div className="mb-6">
          <label
            className="block font-medium mb-2"
            style={{ color: "var(--foreground)" }}
          >
            {t("communities.category")}
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border"
            style={{
              background: "var(--background)",
              borderColor: "var(--border)",
              color: "var(--foreground)",
            }}
          >
            <option value="">{t("communities.selectCategory")}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Visibility */}
        <div className="mb-6">
          <label
            className="block font-medium mb-2"
            style={{ color: "var(--foreground)" }}
          >
            {t("communities.visibility")}
          </label>
          <div className="space-y-3">
            {/* Public */}
            <label
              className="flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors hover:border-[var(--accent)]"
              style={{
                borderColor:
                  visibility === "public" ? "var(--accent)" : "var(--border)",
                background:
                  visibility === "public"
                    ? "rgba(99, 102, 241, 0.05)"
                    : "transparent",
              }}
            >
              <input
                type="radio"
                name="visibility"
                value="public"
                checked={visibility === "public"}
                onChange={(e) => setVisibility(e.target.value as "public")}
                className="mt-1"
              />
              <div className="flex-1">
                <div
                  className="font-medium"
                  style={{ color: "var(--foreground)" }}
                >
                  🌍 {t("communities.public")}
                </div>
                <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                  {t("communities.publicDesc")}
                </p>
              </div>
            </label>

            {/* Private */}
            <label
              className="flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors hover:border-[var(--accent)]"
              style={{
                borderColor:
                  visibility === "private" ? "var(--accent)" : "var(--border)",
                background:
                  visibility === "private"
                    ? "rgba(99, 102, 241, 0.05)"
                    : "transparent",
              }}
            >
              <input
                type="radio"
                name="visibility"
                value="private"
                checked={visibility === "private"}
                onChange={(e) => setVisibility(e.target.value as "private")}
                className="mt-1"
              />
              <div className="flex-1">
                <div
                  className="font-medium"
                  style={{ color: "var(--foreground)" }}
                >
                  🔒 {t("communities.private")}
                </div>
                <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                  {t("communities.privateDesc")}
                </p>
              </div>
            </label>

            {/* Invite Only */}
            <label
              className="flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors hover:border-[var(--accent)]"
              style={{
                borderColor:
                  visibility === "invite_only"
                    ? "var(--accent)"
                    : "var(--border)",
                background:
                  visibility === "invite_only"
                    ? "rgba(99, 102, 241, 0.05)"
                    : "transparent",
              }}
            >
              <input
                type="radio"
                name="visibility"
                value="invite_only"
                checked={visibility === "invite_only"}
                onChange={(e) => setVisibility(e.target.value as "invite_only")}
                className="mt-1"
              />
              <div className="flex-1">
                <div
                  className="font-medium"
                  style={{ color: "var(--foreground)" }}
                >
                  ✉️ {t("communities.inviteOnly")}
                </div>
                <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                  {t("communities.inviteOnlyDesc")}
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Member Limit */}
        <div className="mb-6">
          <label
            className="block font-medium mb-2"
            style={{ color: "var(--foreground)" }}
          >
            {t("communities.memberLimit")}
          </label>
          <input
            type="number"
            value={memberLimit}
            onChange={(e) => setMemberLimit(e.target.value)}
            placeholder={t("communities.memberLimitPlaceholder")}
            className="w-full px-4 py-3 rounded-lg border"
            style={{
              background: "var(--background)",
              borderColor: errors.memberLimit
                ? "var(--error)"
                : "var(--border)",
              color: "var(--foreground)",
            }}
            min="1"
          />
          {errors.memberLimit && (
            <p className="text-sm mt-1" style={{ color: "var(--error)" }}>
              {errors.memberLimit}
            </p>
          )}
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            {t("communities.memberLimitHint")}
          </p>
        </div>

        {/* Rules */}
        <div className="mb-6">
          <label
            className="block font-medium mb-2"
            style={{ color: "var(--foreground)" }}
          >
            {t("communities.rules")}
          </label>
          <textarea
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            placeholder={t("communities.rulesPlaceholder")}
            className="w-full px-4 py-3 rounded-lg border resize-none font-mono text-sm"
            style={{
              background: "var(--background)",
              borderColor: "var(--border)",
              color: "var(--foreground)",
            }}
            rows={6}
          />
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Markdown soportado. Podrás editar las reglas después de crear la
            comunidad.
          </p>
        </div>

        {/* Actions */}
        <div
          className="flex items-center gap-3 pt-4 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            type="submit"
            disabled={isCreating}
            className="btn btn-primary flex-1 sm:flex-none"
          >
            {isCreating ? t("common.creating") : t("communities.createButton")}
          </button>
          <Link
            href="/communities"
            className="px-6 py-2 rounded-lg border text-center"
            style={{
              borderColor: "var(--border)",
              color: "var(--foreground)",
            }}
          >
            {t("common.cancel")}
          </Link>
        </div>
      </form>

      {/* Info Card */}
      <div
        className="mt-6 p-4 rounded-lg border"
        style={{
          borderColor: "var(--border)",
          background: "var(--card-bg)",
        }}
      >
        <h3
          className="font-semibold mb-2"
          style={{ color: "var(--foreground)" }}
        >
          💡 Consejos para crear una comunidad exitosa
        </h3>
        <ul className="space-y-2 text-sm" style={{ color: "var(--muted)" }}>
          <li>• Elige un nombre claro y descriptivo</li>
          <li>• Define reglas claras desde el principio</li>
          <li>• Personaliza el diseño después de crear la comunidad</li>
          <li>• Invita a moderadores para ayudarte a gestionar</li>
          <li>• Puedes cambiar la visibilidad más tarde en configuración</li>
        </ul>
      </div>
    </div>
  );
}
