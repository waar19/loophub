import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createCommentSchema } from "@/lib/validations";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100); // Max 100 per page
    const offset = (page - 1) * limit;

    // Get thread with forum info
    const { data: thread, error: threadError } = await supabase
      .from("threads")
      .select(
        `
        *,
        forum:forums(*)
      `
      )
      .eq("id", id)
      .single();

    if (threadError || !thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Get total count for pagination
    const { count: totalCount, error: countError } = await supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("thread_id", id);

    if (countError) throw countError;

    // Get comments for this thread with pagination
    const { data: comments, error: commentsError } = await supabase
      .from("comments")
      .select("*")
      .eq("thread_id", id)
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1);

    if (commentsError) throw commentsError;

    // Get unique user IDs from comments
    const userIds = [...new Set((comments || []).map((c: any) => c.user_id).filter(Boolean))];
    
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

    // Transform comments with profiles
    const commentsWithProfiles = (comments || []).map((comment: any) => ({
      ...comment,
      profile: comment.user_id ? profilesMap[comment.user_id] : null,
    }));

    return NextResponse.json({
      thread,
      comments: commentsWithProfiles,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
        hasMore: (offset + limit) < (totalCount || 0),
      },
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const body = await request.json();
    const validatedData = createCommentSchema.parse(body);

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

    // Verify thread exists
    const { data: thread, error: threadError } = await supabase
      .from("threads")
      .select("id")
      .eq("id", id)
      .single();

    if (threadError || !thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Create comment with user_id
    const { data: comment, error: commentError } = await supabase
      .from("comments")
      .insert([
        {
          ...validatedData,
          thread_id: id,
          user_id: user.id,
        },
      ])
      .select()
      .single();

    if (commentError) throw commentError;

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("Error creating comment:", error);

    if (error instanceof Error && "issues" in error) {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}
