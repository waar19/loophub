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
  theme_color?: string | null;
  visibility: "public" | "private" | "invite_only";
  member_count: number;
  new_members?: number;
  trending_score?: number;
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
  const [trendingCommunities, setTrendingCommunities] = useState<Community[]>(
    []
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTrendingLoading, setIsTrendingLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const currentCategory = searchParams.get("category") || "";
  const currentSort = searchParams.get("sort") || "popular";
  const showMy = searchParams.get("my") === "true";
  const currentSearch = searchParams.get("q") || "";

  const canCreateCommunity = profile?.is_admin || (profile?.level || 0) >= 3;

  useEffect(() => {
    fetchCategories();
    fetchTrendingCommunities();
  }, []);

  useEffect(() => {
    fetchCommunities();
  }, [currentCategory, currentSort, showMy, currentSearch]);

  useEffect(() => {
    setSearchQuery(currentSearch);
  }, [currentSearch]);

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

  const fetchTrendingCommunities = async () => {
    setIsTrendingLoading(true);
    try {
      const res = await fetch("/api/communities/trending?limit=6&period=week");
      if (res.ok) {
        const data = await res.json();
        setTrendingCommunities(data.communities || []);
      }
    } catch (error) {
      console.error("Error fetching trending:", error);
    } finally {
      setIsTrendingLoading(false);
    }
  };

  const fetchCommunities = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentCategory) params.set("category", currentCategory);
      if (currentSort) params.set("sort", currentSort);
      if (showMy) params.set("my", "true");
      if (currentSearch) params.set("q", currentSearch);

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter("q", searchQuery);
  };

  const clearSearch = () => {
    setSearchQuery("");
    updateFilter("q", "");
  };

  // Show trending section when no filters applied
  const showTrendingSection = !currentCategory && !showMy && !currentSearch;

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
          <h1
            className="text-3xl font-bold"
            style={{ color: "var(--foreground)" }}
          >
            {t("communities.title")}
          </h1>
          <p className="mt-1" style={{ color: "var(--muted)" }}>
            {t("communities.subtitle")}
          </p>
        </div>

        {canCreateCommunity && (
          <Link
            href="/communities/new"
            className="btn btn-primary inline-flex items-center gap-2"
          >
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            {t("communities.create")}
          </Link>
        )}
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("communities.searchPlaceholder")}
          className="w-full px-4 py-3 pl-12 rounded-xl border text-base"
          style={{
            background: "var(--card-bg)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
          }}
        />
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          style={{ color: "var(--muted)" }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {searchQuery && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
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
        )}
      </form>

      {/* Trending Section */}
      {showTrendingSection &&
        !isTrendingLoading &&
        trendingCommunities.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🔥</span>
              <h2
                className="text-xl font-bold"
                style={{ color: "var(--foreground)" }}
              >
                {t("communities.trending")}
              </h2>
              <span
                className="text-sm px-2 py-0.5 rounded-full"
                style={{ background: "var(--accent)", color: "white" }}
              >
                {t("communities.trendingSubtitle")}
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {trendingCommunities.slice(0, 6).map((community) => (
                <Link
                  key={community.id}
                  href={`/c/${community.slug}`}
                  className="card flex items-center gap-4 p-4 hover:shadow-lg transition-all hover:-translate-y-0.5"
                >
                  {community.image_url ? (
                    <img
                      src={community.image_url}
                      alt={community.name}
                      className="w-14 h-14 rounded-xl object-cover shrink-0"
                    />
                  ) : (
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl shrink-0"
                      style={{
                        background: community.theme_color || "var(--accent)",
                      }}
                    >
                      {community.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3
                      className="font-semibold truncate"
                      style={{ color: "var(--foreground)" }}
                    >
                      {community.name}
                    </h3>
                    <p
                      className="text-sm truncate"
                      style={{ color: "var(--muted)" }}
                    >
                      {community.member_count} {t("communities.members")}
                      {community.new_members && community.new_members > 0 && (
                        <span className="ml-2 text-green-500">
                          +{community.new_members} nuevo
                          {community.new_members > 1 ? "s" : ""}
                        </span>
                      )}
                    </p>
                    {community.category && (
                      <span
                        className="text-xs"
                        style={{ color: "var(--muted)" }}
                      >
                        {community.category.icon} {community.category.name}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

      {/* Categories Quick Access */}
      {showTrendingSection && categories.length > 0 && (
        <section className="mb-8">
          <h2
            className="text-lg font-semibold mb-3"
            style={{ color: "var(--foreground)" }}
          >
            {t("communities.exploreByCategory")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => updateFilter("category", cat.slug)}
                className="px-4 py-2 rounded-full text-sm font-medium border hover:border-[var(--accent)] transition-colors"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                  background: "var(--card-bg)",
                }}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* My Communities Toggle */}
        {user && (
          <button
            onClick={() => updateFilter("my", showMy ? "" : "true")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              showMy ? "bg-[var(--accent)] text-white" : "border"
            }`}
            style={
              !showMy
                ? { borderColor: "var(--border)", color: "var(--foreground)" }
                : {}
            }
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
          <option value="alphabetical">
            {t("communities.sortAlphabetical")}
          </option>
        </select>

        {/* Active filters */}
        {(currentCategory || currentSearch) && (
          <button
            onClick={() => {
              router.push("/communities");
              setSearchQuery("");
            }}
            className="text-sm flex items-center gap-1 px-3 py-1 rounded-full"
            style={{
              color: "var(--accent)",
              background: "rgba(99, 102, 241, 0.1)",
            }}
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
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Results count */}
      {!isLoading && (
        <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
          {currentSearch && (
            <span>Buscando &quot;{currentSearch}&quot; — </span>
          )}
          {total}{" "}
          {total === 1
            ? t("communities.communityFound")
            : t("communities.communitiesFound")}
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
          <p
            className="font-medium mb-2"
            style={{ color: "var(--foreground)" }}
          >
            {currentSearch
              ? t("communities.noResults")
              : showMy
              ? t("communities.noMyCommunities")
              : t("communities.noCommunities")}
          </p>
          {currentSearch && (
            <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
              {t("communities.tryDifferentSearch")}
            </p>
          )}
          {canCreateCommunity && !showMy && !currentSearch && (
            <Link
              href="/communities/new"
              className="btn btn-primary inline-block mt-4"
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
