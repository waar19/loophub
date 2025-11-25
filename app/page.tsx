import ForumCard from "@/components/ForumCard";
import { createClient } from "@/lib/supabase-server";

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
  const supabase = await createClient();
  
  const { data: forums, error } = await supabase
    .from("forums")
    .select(
      `
      *,
      threads:threads(count)
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching forums:", error);
    throw new Error("Failed to fetch forums");
  }

  // Transform the count data
  const forumsWithCount = forums?.map((forum) => ({
    ...forum,
    createdAt: forum.created_at,
    _count: {
      threads: forum.threads[0]?.count || 0,
    },
  })) || [];

  return forumsWithCount;
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
