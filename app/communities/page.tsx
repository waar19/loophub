"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useTranslations } from "@/components/TranslationsProvider";
import CommunityCard from "@/components/CommunityCard";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import Breadcrumbs from "@/components/Breadcrumbs";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

interface Community {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  visibility: "public" | "private" | "invite_only";
  member_count: number;
  category?: Category;
  creator?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

export default function CommunitiesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile } = useAuth();
  const { t } = useTranslations();

  const [communities, setCommunities] = useState<Community[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const currentCategory = searchParams.get("category") || "";
  const currentSort = searchParams.get("sort") || "popular";
  const showMy = searchParams.get("my") === "true";

  const canCreateCommunity = profile?.is_admin || (profile?.level || 0) >= 3;

  useEffect(() => {
    fetchCategories();
    fetchCommunities();
  }, [currentCategory, currentSort, showMy]);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/communities/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchCommunities = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentCategory) params.set("category", currentCategory);
      if (currentSort) params.set("sort", currentSort);
      if (showMy) params.set("my", "true");

      const res = await fetch(`/api/communities?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCommunities(data.communities || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error("Error fetching communities:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/communities?${params}`);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: t("common.home"), href: "/" },
          { label: t("communities.title") },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "var(--foreground)" }}>
            {t("communities.title")}
          </h1>
          <p className="mt-1" style={{ color: "var(--muted)" }}>
            {t("communities.subtitle")}
          </p>
        </div>

        {canCreateCommunity && (
          <Link
            href="/communities/new"
            className="btn-primary inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t("communities.create")}
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* My Communities Toggle */}
        {user && (
          <button
            onClick={() => updateFilter("my", showMy ? "" : "true")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              showMy 
                ? "bg-[var(--accent)] text-white" 
                : "border"
            }`}
            style={!showMy ? { borderColor: "var(--border)", color: "var(--foreground)" } : {}}
          >
            {t("communities.myCommunities")}
          </button>
        )}

        {/* Category Filter */}
        <select
          value={currentCategory}
          onChange={(e) => updateFilter("category", e.target.value)}
          className="px-4 py-2 rounded-lg text-sm border"
          style={{
            background: "var(--card-bg)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
          }}
        >
          <option value="">{t("communities.allCategories")}</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.slug}>
              {cat.icon} {cat.name}
            </option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={currentSort}
          onChange={(e) => updateFilter("sort", e.target.value)}
          className="px-4 py-2 rounded-lg text-sm border"
          style={{
            background: "var(--card-bg)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
          }}
        >
          <option value="popular">{t("communities.sortPopular")}</option>
          <option value="newest">{t("communities.sortNewest")}</option>
          <option value="alphabetical">{t("communities.sortAlphabetical")}</option>
        </select>
      </div>

      {/* Results count */}
      {!isLoading && (
        <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
          {total} {total === 1 ? t("communities.communityFound") : t("communities.communitiesFound")}
        </p>
      )}

      {/* Communities Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <LoadingSkeleton key={i} />
          ))}
        </div>
      ) : communities.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-4">🏘️</div>
          <p style={{ color: "var(--muted)" }}>
            {showMy ? t("communities.noMyCommunities") : t("communities.noCommunities")}
          </p>
          {canCreateCommunity && !showMy && (
            <Link
              href="/communities/new"
              className="btn-primary inline-block mt-4"
            >
              {t("communities.createFirst")}
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {communities.map((community) => (
            <CommunityCard key={community.id} community={community} />
          ))}
        </div>
      )}

      {/* Info for non-eligible users */}
      {!canCreateCommunity && user && (
        <div 
          className="mt-8 p-4 rounded-lg border text-center"
          style={{ borderColor: "var(--border)", background: "var(--card-bg)" }}
        >
          <p style={{ color: "var(--muted)" }}>
            {t("communities.levelRequired")}
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            {t("communities.currentLevel")}: {profile?.level || 0}
          </p>
        </div>
      )}
    </div>
  );
}
