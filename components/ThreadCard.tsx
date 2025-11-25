import Link from "next/link";

interface Thread {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  _count: {
    comments: number;
  };
}

interface ThreadCardProps {
  thread: Thread;
  forumSlug: string;
}

export default function ThreadCard({ thread, forumSlug }: ThreadCardProps) {
  const excerpt =
    thread.content.length > 150
      ? thread.content.substring(0, 150) + "..."
      : thread.content;

  const date = new Date(thread.createdAt).toLocaleDateString("en-US", {
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
            <span>by {thread.profile.username}</span>
            <span>•</span>
          </>
        )}
        <span>{date}</span>
        <span>•</span>
        <span>
          {thread._count.comments}{" "}
          {thread._count.comments === 1 ? "comment" : "comments"}
        </span>
      </div>
    </Link>
  );
}
