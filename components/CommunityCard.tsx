"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "@/components/TranslationsProvider";

interface Community {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  visibility: "public" | "private" | "invite_only";
  member_count: number;
  category?: {
    id: string;
    name: string;
    slug: string;
    icon: string;
  };
  creator?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

interface CommunityCardProps {
  community: Community;
}

export default function CommunityCard({ community }: CommunityCardProps) {
  const { t } = useTranslations();

  const getVisibilityBadge = () => {
    switch (community.visibility) {
      case "private":
        return (
          <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-400">
            🔒 {t("communities.private")}
          </span>
        );
      case "invite_only":
        return (
          <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-400">
            ✉️ {t("communities.inviteOnly")}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <Link
      href={`/c/${community.slug}`}
      className="card group block hover:border-[var(--accent)] transition-all"
    >
      {/* Header with image */}
      <div className="flex items-start gap-4">
        {/* Community Avatar */}
        <div 
          className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl font-bold overflow-hidden"
          style={{ 
            background: community.image_url ? 'transparent' : 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
            color: 'white'
          }}
        >
          {community.image_url ? (
            <Image
              src={community.image_url}
              alt={community.name}
              width={56}
              height={56}
              className="w-full h-full object-cover"
            />
          ) : (
            community.name.charAt(0).toUpperCase()
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 
              className="font-semibold text-lg group-hover:text-[var(--accent)] transition-colors truncate"
              style={{ color: "var(--foreground)" }}
            >
              {community.name}
            </h3>
            {getVisibilityBadge()}
          </div>

          {community.description && (
            <p 
              className="text-sm mt-1 line-clamp-2"
              style={{ color: "var(--muted)" }}
            >
              {community.description}
            </p>
          )}

          {/* Meta info */}
          <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: "var(--muted)" }}>
            {community.category && (
              <span className="flex items-center gap-1">
                <span>{community.category.icon}</span>
                <span>{community.category.name}</span>
              </span>
            )}
            <span>•</span>
            <span>
              {community.member_count} {community.member_count === 1 ? t("communities.member") : t("communities.members")}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
