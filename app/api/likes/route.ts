import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api-helpers";

type ContentTable = "threads" | "comments";

// POST - Create a like (upvote) on a thread or comment
export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireAuth();
    const body = await request.json();
    const { threadId, commentId } = body;

    // Validate that either threadId or commentId is provided, but not both
    if ((!threadId && !commentId) || (threadId && commentId)) {
      return NextResponse.json(
        { error: "Either threadId or commentId must be provided, but not both" },
        { status: 400 }
      );
    }

    // Check if user already liked this content
    const { data: existingLike } = await supabase
      .from("likes")
      .select("id")
      .eq("user_id", user.id)
      .eq(threadId ? "thread_id" : "comment_id", threadId || commentId)
      .maybeSingle();

    if (existingLike) {
      return NextResponse.json(
        { error: "You already liked this content" },
        { status: 400 }
      );
    }

    // Create the like
    const { data: like, error: likeError } = await supabase
      .from("likes")
      .insert({
        user_id: user.id,
        thread_id: threadId || null,
        comment_id: commentId || null,
      })
      .select()
      .single();

    // Get updated like count
    const tableName: ContentTable = threadId ? "threads" : "comments";
    const idField = threadId ? "id" : "id";
    const contentId = threadId || commentId;

    const { data: content } = await supabase
      .from(tableName)
      .select("like_count")
      .eq(idField, contentId)
      .single();

    return NextResponse.json({
      success: true,
      like,
      likeCount: content?.like_count || 0,
    });
  } catch (error) {
    return handleApiError(error, "Failed to create like");
  }
}

// DELETE - Remove a like (unlike)
export async function DELETE(request: Request) {
  try {
    const { user, supabase } = await requireAuth();
    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get("threadId");
    const commentId = searchParams.get("commentId");

    // Validate that either threadId or commentId is provided, but not both
    if ((!threadId && !commentId) || (threadId && commentId)) {
      return NextResponse.json(
        { error: "Either threadId or commentId must be provided, but not both" },
        { status: 400 }
      );
    }

    // Delete the like
    const query = supabase
      .from("likes")
      .delete()
      .eq("user_id", user.id);

    if (threadId) {
      query.eq("thread_id", threadId);
    } else {
      query.eq("comment_id", commentId);
    }

    const { error: deleteError } = await query;

    // Get updated like count
    const tableName: ContentTable = threadId ? "threads" : "comments";
    const idField = threadId ? "id" : "id";
    const contentId = threadId || commentId;

    const { data: content } = await supabase
      .from(tableName)
      .select("like_count")
      .eq(idField, contentId)
      .single();

    return NextResponse.json({
      success: true,
      likeCount: content?.like_count || 0,
    });
  } catch (error) {
    return handleApiError(error, "Failed to remove like");
  }
}

// GET - Check if user has liked content and get like count
export async function GET(request: Request) {
  try {
    const { user, supabase } = await requireAuth();
    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get("threadId");
    const commentId = searchParams.get("commentId");

    // Validate that either threadId or commentId is provided, but not both
    if ((!threadId && !commentId) || (threadId && commentId)) {
      return NextResponse.json(
        { error: "Either threadId or commentId must be provided, but not both" },
        { status: 400 }
      );
    }

    // Check if user has liked this content
    const { data: existingLike } = await supabase
      .from("likes")
      .select("id")
      .eq("user_id", user.id)
      .eq(threadId ? "thread_id" : "comment_id", threadId || commentId)
      .eq("user_id", user.id)
      .eq(threadId ? "thread_id" : "comment_id", threadId || commentId)
      .maybeSingle();

    // Get like count
    const tableName: ContentTable = threadId ? "threads" : "comments";
    const idField = threadId ? "id" : "id";
    const contentId = threadId || commentId;

    const { data: content } = await supabase
      .from(tableName)
      .select("like_count")
      .eq(idField, contentId)
      .single();

    return NextResponse.json({
      isLiked: !!existingLike,
      likeCount: content?.like_count || 0,
    });
  } catch (error) {
    return handleApiError(error, "Failed to get like status");
  }
}
