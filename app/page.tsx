import { createClient } from "@/lib/supabase-server";
import TrendingPanel from "@/components/TrendingPanel";
import ThreadCard from "@/components/ThreadCard";
import ForumCard from "@/components/ForumCard";
import Breadcrumbs from "@/components/Breadcrumbs";
import {
  getProfilesMap,
  getCommentCountsMap,
  getThreadCountsMap,
  extractUserIds,
  extractThreadIds,
  extractForumIds,
} from "@/lib/api-helpers";

interface Thread {
  id: string;
  title: string;
  content: string;
  created_at: string;
  forum_id: string;
  user_id?: string;
  profile?: {
    username: string;
  };
  forum?: {
    name: string;
    slug: string;
  };
  _count?: {
    comments: number;
  };
}

async function getRecentThreads(): Promise<Thread[]> {
  const supabase = await createClient();
  
  const { data: threads, error } = await supabase
    .from("threads")
    .select(`
      *,
      forums!inner(name, slug)
    `)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Error fetching threads:", error);
    return [];
  }

  if (!threads || threads.length === 0) {
    return [];
  }

  // Get profiles and comment counts using helper functions
  const userIds = extractUserIds(threads);
  const threadIds = extractThreadIds(
    threads.map((t) => ({ thread_id: t.id }))
  );

  const [profilesMap, countsMap] = await Promise.all([
    getProfilesMap(userIds),
    getCommentCountsMap(threadIds),
  ]);

  return threads.map((thread) => ({
    ...thread,
    profile: thread.user_id ? profilesMap[thread.user_id] : undefined,
    _count: {
      comments: countsMap[thread.id] || 0,
    },
  }));
}

async function getFeaturedThreads(): Promise<Thread[]> {
  const supabase = await createClient();
  
  // Get threads with most comments in last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const { data: threads } = await supabase
    .from("threads")
    .select(`
      *,
      forums!inner(name, slug)
    `)
    .gte("created_at", sevenDaysAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(10);

  if (!threads || threads.length === 0) return [];

  // Get profiles and comment counts using helper functions
  const userIds = extractUserIds(threads);
  const threadIds = extractThreadIds(
    threads.map((t) => ({ thread_id: t.id }))
  );

  const [profilesMap, countsMap] = await Promise.all([
    getProfilesMap(userIds),
    getCommentCountsMap(threadIds),
  ]);

  return threads
    .map((thread) => ({
      ...thread,
      profile: thread.user_id ? profilesMap[thread.user_id] : undefined,
      _count: {
        comments: countsMap[thread.id] || 0,
      },
    }))
    .filter((t) => (t._count?.comments || 0) > 0)
    .sort((a, b) => (b._count?.comments || 0) - (a._count?.comments || 0))
    .slice(0, 5);
}

interface Forum {
  id: string;
  name: string;
  slug: string;
  description?: string;
  created_at: string;
  _count: {
    threads: number;
  };
}

async function getForums(): Promise<Forum[]> {
  const supabase = await createClient();
  
  const { data: forums, error } = await supabase
    .from("forums")
    .select("id, name, slug, created_at")
    .order("created_at", { ascending: false });

  if (error || !forums || forums.length === 0) {
    return [];
  }

  // Get thread counts using helper function
  const forumIds = forums.map((f) => f.id);
  const countsMap = await getThreadCountsMap(forumIds);

  return forums.map((forum) => ({
    id: forum.id,
    name: forum.name,
    slug: forum.slug,
    created_at: forum.created_at,
    _count: {
      threads: countsMap[forum.id] || 0,
    },
  }));
}

export default async function HomePage() {
  const [recentThreads, featuredThreads, forums] = await Promise.all([
    getRecentThreads(),
    getFeaturedThreads(),
    getForums(),
  ]);

  return (
    <div
      className="min-h-screen lg:ml-[var(--sidebar-width)] xl:mr-80"
    >
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Breadcrumbs items={[{ label: "Inicio", href: "/" }]} />

        {/* Hero Section */}
        <div className="mb-16">
          <h1
            className="text-4xl sm:text-5xl font-extrabold mb-4"
            style={{ 
              color: "var(--foreground)",
              background: "linear-gradient(135deg, var(--foreground) 0%, var(--brand) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Bienvenido a LoopHub
          </h1>
          <p className="text-xl leading-relaxed" style={{ color: "var(--muted)" }}>
            Comunidad enfocada en minimalismo digital, organización personal y
            productividad realista
          </p>
        </div>

        {/* Forums List */}
        {forums.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                style={{
                  background: "var(--brand)",
                  color: "white",
                }}
              >
                💬
              </div>
              <h2
                className="text-2xl sm:text-3xl font-bold"
                style={{ color: "var(--foreground)" }}
              >
                Foros
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {forums.map((forum) => (
                <ForumCard key={forum.id} forum={forum} />
              ))}
            </div>
          </section>
        )}

        {/* Featured Threads */}
        {featuredThreads.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                style={{
                  background: "linear-gradient(135deg, var(--brand) 0%, var(--brand-hover) 100%)",
                  color: "white",
                  boxShadow: "0 4px 12px rgba(88, 101, 242, 0.3)",
                }}
              >
                ⭐
              </div>
              <h2
                className="text-2xl sm:text-3xl font-bold"
                style={{ color: "var(--foreground)" }}
              >
                Hilos Destacados
              </h2>
            </div>
            <div className="space-y-4">
              {featuredThreads.map((thread) => (
                <ThreadCard
                  key={thread.id}
                  thread={thread}
                  forumSlug={thread.forum?.slug || ""}
                  featured
                />
              ))}
            </div>
          </section>
        )}

        {/* Recent Threads */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
              style={{
                background: "var(--brand)",
                color: "white",
              }}
            >
              🔥
            </div>
            <h2
              className="text-2xl sm:text-3xl font-bold"
              style={{ color: "var(--foreground)" }}
            >
              Hilos Recientes
            </h2>
          </div>
          {recentThreads.length === 0 ? (
            <div className="card text-center py-12">
              <p style={{ color: "var(--muted)" }}>
                Aún no hay hilos. Sé el primero en crear uno.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentThreads.map((thread) => (
                <ThreadCard
                  key={thread.id}
                  thread={thread}
                  forumSlug={thread.forum?.slug || ""}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Trending Panel */}
      <TrendingPanel />
    </div>
  );
}
