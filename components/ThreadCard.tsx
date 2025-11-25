"use client";

import Link from "next/link";
import { Thread } from "@/lib/supabase";
import { useTranslations } from "@/components/TranslationsProvider";
import Tooltip from "./Tooltip";

interface ThreadCardProps {
  thread: Thread & {
    forum?: {
      name: string;
      slug: string;
    };
  };
  forumSlug: string;
  featured?: boolean;
}

export default function ThreadCard({
  thread,
  forumSlug,
  featured = false,
}: ThreadCardProps) {
  const { t } = useTranslations();
  const date = new Date(thread.created_at).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  // Extract preview from content (remove markdown)
  const preview =
    thread.content
      .replace(/[#*`_~\[\]()]/g, "")
      .replace(/\n/g, " ")
      .substring(0, 150)
      .trim() + "...";

  return (
    <Link
      href={`/thread/${thread.id}`}
      className={`card card-interactive block ${featured ? "border-2" : ""}`}
      style={
        featured
          ? {
              borderColor: "var(--brand)",
              background: "var(--brand-light)",
            }
          : {}
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3
            className={`font-semibold mb-2 line-clamp-2 ${
              featured ? "text-xl" : "text-lg"
            }`}
            style={{ color: "var(--foreground)" }}
          >
            {thread.title}
          </h3>

          {/* Preview */}
          {!featured && (
            <p
              className="text-sm mb-4 line-clamp-2"
              style={{ color: "var(--muted)" }}
            >
              {preview}
            </p>
          )}

          {/* Meta information */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Author */}
            {thread.profile?.username && (
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                  style={{
                    background: "var(--brand-light)",
                    color: "var(--brand-dark)",
                  }}
                >
                  {thread.profile.username.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm" style={{ color: "var(--muted)" }}>
                  {thread.profile.username}
                </span>
              </div>
            )}

            {thread.forum && (
              <Tooltip content={t("common.inThisForum")} position="top">
                <span
                  className="badge text-xs"
                  style={{
                    background: "var(--brand-light)",
                    color: "var(--brand-dark)",
                  }}
                >
                  {thread.forum.name}
                </span>
              </Tooltip>
            )}

            {/* Date */}
            <span className="text-sm" style={{ color: "var(--muted)" }}>
              {date}
            </span>

            {/* Comment count */}
            {thread._count && thread._count.comments > 0 && (
              <Tooltip
                content={`${thread._count.comments} ${
                  thread._count.comments === 1
                    ? t("threads.comment")
                    : t("threads.comments")
                }`}
                position="top"
              >
                <div className="flex items-center gap-1 text-sm">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    style={{ color: "var(--muted)" }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  <span style={{ color: "var(--muted)" }}>
                    {thread._count.comments}
                  </span>
                </div>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Featured indicator */}
        {featured && (
          <div
            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide"
            style={{
              background: "var(--brand)",
              color: "white",
              boxShadow: "0 2px 8px rgba(88, 101, 242, 0.4)",
            }}
          >
            ⭐ Destacado
          </div>
        )}
      </div>
    </Link>
  );
}
