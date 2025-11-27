import { NextResponse } from "next/server";
import { requireAuth, handleApiError, checkRateLimit } from "@/lib/api-helpers";

type VoteType = 1 | -1; // 1 = upvote, -1 = downvote

// POST - Create or update a vote (upvote/downvote) on a thread or comment
export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireAuth();
    
    // Check rate limit
    const rateLimitError = checkRateLimit(request, "votes", user.id);
    if (rateLimitError) return rateLimitError;
    
    const body = await request.json();
    const { threadId, commentId, voteType } = body as { 
      threadId?: string; 
      commentId?: string; 
      voteType: VoteType 
    };

    // Validate that either threadId or commentId is provided, but not both
    if ((!threadId && !commentId) || (threadId && commentId)) {
      return NextResponse.json(
        { error: "Either threadId or commentId must be provided, but not both" },
        { status: 400 }
      );
    }

    // Validate voteType
    if (voteType !== 1 && voteType !== -1) {
      return NextResponse.json(
        { error: "voteType must be 1 (upvote) or -1 (downvote)" },
        { status: 400 }
      );
    }

    // Check if user already voted on this content
    const { data: existingVote } = await supabase
      .from("votes")
      .select("id, vote_type")
      .eq("user_id", user.id)
      .eq(threadId ? "thread_id" : "comment_id", threadId || commentId)
      .maybeSingle();

    if (existingVote) {
      // If user already voted with the same type, do nothing
      if (existingVote.vote_type === voteType) {
        return NextResponse.json(
          { error: "You already voted this way" },
          { status: 400 }
        );
      }

      // Update the existing vote (change from upvote to downvote or vice versa)
      const { data: updatedVote, error: updateError } = await supabase
        .from("votes")
        .update({ vote_type: voteType })
        .eq("id", existingVote.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Get updated counts
      const { data: content } = await supabase
        .from(threadId ? "threads" : "comments")
        .select("upvote_count, downvote_count, score")
        .eq("id", threadId || commentId)
        .single();

      return NextResponse.json({
        success: true,
        vote: updatedVote,
        upvotes: content?.upvote_count || 0,
        downvotes: content?.downvote_count || 0,
        score: content?.score || 0,
      });
    }

    // Create a new vote
    const { data: vote, error: voteError } = await supabase
      .from("votes")
      .insert({
        user_id: user.id,
        thread_id: threadId || null,
        comment_id: commentId || null,
        vote_type: voteType,
      })
      .select()
      .single();

    if (voteError) throw voteError;

    // Get updated counts
    const { data: content } = await supabase
      .from(threadId ? "threads" : "comments")
      .select("upvote_count, downvote_count, score")
      .eq("id", threadId || commentId)
      .single();

    return NextResponse.json({
      success: true,
      vote,
      upvotes: content?.upvote_count || 0,
      downvotes: content?.downvote_count || 0,
      score: content?.score || 0,
    });
  } catch (error) {
    return handleApiError(error, "Failed to vote");
  }
}

// DELETE - Remove a vote
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

    // Delete the vote
    const query = supabase
      .from("votes")
      .delete()
      .eq("user_id", user.id);

    if (threadId) {
      query.eq("thread_id", threadId);
    } else {
      query.eq("comment_id", commentId);
    }

    const { error: deleteError } = await query;

    if (deleteError) throw deleteError;

    // Get updated counts
    const { data: content } = await supabase
      .from(threadId ? "threads" : "comments")
      .select("upvote_count, downvote_count, score")
      .eq("id", threadId || commentId)
      .single();

    return NextResponse.json({
      success: true,
      upvotes: content?.upvote_count || 0,
      downvotes: content?.downvote_count || 0,
      score: content?.score || 0,
    });
  } catch (error) {
    return handleApiError(error, "Failed to remove vote");
  }
}

// GET - Check user's vote status and get vote counts
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

    // Check if user has voted on this content
    const { data: existingVote } = await supabase
      .from("votes")
      .select("vote_type")
      .eq("user_id", user.id)
      .eq(threadId ? "thread_id" : "comment_id", threadId || commentId)
      .maybeSingle();

    // Get vote counts
    const { data: content } = await supabase
      .from(threadId ? "threads" : "comments")
      .select("upvote_count, downvote_count, score")
      .eq("id", threadId || commentId)
      .single();

    return NextResponse.json({
      userVote: existingVote?.vote_type || null, // null, 1, or -1
      upvotes: content?.upvote_count || 0,
      downvotes: content?.downvote_count || 0,
      score: content?.score || 0,
    });
  } catch (error) {
    return handleApiError(error, "Failed to get vote status");
  }
}
