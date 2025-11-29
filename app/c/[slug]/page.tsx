"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { useTranslations } from "@/components/TranslationsProvider";
import { useToast } from "@/contexts/ToastContext";
import Breadcrumbs from "@/components/Breadcrumbs";
import ThreadCard from "@/components/ThreadCard";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { Thread } from "@/lib/supabase";

interface Community {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  rules: string | null;
  image_url: string | null;
  banner_url: string | null;
  visibility: "public" | "private" | "invite_only";
  member_limit: number | null;
  created_by: string;
  created_at: string;
  member_count: number;
  thread_count: number;
  membership: { role: string; joined_at: string } | null;
  pending_request: { status: string; created_at: string } | null;
  category?: { id: string; name: string; slug: string; icon: string };
  creator?: { id: string; username: string; avatar_url: string | null };
  moderators: Array<{
    role: string;
    user: { id: string; username: string; avatar_url: string | null };
  }>;
  // Theme customization
  theme_color?: string | null;
  accent_color?: string | null;
  text_color?: string | null;
  custom_css?: string | null;
}

interface CommunityThread {
  id: string;
  forum_id: string;
  title: string;
  content: string;
  created_at: string;
  like_count: number;
  upvote_count: number;
  downvote_count: number;
  is_pinned?: boolean;
  profile?: { username: string; avatar_url?: string | null };
  forum?: { name: string; slug: string };
  _count?: { comments: number };
}

export default function CommunityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslations();
  const { showSuccess, showError } = useToast();

  const [community, setCommunity] = useState<Community | null>(null);
  const [threads, setThreads] = useState<CommunityThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    fetchCommunity();
  }, [slug]);

  const fetchCommunity = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/communities/${slug}`);
      if (!res.ok) {
        if (res.status === 404) {
          router.push("/communities");
          return;
        }
        throw new Error("Failed to fetch community");
      }
      const data = await res.json();
      setCommunity(data);

      // Fetch threads for this community
      const threadsRes = await fetch(`/api/communities/${slug}/threads`);
      if (threadsRes.ok) {
        const threadsData = await threadsRes.json();
        setThreads(threadsData.threads || []);
      }
    } catch (error) {
      console.error("Error fetching community:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    setIsJoining(true);
    try {
      const res = await fetch(`/api/communities/${slug}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data.error || t("common.error"));
        return;
      }

      if (data.status === "joined") {
        showSuccess(t("communities.joined"));
        fetchCommunity();
      } else if (data.status === "requested") {
        showSuccess(t("communities.requestSent"));
        fetchCommunity();
      }
    } catch (error) {
      console.error("Error joining community:", error);
      showError(t("common.error"));
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm(t("communities.confirmLeave"))) return;

    setIsJoining(true);
    try {
      const res = await fetch(`/api/communities/${slug}/join`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        showError(data.error || t("common.error"));
        return;
      }

      showSuccess(t("communities.left"));
      fetchCommunity();
    } catch (error) {
      console.error("Error leaving community:", error);
      showError(t("common.error"));
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <LoadingSkeleton />
        <div className="mt-6 space-y-4">
          <LoadingSkeleton />
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 text-center">
        <p style={{ color: "var(--muted)" }}>{t("communities.notFound")}</p>
      </div>
    );
  }

  const isOwner = community.membership?.role === "owner";
  const isMod = community.membership?.role === "moderator";
  const isMember = !!community.membership;

  // Custom theme styles
  const themeStyles = {
    '--community-theme': community.theme_color || 'var(--brand)',
    '--community-accent': community.accent_color || 'var(--accent)',
    '--community-text': community.text_color || 'var(--foreground)',
  } as React.CSSProperties;

  return (
    <div 
      className="community-page max-w-6xl mx-auto px-4 py-8"
      style={themeStyles}
    >
      {/* Custom CSS */}
      {community.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: community.custom_css }} />
      )}

      <Breadcrumbs
        items={[
          { label: t("common.home"), href: "/" },
          { label: t("communities.title"), href: "/communities" },
          { label: community.name },
        ]}
      />

      {/* Banner */}
      <div 
        className="relative h-48 rounded-xl overflow-hidden mb-6"
        style={{ 
          background: community.banner_url 
            ? 'transparent' 
            : `linear-gradient(135deg, ${community.theme_color || 'var(--brand)'}, ${community.accent_color || 'var(--accent)'})`
        }}
      >
        {community.banner_url && (
          <Image
            src={community.banner_url}
            alt={community.name}
            fill
            className="object-cover"
          />
        )}
      </div>

      {/* Header */}
      <div className="card mb-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div
            className="w-20 h-20 rounded-xl shrink-0 flex items-center justify-center text-3xl font-bold overflow-hidden"
            style={{
              background: community.image_url
                ? "transparent"
                : `linear-gradient(135deg, ${community.theme_color || 'var(--brand)'}, ${community.accent_color || 'var(--accent)'})`,
              color: "white",
            }}
          >
            {community.image_url ? (
              <Image
                src={community.image_url}
                alt={community.name}
                width={80}
                height={80}
                className="w-full h-full object-cover"
              />
            ) : (
              community.name.charAt(0).toUpperCase()
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold" style={{ color: community.text_color || "var(--foreground)" }}>
                {community.name}
              </h1>
              {community.visibility !== "public" && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-400">
                  {community.visibility === "private" ? "🔒" : "✉️"}{" "}
                  {t(`communities.${community.visibility === "private" ? "private" : "inviteOnly"}`)}
                </span>
              )}
            </div>

            {community.description && (
              <p className="mt-2" style={{ color: "var(--muted)" }}>
                {community.description}
              </p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 mt-3 text-sm" style={{ color: "var(--muted)" }}>
              {community.category && (
                <span className="flex items-center gap-1">
                  <span>{community.category.icon}</span>
                  <span>{community.category.name}</span>
                </span>
              )}
              <span>
                {community.member_count} {t("communities.members")}
              </span>
              <span>
                {community.thread_count} {t("communities.threads")}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {isMember ? (
              <>
                {isOwner && (
                  <Link
                    href={`/c/${slug}/settings`}
                    className="px-4 py-2 rounded-lg border text-sm font-medium"
                    style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                  >
                    ⚙️ {t("settings.title")}
                  </Link>
                )}
                {!isOwner && (
                  <button
                    onClick={handleLeave}
                    disabled={isJoining}
                    className="px-4 py-2 rounded-lg border text-sm font-medium text-red-500 hover:bg-red-500/10"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {isJoining ? "..." : t("communities.leave")}
                  </button>
                )}
              </>
            ) : community.pending_request ? (
              <span className="px-4 py-2 rounded-lg text-sm" style={{ color: "var(--muted)" }}>
                ⏳ {t("communities.requestPending")}
              </span>
            ) : (
              <button
                onClick={handleJoin}
                disabled={isJoining}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ background: community.theme_color || 'var(--brand)' }}
              >
                {isJoining ? "..." : t("communities.join")}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Create Thread CTA */}
          {isMember && (
            <Link
              href={`/c/${slug}/new`}
              className="card flex items-center gap-3 hover:border-[var(--accent)]"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "var(--accent)", color: "white" }}
              >
                +
              </div>
              <span style={{ color: "var(--muted)" }}>{t("communities.createThread")}</span>
            </Link>
          )}

          {/* Threads */}
          {threads.length === 0 ? (
            <div className="card text-center py-8">
              <p style={{ color: "var(--muted)" }}>{t("communities.noThreads")}</p>
            </div>
          ) : (
            threads.map((thread) => (
              <ThreadCard 
                key={thread.id} 
                thread={thread as Thread & { forum?: { name: string; slug: string }; is_pinned?: boolean }} 
                forumSlug={thread.forum?.slug || "general"} 
              />
            ))
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Rules */}
          {community.rules && (
            <div className="card">
              <button
                onClick={() => setShowRules(!showRules)}
                className="flex items-center justify-between w-full font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                📜 {t("communities.rules")}
                <span>{showRules ? "▲" : "▼"}</span>
              </button>
              {showRules && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                  <MarkdownRenderer content={community.rules} />
                </div>
              )}
            </div>
          )}

          {/* Moderators */}
          <div className="card">
            <h3 className="font-semibold mb-3" style={{ color: "var(--foreground)" }}>
              👥 {t("communities.moderators")}
            </h3>
            <div className="space-y-2">
              {community.moderators.map((mod) => (
                <Link
                  key={mod.user.id}
                  href={`/u/${mod.user.username}`}
                  className="flex items-center gap-2 text-sm hover:underline"
                  style={{ color: "var(--foreground)" }}
                >
                  {mod.user.avatar_url ? (
                    <Image
                      src={mod.user.avatar_url}
                      alt={mod.user.username}
                      width={24}
                      height={24}
                      className="rounded-full"
                    />
                  ) : (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                      style={{ background: "var(--accent)", color: "white" }}
                    >
                      {mod.user.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span>{mod.user.username}</span>
                  {mod.role === "owner" && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-500">
                      {t("communities.owner")}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Community Info */}
          <div className="card">
            <h3 className="font-semibold mb-3" style={{ color: "var(--foreground)" }}>
              ℹ️ {t("communities.about")}
            </h3>
            <div className="space-y-2 text-sm" style={{ color: "var(--muted)" }}>
              <p>
                {t("communities.createdOn")}{" "}
                {new Date(community.created_at).toLocaleDateString()}
              </p>
              {community.member_limit && (
                <p>
                  {t("communities.memberLimit")}: {community.member_count}/{community.member_limit}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
