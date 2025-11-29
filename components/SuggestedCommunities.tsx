"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "@/components/TranslationsProvider";

interface Community {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  theme_color: string | null;
  member_count: number;
  category?: {
    name: string;
    icon: string;
  };
}

interface SuggestedCommunitiesProps {
  maxItems?: number;
  excludeIds?: string[];
  className?: string;
}

export default function SuggestedCommunities({
  maxItems = 5,
  excludeIds = [],
  className = "",
}: SuggestedCommunitiesProps) {
  const { t } = useTranslations();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSuggestedCommunities = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        suggested: "true",
        limit: maxItems.toString(),
        sort: "popular",
      });

      if (excludeIds.length > 0) {
        params.set("exclude", excludeIds.join(","));
      }

      const res = await fetch(`/api/communities?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCommunities(data.communities || []);
      }
    } catch (error) {
      console.error("Error fetching suggested communities:", error);
    } finally {
      setIsLoading(false);
    }
  }, [maxItems, excludeIds]);

  useEffect(() => {
    fetchSuggestedCommunities();
  }, [fetchSuggestedCommunities]);

  if (isLoading) {
    return (
      <div className={`card ${className}`}>
        <h3 className="font-semibold mb-4" style={{ color: "var(--foreground)" }}>
          {t("communities.suggested")}
        </h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
                <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (communities.length === 0) {
    return null;
  }

  return (
    <div className={`card ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold" style={{ color: "var(--foreground)" }}>
          {t("communities.suggested")}
        </h3>
        <Link
          href="/communities"
          className="text-sm hover:underline"
          style={{ color: "var(--accent)" }}
        >
          {t("common.viewAll")}
        </Link>
      </div>

      <div className="space-y-3">
        {communities.map((community) => (
          <Link
            key={community.id}
            href={`/c/${community.slug}`}
            className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {/* Avatar */}
            {community.image_url ? (
              <img
                src={community.image_url}
                alt={community.name}
                className="w-10 h-10 rounded-lg object-cover"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                style={{
                  background: community.theme_color || "var(--accent)",
                }}
              >
                {community.name.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p
                className="font-medium text-sm truncate"
                style={{ color: "var(--foreground)" }}
              >
                {community.name}
              </p>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                {community.member_count} {community.member_count === 1 ? t("communities.member") : t("communities.members")}
                {community.category && (
                  <span className="ml-1">
                    • {community.category.icon}
                  </span>
                )}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
