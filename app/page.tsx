import ForumCard from "@/components/ForumCard";
import { headers } from "next/headers";

interface Forum {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  _count: {
    threads: number;
  };
}

async function getForums(): Promise<Forum[]> {
  const headersList = await headers();
  const protocol = headersList.get("x-forwarded-proto") || "http";
  const host = headersList.get("host") || "localhost:3000";
  const baseURL = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`;
  
  const res = await fetch(`${baseURL}/api/forums`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch forums");
  }

  return res.json();
}

export default async function HomePage() {
  const forums = await getForums();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome to LoopHub</h1>
        <p style={{ color: "var(--muted)" }}>
          A minimalist forum platform for focused discussions
        </p>
      </div>

      {forums.length === 0 ? (
        <div className="card text-center py-12">
          <p style={{ color: "var(--muted)" }}>
            No forums yet. Check back soon!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {forums.map((forum) => (
            <ForumCard key={forum.id} forum={forum} />
          ))}
        </div>
      )}
    </div>
  );
}
