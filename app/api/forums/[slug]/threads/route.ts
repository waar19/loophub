import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createThreadSchema } from "@/lib/validations";
import {
  getProfilesMap,
  getCommentCountsMap,
  extractUserIds,
  extractThreadIds,
  requireAuth,
  handleApiError,
  checkRateLimit,
} from "@/lib/api-helpers";
import { cache, CACHE_KEYS } from "@/lib/cache";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await createClient();
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "20", 10),
      100
    ); // Max 100 per page
    const offset = (page - 1) * limit;
    const sortBy = searchParams.get("sort") || "newest"; // newest, oldest, most_comments, least_comments
    const order = searchParams.get("order") || "desc"; // asc, desc

    // Get forum by slug
    const { data: forum, error: forumError } = await supabase
      .from("forums")
      .select("*")
      .eq("slug", slug)
      .single();

    if (forumError || !forum) {
      return NextResponse.json({ error: "Forum not found" }, { status: 404 });
    }

    // Get total count for pagination
    const { count: totalCount, error: countError } = await supabase
      .from("threads")
      .select("*", { count: "exact", head: true })
      .eq("forum_id", forum.id);

    if (countError) {
      console.error("Count error:", countError);
      throw countError;
    }

    // Determine sort column and direction
    let sortColumn = "created_at";
    let ascending = false;

    switch (sortBy) {
      case "oldest":
        sortColumn = "created_at";
        ascending = true;
        break;
      case "newest":
        sortColumn = "created_at";
        ascending = false;
        break;
      case "most_comments":
      case "least_comments":
        // These will be sorted after fetching comment counts
        sortColumn = "created_at";
        ascending = false;
        break;
      default:
        sortColumn = "created_at";
        ascending = order === "asc";
    }

    // Get threads for this forum with pagination
    // Always order pinned threads first, then by the selected sort
    const { data: threads, error: threadsError } = await supabase
      .from("threads")
      .select("*")
      .eq("forum_id", forum.id)
      .order("is_pinned", { ascending: false, nullsFirst: false })
      .order(sortColumn, { ascending })
      .range(offset, offset + limit - 1);

    if (threadsError) {
      console.error("Threads error:", threadsError);
      throw threadsError;
    }

    // Get profiles and comment counts using helper functions
    const userIds = extractUserIds(threads || []);
    const threadIds = extractThreadIds(
      (threads || []).map((t) => ({ thread_id: t.id }))
    );

    const [profilesMap, commentCountsMap] = await Promise.all([
      getProfilesMap(userIds),
      getCommentCountsMap(threadIds),
    ]);

    // Transform threads with comment counts and profiles
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const threadsWithCount = (threads || []).map((thread: any) => ({
      ...thread,
      profile: thread.user_id ? profilesMap[thread.user_id] : null,
      _count: {
        comments: commentCountsMap[thread.id] || 0,
      },
    }));

    // Sort by comment count if needed
    if (sortBy === "most_comments" || sortBy === "least_comments") {
      threadsWithCount.sort((a, b) => {
        const aCount = a._count.comments || 0;
        const bCount = b._count.comments || 0;
        if (sortBy === "most_comments") {
          return bCount - aCount; // Descending
        } else {
          return aCount - bCount; // Ascending
        }
      });
    }

    return NextResponse.json({
      forum,
      threads:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        threadsWithCount.map((thread: any) => ({
          ...thread,
          user_id: thread.user_id, // Keep user_id for client-side ownership checks
        })) || [],
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
        hasMore: offset + limit < (totalCount || 0),
      },
    });
  } catch (error) {
    console.error("Error fetching threads:", error);

    // Better error handling for Supabase errors
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "object" && error !== null) {
      // Handle Supabase error objects
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabaseError = error as any;
      if (supabaseError.message) {
        errorMessage = supabaseError.message;
      } else if (supabaseError.code) {
        errorMessage = `Error ${supabaseError.code}: ${
          supabaseError.message || "Database error"
        }`;
      }
    }

    return NextResponse.json(
      {
        error: "Failed to fetch threads",
        details: errorMessage,
        // Include full error in development
        ...(process.env.NODE_ENV === "development" && {
          fullError: JSON.stringify(error),
        }),
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const validatedData = createThreadSchema.parse(body);

    // Check authentication
    const { user, supabase } = await requireAuth();

    // Check rate limit
    const rateLimitError = checkRateLimit(request, "threads", user.id);
    if (rateLimitError) return rateLimitError;

    // Get forum by slug
    const { data: forum, error: forumError } = await supabase
      .from("forums")
      .select("id")
      .eq("slug", slug)
      .single();

    if (forumError || !forum) {
      return NextResponse.json({ error: "Forum not found" }, { status: 404 });
    }

    // Create thread with user_id
    const { data: thread, error: threadError } = await supabase
      .from("threads")
      .insert([
        {
          ...validatedData,
          forum_id: forum.id,
          user_id: user.id,
        },
      ])
      .select()
      .single();

    if (threadError) throw threadError;

    // Add tags if provided
    const tags = body.tags;
    if (tags && Array.isArray(tags) && tags.length > 0) {
      const tagInserts = tags.slice(0, 5).map((tagId: string) => ({
        thread_id: thread.id,
        tag_id: tagId,
      }));
      
      await supabase.from("thread_tags").insert(tagInserts);
    }

    // Invalidate cache
    cache.delete(CACHE_KEYS.forumThreads(slug, 1, "newest"));

    return NextResponse.json(thread, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    return handleApiError(
      error,
      "Error al crear el hilo. Por favor intenta de nuevo."
    );
  }
}
