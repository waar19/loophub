import HomeContent from "@/components/HomeContent";

import { createClient } from "@/lib/supabase-server";
import MetaHead from "@/components/MetaHead";
import {
  getProfilesMap,
  getCommentCountsMap,
  getThreadCountsMap,
  extractUserIds,
  extractThreadIds,
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
    .select(
      `
      *,
      forums!inner(name, slug)
    `
    )
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
  const threadIds = extractThreadIds(threads.map((t) => ({ thread_id: t.id })));

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
    .select(
      `
      *,
      forums!inner(name, slug)
    `
    )
    .gte("created_at", sevenDaysAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(10);

  if (!threads || threads.length === 0) return [];

  // Get profiles and comment counts using helper functions
  const userIds = extractUserIds(threads);
  const threadIds = extractThreadIds(threads.map((t) => ({ thread_id: t.id })));

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
    <>
      <MetaHead
        title="Loophub - Home"
        description="Explore the latest threads and forums on Loophub"
      />
      <HomeContent
        recentThreads={recentThreads}
        featuredThreads={featuredThreads}
        forums={forums}
      />
    </>
  );
}
