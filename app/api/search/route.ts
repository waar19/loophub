import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();
    const type = searchParams.get("type") || "all"; // all, threads, forums
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const offset = (page - 1) * limit;

    if (!query || query.length < 2) {
      return NextResponse.json({
        threads: [],
        forums: [],
        pagination: {
          page: 1,
          limit,
          total: 0,
          totalPages: 0,
          hasMore: false,
        },
      });
    }

    const results: {
      threads: any[];
      forums: any[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
      };
    } = {
      threads: [],
      forums: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
        hasMore: false,
      },
    };

    // Search threads
    if (type === "all" || type === "threads") {
      const { data: threads, error: threadsError, count } = await supabase
        .from("threads")
        .select("*", { count: "exact" })
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (!threadsError && threads) {
        // Get unique user IDs
        const userIds = [...new Set(threads.map((t: any) => t.user_id).filter(Boolean))];
        
        // Get profiles
        let profilesMap: Record<string, { username: string }> = {};
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, username")
            .in("id", userIds);

          if (profiles) {
            profiles.forEach((profile: any) => {
              profilesMap[profile.id] = { username: profile.username };
            });
          }
        }

        // Get forum info
        const forumIds = [...new Set(threads.map((t: any) => t.forum_id).filter(Boolean))];
        let forumsMap: Record<string, { name: string; slug: string }> = {};
        if (forumIds.length > 0) {
          const { data: forums } = await supabase
            .from("forums")
            .select("id, name, slug")
            .in("id", forumIds);

          if (forums) {
            forums.forEach((forum: any) => {
              forumsMap[forum.id] = { name: forum.name, slug: forum.slug };
            });
          }
        }

        // Get comment counts
        const threadIds = threads.map((t: any) => t.id);
        let commentCountsMap: Record<string, number> = {};
        if (threadIds.length > 0) {
          const { data: comments } = await supabase
            .from("comments")
            .select("thread_id")
            .in("thread_id", threadIds);

          if (comments) {
            comments.forEach((comment: any) => {
              commentCountsMap[comment.thread_id] = (commentCountsMap[comment.thread_id] || 0) + 1;
            });
          }
        }

        results.threads = threads.map((thread: any) => ({
          ...thread,
          profile: thread.user_id ? profilesMap[thread.user_id] : null,
          forum: thread.forum_id ? forumsMap[thread.forum_id] : null,
          _count: {
            comments: commentCountsMap[thread.id] || 0,
          },
        }));

        results.pagination = {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
          hasMore: (offset + limit) < (count || 0),
        };
      }
    }

    // Search forums
    if (type === "all" || type === "forums") {
      const { data: forums, error: forumsError } = await supabase
        .from("forums")
        .select("id, name, slug, description, created_at")
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!forumsError && forums) {
        // Get thread counts
        const forumIds = forums.map((f: any) => f.id);
        const countsMap: Record<string, number> = {};
        
        if (forumIds.length > 0) {
          const { data: threads } = await supabase
            .from("threads")
            .select("forum_id")
            .in("forum_id", forumIds);
          
          if (threads) {
            threads.forEach((thread: any) => {
              countsMap[thread.forum_id] = (countsMap[thread.forum_id] || 0) + 1;
            });
          }
        }

        results.forums = forums.map((forum: any) => ({
          ...forum,
          _count: {
            threads: countsMap[forum.id] || 0,
          },
        }));
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error searching:", error);
    return NextResponse.json(
      { error: "Failed to perform search" },
      { status: 500 }
    );
  }
}

