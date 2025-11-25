"use client";

import Link from "next/link";

interface Forum {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  _count: {
    threads: number;
  };
}

interface ForumCardProps {
  forum: Forum;
}

export default function ForumCard({ forum }: ForumCardProps) {
  return (
    <Link 
      href={`/forum/${forum.slug}`} 
      className="card block group relative overflow-hidden"
      style={{
        borderLeft: "4px solid var(--brand)",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 
            className="text-xl font-bold mb-2 transition-colors"
            style={{ color: "var(--foreground)" }}
            onMouseEnter={(e) => e.currentTarget.style.color = "var(--brand)"}
            onMouseLeave={(e) => e.currentTarget.style.color = "var(--foreground)"}
          >
            {forum.name}
          </h3>
          <div className="flex items-center gap-2">
            <span 
              className="text-sm font-semibold"
              style={{ color: "var(--brand)" }}
            >
              {forum._count.threads}
            </span>
            <span className="text-sm" style={{ color: "var(--muted)" }}>
              {forum._count.threads === 1 ? "hilo" : "hilos"}
            </span>
          </div>
        </div>
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl shrink-0 transition-transform group-hover:scale-110"
          style={{
            background: "var(--brand-light)",
          }}
        >
          💬
        </div>
      </div>
    </Link>
  );
}
