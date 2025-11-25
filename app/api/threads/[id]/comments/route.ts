import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createCommentSchema } from "@/lib/validations";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
      .select(
        `
        *,
        profile:profiles(username)
      `
      )
      .eq("thread_id", id)
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1);

    if (commentsError) throw commentsError;

    return NextResponse.json({
      thread,
      comments: comments || [],
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
