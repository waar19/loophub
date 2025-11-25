import Link from "next/link";
import ThreadCard from "@/components/ThreadCard";
import { Metadata } from "next";

import { Thread } from "@/lib/supabase";

interface Forum {
  id: string;
  name: string;
  slug: string;
}

interface ForumData {
  forum: Forum;
  threads: Thread[];
}

async function getForumData(slug: string): Promise<ForumData> {
  const baseURL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const res = await fetch(`${baseURL}/api/forums/${slug}/threads`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch forum data");
  }

  return res.json();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { forum } = await getForumData(slug);

  return {
    title: `${forum.name} - LoopHub`,
    description: `Discussion threads in ${forum.name} forum`,
  };
}

export default async function ForumPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { forum, threads } = await getForumData(slug);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">{forum.name}</h1>
          <p style={{ color: "var(--muted)" }}>
            {threads.length} {threads.length === 1 ? "thread" : "threads"}
          </p>
        </div>
        <Link href={`/forum/${slug}/new`} className="btn btn-primary">
          New Thread
        </Link>
      </div>

      {threads.length === 0 ? (
        <div className="card text-center py-12">
          <p style={{ color: "var(--muted)" }} className="mb-4">
            No threads yet. Be the first to start a discussion!
          </p>
          <Link href={`/forum/${slug}/new`} className="btn btn-primary">
            Create First Thread
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {threads.map((thread) => (
            <ThreadCard key={thread.id} thread={thread} forumSlug={slug} />
          ))}
        </div>
      )}
    </div>
  );
}
