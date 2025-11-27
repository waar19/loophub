"use client";

import Link from "next/link";
import { Thread } from "@/lib/supabase";
import { useTranslations } from "@/components/TranslationsProvider";
import Tooltip from "./Tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
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
  const { user } = useAuth();
  const router = useRouter();
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
    <div
      className={`card flex flex-col overflow-hidden p-3 sm:p-4 hover:bg-[var(--card-hover)] transition-colors relative ${
        featured ? "border-l-4 border-l-[var(--brand)]" : ""
      }`}
      style={{
        background: featured ? "var(--brand-light)" : "var(--card-bg)",
      }}
    >
      {/* Header: Metadata */}
      <div
        className="flex items-center gap-2 text-xs mb-2 flex-wrap"
        style={{ color: "var(--muted)" }}
      >
        {thread.forum && (
          <>
            <Link
              href={`/forum/${thread.forum.slug}`}
              className="font-bold hover:underline flex items-center gap-1 relative z-10"
              style={{ color: "var(--foreground)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {thread.forum.name}
            </Link>
            <span className="text-[var(--muted-light)]">•</span>
          </>
        )}

        <span>
          {t("common.postedBy")}{" "}
          <Link
            href={`/u/${thread.profile?.username}`}
            className="hover:underline relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            u/{thread.profile?.username}
          </Link>
        </span>

        <span className="text-[var(--muted-light)]">•</span>
        <span>{date}</span>

        {featured && (
          <span className="ml-auto text-[10px] uppercase font-bold tracking-wider text-[var(--brand)] flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Destacado
          </span>
        )}
      </div>

      {/* Title */}
      <h3
        className="font-semibold text-lg mb-2 leading-snug"
        style={{ color: "var(--foreground)" }}
      >
        <Link
          href={`/thread/${thread.id}`}
          className="before:absolute before:inset-0"
        >
          {thread.title}
        </Link>
      </h3>

      {/* Preview */}
      {!featured && (
        <p
          className="text-sm mb-3 line-clamp-3"
          style={{ color: "var(--foreground)", opacity: 0.9 }}
        >
          {preview}
        </p>
      )}

      {/* Footer: Actions */}
      <div className="flex items-center gap-2 mt-auto relative z-10 pt-2">
        <VoteButtons
          threadId={thread.id}
          initialUpvotes={thread.upvote_count || 0}
          initialDownvotes={thread.downvote_count || 0}
          orientation="horizontal"
        />

        <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[var(--card-hover)] border border-[var(--border)] hover:bg-[var(--border-light)] transition-colors text-xs font-bold text-[var(--muted)] cursor-pointer">
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
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span>
            {thread._count?.comments || 0}{" "}
            {thread._count?.comments === 1
              ? t("threads.comment")
              : t("threads.comments")}
          </span>
        </div>

        <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[var(--card-hover)] border border-[var(--border)] hover:bg-[var(--border-light)] transition-colors text-xs font-bold text-[var(--muted)] cursor-pointer">
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
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
          <span>Compartir</span>
        </div>
      </div>
    </div>
  );
}
