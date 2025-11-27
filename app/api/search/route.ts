import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import {
  getProfilesMap,
  getCommentCountsMap,
  checkRateLimit,
} from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    // Check rate limit
    const rateLimitError = checkRateLimit(request, "search");
    if (rateLimitError) return rateLimitError;

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    // Parse search parameters
    const query = searchParams.get("q")?.trim() || "";
    const type = searchParams.get("type") || "all"; // all, threads, comments, forums
    const forumId = searchParams.get("forum") || null;
    const authorId = searchParams.get("author") || null;
    const tagIds = searchParams.get("tags")?.split(",").filter(Boolean) || null;
    const dateRange = searchParams.get("date") || null; // today, week, month, year
    const sortBy = searchParams.get("sort") || "relevance"; // relevance, newest, oldest, most_voted, most_comments
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const offset = (page - 1) * limit;

    // Calculate date range
    let dateFrom: string | null = null;
    let dateTo: string | null = null;
    const now = new Date();
    
    if (dateRange) {
      dateTo = now.toISOString();
      switch (dateRange) {
        case "today":
          dateFrom = new Date(now.setHours(0, 0, 0, 0)).toISOString();
          break;
        case "week":
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case "month":
          dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case "year":
          dateFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
          break;
      }
    }

    const results: {
      threads: any[];
      comments: any[];
      forums: any[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
      };
      filters: {
        query: string;
        type: string;
        forum: string | null;
        author: string | null;
        tags: string[] | null;
        date: string | null;
        sort: string;
      };
    } = {
      threads: [],
      comments: [],
      forums: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
        hasMore: false,
      },
      filters: {
        query,
        type,
        forum: forumId,
        author: authorId,
        tags: tagIds,
        date: dateRange,
        sort: sortBy,
      },
    };

    // Empty query without filters - return empty results
    if (!query && !forumId && !authorId && !tagIds) {
      return NextResponse.json(results);
    }

    // Search threads
    if (type === "all" || type === "threads") {
      let threadsQuery = supabase
        .from("threads")
        .select(`
          id,
          title,
          content,
          user_id,
          forum_id,
          upvotes,
          downvotes,
          created_at,
          updated_at
        `, { count: "exact" });

      // Apply text search
      if (query && query.length >= 2) {
        threadsQuery = threadsQuery.or(`title.ilike.%${query}%,content.ilike.%${query}%`);
      }

      // Apply filters
      if (forumId) {
        threadsQuery = threadsQuery.eq("forum_id", forumId);
      }
      if (authorId) {
        threadsQuery = threadsQuery.eq("user_id", authorId);
      }
      if (dateFrom) {
        threadsQuery = threadsQuery.gte("created_at", dateFrom);
      }
      if (dateTo) {
        threadsQuery = threadsQuery.lte("created_at", dateTo);
      }

      // Apply sorting
      switch (sortBy) {
        case "newest":
          threadsQuery = threadsQuery.order("created_at", { ascending: false });
          break;
        case "oldest":
          threadsQuery = threadsQuery.order("created_at", { ascending: true });
          break;
        case "most_voted":
          threadsQuery = threadsQuery.order("upvotes", { ascending: false });
          break;
        default:
          threadsQuery = threadsQuery.order("created_at", { ascending: false });
      }

      threadsQuery = threadsQuery.range(offset, offset + limit - 1);

      const { data: threads, error: threadsError, count } = await threadsQuery;

      if (!threadsError && threads && threads.length > 0) {
        const userIds = [...new Set(threads.map((t: any) => t.user_id).filter(Boolean))];
        const forumIds = [...new Set(threads.map((t: any) => t.forum_id).filter(Boolean))];
        const threadIds = threads.map((t: any) => t.id);

        const [profilesMap, commentCountsMap, forumsData, tagsData] = await Promise.all([
          getProfilesMap(userIds),
          getCommentCountsMap(threadIds),
          forumIds.length > 0
            ? supabase.from("forums").select("id, name, slug").in("id", forumIds)
            : Promise.resolve({ data: [] }),
          threadIds.length > 0
            ? supabase
                .from("thread_tags")
                .select("thread_id, tags(id, name, slug, color)")
                .in("thread_id", threadIds)
            : Promise.resolve({ data: [] }),
        ]);

        const forumsMap: Record<string, { name: string; slug: string }> = {};
        forumsData.data?.forEach((forum: any) => {
          forumsMap[forum.id] = { name: forum.name, slug: forum.slug };
        });

        const tagsMap: Record<string, any[]> = {};
        tagsData.data?.forEach((tt: any) => {
          if (!tagsMap[tt.thread_id]) tagsMap[tt.thread_id] = [];
          if (tt.tags) tagsMap[tt.thread_id].push(tt.tags);
        });

        let filteredThreads = threads;
        if (tagIds && tagIds.length > 0) {
          filteredThreads = threads.filter((thread: any) => {
            const threadTags = tagsMap[thread.id] || [];
            return tagIds.some(tagId => threadTags.some((t: any) => t.id === tagId));
          });
        }

        results.threads = filteredThreads.map((thread: any) => ({
          ...thread,
          profile: thread.user_id ? profilesMap[thread.user_id] : null,
          forum: thread.forum_id ? forumsMap[thread.forum_id] : null,
          tags: tagsMap[thread.id] || [],
          _count: {
            comments: commentCountsMap[thread.id] || 0,
          },
        }));

        const totalCount = tagIds ? filteredThreads.length : (count || 0);
        results.pagination = {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasMore: (offset + limit) < totalCount,
        };
      }
    }

    // Search comments
    if (type === "comments" && query && query.length >= 2) {
      const { data: comments, error: commentsError, count } = await supabase
        .from("comments")
        .select(`
          id,
          content,
          user_id,
          thread_id,
          parent_id,
          created_at,
          threads!inner(id, title)
        `, { count: "exact" })
        .ilike("content", `%${query}%`)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (!commentsError && comments) {
        const userIds = [...new Set(comments.map((c: any) => c.user_id).filter(Boolean))];
        const profilesMap = await getProfilesMap(userIds);

        results.comments = comments.map((comment: any) => ({
          ...comment,
          profile: comment.user_id ? profilesMap[comment.user_id] : null,
          thread_title: comment.threads?.title,
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
    if ((type === "all" || type === "forums") && query && query.length >= 2) {
      const { data: forums, error: forumsError } = await supabase
        .from("forums")
        .select("id, name, slug, description, created_at")
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!forumsError && forums) {
        const forumIds = forums.map((f: any) => f.id);
        const { data: counts } = await supabase
          .from("threads")
          .select("forum_id")
          .in("forum_id", forumIds);

        const countsMap: Record<string, number> = {};
        counts?.forEach((c: any) => {
          countsMap[c.forum_id] = (countsMap[c.forum_id] || 0) + 1;
        });

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

