import Link from "next/link";

interface Forum {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  _count: {
    threads: number;
  };
}

interface ForumCardProps {
  forum: Forum;
}

export default function ForumCard({ forum }: ForumCardProps) {
  return (
    <Link href={`/forum/${forum.slug}`} className="card block">
      <h3 className="text-xl font-semibold mb-2">{forum.name}</h3>
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        {forum._count.threads}{" "}
        {forum._count.threads === 1 ? "thread" : "threads"}
      </p>
    </Link>
  );
}
