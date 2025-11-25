import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createThreadSchema } from "@/lib/validations";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await createClient();
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100); // Max 100 per page
    const offset = (page - 1) * limit;

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

    // Get threads for this forum with pagination
    const { data: threads, error: threadsError } = await supabase
      .from("threads")
      .select("*")
      .eq("forum_id", forum.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (threadsError) {
      console.error("Threads error:", threadsError);
      throw threadsError;
    }

    // Get unique user IDs from threads
    const userIds = [...new Set((threads || []).map((t: any) => t.user_id).filter(Boolean))];
    
    // Get profiles for these users
    let profilesMap: Record<string, { username: string }> = {};
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", userIds);

      if (!profilesError && profiles) {
        profiles.forEach((profile: any) => {
          profilesMap[profile.id] = { username: profile.username };
        });
      }
    }

    // Get thread IDs to fetch comment counts
    const threadIds = (threads || []).map((t: any) => t.id);
    
    // Get comment counts for all threads at once using a single query
    let commentCountsMap: Record<string, number> = {};
    if (threadIds.length > 0) {
      const { data: commentCounts, error: commentCountsError } = await supabase
        .from("comments")
        .select("thread_id")
        .in("thread_id", threadIds);

      if (!commentCountsError && commentCounts) {
        // Count comments per thread
        commentCounts.forEach((comment: any) => {
          commentCountsMap[comment.thread_id] = (commentCountsMap[comment.thread_id] || 0) + 1;
        });
      }
    }

    // Transform threads with comment counts and profiles
    const threadsWithCount = (threads || []).map((thread: any) => ({
      ...thread,
      profile: thread.user_id ? profilesMap[thread.user_id] : null,
      _count: {
        comments: commentCountsMap[thread.id] || 0,
      },
    }));

    return NextResponse.json({
      forum,
        threads: threadsWithCount.map((thread: any) => ({
          ...thread,
          user_id: thread.user_id, // Keep user_id for client-side ownership checks
        })) || [],
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
        hasMore: (offset + limit) < (totalCount || 0),
      },
    });
  } catch (error) {
    console.error("Error fetching threads:", error);
    
    // Better error handling for Supabase errors
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      // Handle Supabase error objects
      const supabaseError = error as any;
      if (supabaseError.message) {
        errorMessage = supabaseError.message;
      } else if (supabaseError.code) {
        errorMessage = `Error ${supabaseError.code}: ${supabaseError.message || 'Database error'}`;
      }
    }
    
    return NextResponse.json(
      { 
        error: "Failed to fetch threads", 
        details: errorMessage,
        // Include full error in development
        ...(process.env.NODE_ENV === 'development' && { fullError: JSON.stringify(error) })
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
    const supabase = await createClient();
    const { slug } = await params;
    const body = await request.json();
    const validatedData = createThreadSchema.parse(body);

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

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

    return NextResponse.json(thread, { status: 201 });
  } catch (error) {
    console.error("Error creating thread:", error);

    // Handle Zod validation errors
    if (error instanceof Error && "issues" in error) {
      const zodError = error as any;
      const firstIssue = zodError.issues?.[0];
      const errorMessage = firstIssue?.message || "Error de validación";
      return NextResponse.json(
        { error: errorMessage, details: zodError.issues },
        { status: 400 }
      );
    }

    // Handle Supabase errors
    if (error && typeof error === "object" && "message" in error) {
      const supabaseError = error as any;
      return NextResponse.json(
        { error: supabaseError.message || "Error al crear el hilo" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Error al crear el hilo. Por favor intenta de nuevo." },
      { status: 500 }
    );
  }
}
