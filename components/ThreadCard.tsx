import Link from "next/link";
import { Thread } from "@/lib/supabase";
import ReportButton from "@/components/ReportButton";

interface ThreadCardProps {
  thread: Thread;
  forumSlug: string;
}

export default function ThreadCard({ thread, forumSlug }: ThreadCardProps) {
  // Strip markdown syntax for excerpt
  const plainText = thread.content
    .replace(/#{1,6}\s+/g, "") // Remove headers
    .replace(/\*\*([^*]+)\*\*/g, "$1") // Remove bold
    .replace(/\*([^*]+)\*/g, "$1") // Remove italic
    .replace(/`([^`]+)`/g, "$1") // Remove inline code
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") // Remove links
    .replace(/\n+/g, " ") // Replace newlines with spaces
    .trim();
  
  const excerpt =
    plainText.length > 150
      ? plainText.substring(0, 150) + "..."
      : plainText;

  const date = new Date(thread.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Link href={`/thread/${thread.id}`} className="card block">
      <h3 className="text-lg font-semibold mb-2">{thread.title}</h3>
      <p className="mb-3" style={{ color: "var(--muted)" }}>
        {excerpt}
      </p>
      <div
        className="flex items-center gap-4 text-sm"
        style={{ color: "var(--muted)" }}
      >
        {thread.profile?.username && (
          <>
            <span>por {thread.profile.username}</span>
            <span>•</span>
          </>
        )}
        <span>{date}</span>
        <span>•</span>
        <span>
          {thread._count?.comments || 0}{" "}
          {thread._count?.comments === 1 ? "comentario" : "comentarios"}
        </span>
        <ReportButton contentType="thread" contentId={thread.id} />
      </div>
    </Link>
  );
}
