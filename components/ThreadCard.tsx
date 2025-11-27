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
    <article
      className={`card group cursor-pointer ${
        featured
          ? "ring-2 ring-[var(--brand)] ring-offset-2 ring-offset-[var(--background)]"
          : ""
      }`}
    >
      <div className="p-5">
        {/* Header: Forum & Metadata */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {thread.forum && (
            <Link
              href={`/forum/${thread.forum.slug}`}
              className="flex items-center gap-2 relative z-10 group/forum"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold transition-transform group-hover/forum:scale-110"
                style={{
                  background: `linear-gradient(135deg, var(--brand), var(--accent))`,
                }}
              >
                {thread.forum.name.charAt(0).toUpperCase()}
              </div>
              <span
                className="font-semibold text-sm hover:underline"
                style={{ color: "var(--foreground)" }}
              >
                r/{thread.forum.name}
              </span>
            </Link>
          )}

          <span className="text-[var(--muted-light)]">•</span>

          <div
            className="flex items-center gap-2 text-xs"
            style={{ color: "var(--muted)" }}
          >
            <span>
              {t("common.postedBy")}{" "}
              <Link
                href={`/u/${thread.profile?.username}`}
                className="hover:underline relative z-10 font-medium transition-colors"
                style={{ color: "var(--muted)" }}
                onClick={(e) => e.stopPropagation()}
              >
                u/{thread.profile?.username}
              </Link>
            </span>

            <span className="text-[var(--muted-light)]">•</span>
            <time className="text-xs">{date}</time>
          </div>

          {featured && (
            <span
              className="ml-auto text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5"
              style={{
                background: "var(--brand-light)",
                color: "var(--brand)",
              }}
            >
              <svg
                className="w-3.5 h-3.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Destacado
            </span>
          )}
        </div>

        {/* Title */}
        <h2
          className="font-semibold text-xl mb-3 leading-tight group-hover:text-[var(--brand)] transition-colors"
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

          <button
            className="flex items-center gap-2 px-4 py-2 rounded-full transition-all hover:bg-[var(--card-hover)] group/comments"
            style={{ color: "var(--muted)" }}
          >
            <svg
              className="w-5 h-5 transition-transform group-hover/comments:scale-110"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span className="text-sm font-semibold">
              {thread._count?.comments || 0}
            </span>
          </button>

          <button
            className="flex items-center gap-2 px-4 py-2 rounded-full transition-all hover:bg-[var(--card-hover)] group/share"
            style={{ color: "var(--muted)" }}
          >
            <svg
              className="w-5 h-5 transition-transform group-hover/share:scale-110"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
            <span className="text-sm font-semibold">Compartir</span>
          </button>
        </div>
      </div>
    </article>
  );
}
