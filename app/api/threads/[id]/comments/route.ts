import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createCommentSchema } from "@/lib/validations";
import {
  getProfilesMap,
  extractUserIds,
  requireAuth,
  handleApiError,
  checkRateLimit,
} from "@/lib/api-helpers";

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

    // Get profiles using helper function
    const userIds = extractUserIds(comments || []);
    const profilesMap = await getProfilesMap(userIds);

    // Transform comments with profiles (include user_id, parent_id, depth, reply_count for client-side logic)
    const commentsWithProfiles = (comments || []).map((comment: any) => ({
      ...comment,
      profile: comment.user_id ? profilesMap[comment.user_id] : null,
      user_id: comment.user_id, // Keep user_id for client-side ownership checks
      parent_id: comment.parent_id, // For threading
      depth: comment.depth || 0, // Nesting level
      reply_count: comment.reply_count || 0, // Number of replies
    }));

    return NextResponse.json({
      thread: {
        ...thread,
        user_id: thread.user_id, // Keep user_id for client-side ownership checks
      },
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
    const { id } = await params;
    const body = await request.json();
    const validatedData = createCommentSchema.parse(body);

    // Check authentication
    const { user, supabase } = await requireAuth();

    // Check rate limit
    const rateLimitError = checkRateLimit(request, "comments", user.id);
    if (rateLimitError) return rateLimitError;

    // Verify thread exists
    const { data: thread, error: threadError } = await supabase
      .from("threads")
      .select("id")
      .eq("id", id)
      .single();

    if (threadError || !thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // If parent_id is provided, verify parent comment exists and belongs to same thread
    if (body.parent_id) {
      const { data: parentComment, error: parentError } = await supabase
        .from("comments")
        .select("id, thread_id, depth")
        .eq("id", body.parent_id)
        .single();

      if (parentError || !parentComment) {
        return NextResponse.json({ error: "Parent comment not found" }, { status: 404 });
      }

      if (parentComment.thread_id !== id) {
        return NextResponse.json({ error: "Parent comment belongs to different thread" }, { status: 400 });
      }

      // Check depth limit
      if (parentComment.depth >= 5) {
        return NextResponse.json({ error: "Maximum nesting depth reached" }, { status: 400 });
      }
    }

    // Create comment with user_id and parent_id
    const { data: comment, error: commentError } = await supabase
      .from("comments")
      .insert([
        {
          ...validatedData,
          thread_id: id,
          user_id: user.id,
          parent_id: body.parent_id || null,
        },
      ])
      .select()
      .single();

    if (commentError) throw commentError;

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    return handleApiError(error, "Error al crear el comentario. Por favor intenta de nuevo.");
  }
}
