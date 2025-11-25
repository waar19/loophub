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
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-3 tracking-tight">
          Minimalist Hub
        </h1>
        <p className="text-lg" style={{ color: "var(--muted)" }}>
          Comunidad enfocada en minimalismo digital, organización personal y productividad realista
        </p>
      </div>

      {forums.length === 0 ? (
        <div className="card text-center py-12">
          <p style={{ color: "var(--muted)" }}>
            Aún no hay foros. Vuelve pronto.
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
