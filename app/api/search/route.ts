import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import {
  getProfilesMap,
  getCommentCountsMap,
  getThreadCountsMap,
  extractUserIds,
  extractThreadIds,
  extractForumIds,
  checkRateLimit,
} from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    // Check rate limit
    const rateLimitError = checkRateLimit(request, "search");
    if (rateLimitError) return rateLimitError;

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
        // Get all data in parallel using helper functions
        const userIds = extractUserIds(threads);
        const forumIds = extractForumIds(threads);
        const threadIds = extractThreadIds(
          threads.map((t: any) => ({ thread_id: t.id }))
        );

        const [profilesMap, commentCountsMap, forumsData] = await Promise.all([
          getProfilesMap(userIds),
          getCommentCountsMap(threadIds),
          forumIds.length > 0
            ? supabase
                .from("forums")
                .select("id, name, slug")
                .in("id", forumIds)
            : Promise.resolve({ data: [] }),
        ]);

        // Build forums map
        const forumsMap: Record<string, { name: string; slug: string }> = {};
        forumsData.data?.forEach((forum: any) => {
          forumsMap[forum.id] = { name: forum.name, slug: forum.slug };
        });

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
        // Get thread counts using helper function
        const forumIds = forums.map((f: any) => f.id);
        const countsMap = await getThreadCountsMap(forumIds);

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

