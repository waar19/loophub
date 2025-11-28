"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "@/components/TranslationsProvider";

interface Forum {
  id: string;
  name: string;
  slug: string;
}

interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface SearchFiltersProps {
  onClose?: () => void;
  isMobile?: boolean;
}

export default function SearchFilters({ onClose, isMobile = false }: SearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslations();

  const [forums, setForums] = useState<Forum[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Current filter values
  const currentQuery = searchParams.get("q") || "";
  const currentType = searchParams.get("type") || "all";
  const currentForum = searchParams.get("forum") || "";
  const currentDate = searchParams.get("date") || "";
  const currentSort = searchParams.get("sort") || "relevance";
  const currentTags = searchParams.get("tags")?.split(",").filter(Boolean) || [];

  useEffect(() => {
    fetchFiltersData();
  }, []);

  const fetchFiltersData = async () => {
    try {
      const [forumsRes, tagsRes] = await Promise.all([
        fetch("/api/forums"),
        fetch("/api/tags"),
      ]);

      if (forumsRes.ok) {
        const forumsData = await forumsRes.json();
        setForums(forumsData);
      }

      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        setTags(tagsData);
      }
    } catch (error) {
      console.error("Error fetching filter data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    
    // Reset page when filters change
    params.delete("page");
    
    router.push(`/search?${params.toString()}`);
    
    if (isMobile && onClose) {
      onClose();
    }
  };

  const toggleTag = (tagId: string) => {
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter(id => id !== tagId)
      : [...currentTags, tagId];
    
    updateFilters("tags", newTags.join(","));
  };

  const clearAllFilters = () => {
    const params = new URLSearchParams();
    if (currentQuery) params.set("q", currentQuery);
    router.push(`/search?${params.toString()}`);
    
    if (isMobile && onClose) {
      onClose();
    }
  };

  const hasActiveFilters = currentType !== "all" || currentForum || currentDate || currentSort !== "relevance" || currentTags.length > 0;

  return (
    <div className={`space-y-6 ${isMobile ? "p-4" : ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg" style={{ color: "var(--foreground)" }}>
          {t("search.filters")}
        </h3>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-sm font-medium hover:underline"
            style={{ color: "var(--brand)" }}
          >
            {t("search.clearAll")}
          </button>
        )}
      </div>

      {/* Content Type */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>
          {t("search.contentType")}
        </label>
        <div className="space-y-1">
          {[
            { value: "all", label: t("search.typeAll") },
            { value: "threads", label: t("search.typeThreads") },
            { value: "comments", label: t("search.typeComments") },
            { value: "forums", label: t("search.typeForums") },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => updateFilters("type", value === "all" ? "" : value)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                (currentType === value || (value === "all" && !currentType))
                  ? "font-medium"
                  : ""
              }`}
              style={{
                background: (currentType === value || (value === "all" && !currentType))
                  ? "var(--brand-light)"
                  : "transparent",
                color: (currentType === value || (value === "all" && !currentType))
                  ? "var(--brand)"
                  : "var(--muted)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Sort By */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>
          {t("search.sortBy")}
        </label>
        <select
          value={currentSort}
          onChange={(e) => updateFilters("sort", e.target.value === "relevance" ? "" : e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm border"
          style={{
            background: "var(--card-bg)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
          }}
        >
          <option value="relevance">{t("search.sortRelevance")}</option>
          <option value="newest">{t("search.sortNewest")}</option>
          <option value="oldest">{t("search.sortOldest")}</option>
          <option value="most_voted">{t("search.sortMostVoted")}</option>
        </select>
      </div>

      {/* Date Range */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>
          {t("search.dateRange")}
        </label>
        <select
          value={currentDate}
          onChange={(e) => updateFilters("date", e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm border"
          style={{
            background: "var(--card-bg)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
          }}
        >
          <option value="">{t("search.dateAll")}</option>
          <option value="today">{t("search.dateToday")}</option>
          <option value="week">{t("search.dateWeek")}</option>
          <option value="month">{t("search.dateMonth")}</option>
          <option value="year">{t("search.dateYear")}</option>
        </select>
      </div>

      {/* Forum Filter */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>
          {t("search.forum")}
        </label>
        {isLoading ? (
          <div className="h-10 rounded-lg skeleton" />
        ) : (
          <select
            value={currentForum}
            onChange={(e) => updateFilters("forum", e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm border"
            style={{
              background: "var(--card-bg)",
              borderColor: "var(--border)",
              color: "var(--foreground)",
            }}
          >
            <option value="">{t("search.allForums")}</option>
            {forums.map((forum) => (
              <option key={forum.id} value={forum.id}>
                {forum.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Tags Filter */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>
          {t("search.tags")}
        </label>
        {isLoading ? (
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-7 w-20 rounded-full skeleton" />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.slice(0, 10).map((tag) => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  currentTags.includes(tag.id) ? "ring-2 ring-offset-1" : ""
                }`}
                style={{
                  background: currentTags.includes(tag.id) ? tag.color : `${tag.color}20`,
                  color: currentTags.includes(tag.id) ? "white" : tag.color,
                  ...(currentTags.includes(tag.id) && { '--tw-ring-color': tag.color } as React.CSSProperties),
                }}
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div
          className="p-3 rounded-lg border"
          style={{
            background: "var(--brand-light)",
            borderColor: "var(--brand)",
          }}
        >
          <p className="text-xs font-medium mb-2" style={{ color: "var(--brand)" }}>
            {t("search.activeFilters")}:
          </p>
          <div className="flex flex-wrap gap-1">
            {currentType !== "all" && (
              <span className="px-2 py-0.5 rounded text-xs bg-white/50">
                {currentType}
              </span>
            )}
            {currentSort !== "relevance" && (
              <span className="px-2 py-0.5 rounded text-xs bg-white/50">
                {currentSort}
              </span>
            )}
            {currentDate && (
              <span className="px-2 py-0.5 rounded text-xs bg-white/50">
                {currentDate}
              </span>
            )}
            {currentForum && (
              <span className="px-2 py-0.5 rounded text-xs bg-white/50">
                {forums.find(f => f.id === currentForum)?.name || "Forum"}
              </span>
            )}
            {currentTags.map(tagId => {
              const tag = tags.find(t => t.id === tagId);
              return tag ? (
                <span key={tagId} className="px-2 py-0.5 rounded text-xs bg-white/50">
                  {tag.name}
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
