"use client";

import Link from "next/link";
import { Thread } from "@/lib/supabase";
import { useTranslations } from "@/components/TranslationsProvider";
import VoteButtons from "./VoteButtons";

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
      .substring(0, 200)
      .trim() + "...";

  return (
    <div
      className={`card overflow-hidden hover:border-[var(--border-hover)] transition-all relative ${
        featured ? "border-l-4 border-l-[var(--brand)]" : ""
      }`}
      style={{
        background: "var(--card-bg)",
      }}
    >
      <div className="p-4">
        {/* Header: Metadata */}
        <div
          className="flex items-center gap-2 text-xs mb-3 flex-wrap"
          style={{ color: "var(--muted)" }}
        >
          {thread.forum && (
            <>
              <Link
                href={`/forum/${thread.forum.slug}`}
                className="font-bold hover:underline flex items-center gap-1.5 relative z-10"
                style={{ color: "var(--foreground)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-5 h-5 rounded-full bg-[var(--brand)]" />
                r/{thread.forum.name}
              </Link>
              <span className="text-[var(--muted-light)]">•</span>
            </>
          )}

          <span className="text-xs">
            {t("common.postedBy")}{" "}
            <Link
              href={`/u/${thread.profile?.username}`}
              className="hover:underline relative z-10 font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              u/{thread.profile?.username}
            </Link>
          </span>

          <span className="text-[var(--muted-light)]">•</span>
          <span className="text-xs">{date}</span>

          {featured && (
            <span
              className="ml-auto text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded"
              style={{
                background: "var(--brand-light)",
                color: "var(--brand)",
              }}
            >
              ⭐ Destacado
            </span>
          )}
        </div>

        {/* Title */}
        <h2
          className="font-semibold text-xl mb-2 leading-tight hover:underline"
          style={{ color: "var(--foreground)" }}
        >
          <Link
            href={`/thread/${thread.id}`}
            className="before:absolute before:inset-0"
          >
            {thread.title}
          </Link>
        </h2>

        {/* Preview */}
        <p
          className="text-sm mb-4 line-clamp-2 leading-relaxed"
          style={{ color: "var(--muted)" }}
        >
          {preview}
        </p>

        {/* Footer: Actions */}
        <div className="flex items-center gap-2 relative z-10">
          <VoteButtons
            threadId={thread.id}
            initialUpvotes={thread.upvote_count || 0}
            initialDownvotes={thread.downvote_count || 0}
            orientation="horizontal"
          />

          <button className="flex items-center gap-2 px-3 py-2 rounded-full bg-transparent hover:bg-[var(--card-hover)] transition-colors text-xs font-bold text-[var(--muted)]">
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
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span>
              {thread._count?.comments || 0}{" "}
              {thread._count?.comments === 1
                ? t("threads.comment")
                : t("threads.comments")}
            </span>
          </button>

          <button className="flex items-center gap-2 px-3 py-2 rounded-full bg-transparent hover:bg-[var(--card-hover)] transition-colors text-xs font-bold text-[var(--muted)]">
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
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
            <span>Compartir</span>
          </button>
        </div>
      </div>
    </div>
  );
}
