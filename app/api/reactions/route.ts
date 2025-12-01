import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api-helpers";
import { createClient } from "@/lib/supabase-server";
import {
  ReactionType,
  ContentType,
  ReactionSummary,
  REACTION_TYPES,
  isValidReactionType,
  isValidContentType,
} from "@/lib/reactions";

/**
 * POST /api/reactions - Toggle a reaction (add if not exists, remove if exists)
 * 
 * Request body:
 * - contentType: 'thread' | 'comment'
 * - contentId: string (UUID)
 * - reactionType: ReactionType
 * 
 * Returns updated reaction summaries for the content
 * 
 * Requirements: 1.1, 1.2, 1.3, 6.1
 */
export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireAuth();
    const body = await request.json();
    const { contentType, contentId, reactionType } = body;

    // Validate contentType (Requirement 6.1)
    if (!contentType || !isValidContentType(contentType)) {
      return NextResponse.json(
        { error: "Invalid content type" },
        { status: 400 }
      );
    }

    // Validate contentId
    if (!contentId) {
      return NextResponse.json(
        { error: "Content ID is required" },
        { status: 400 }
      );
    }

    // Validate reactionType against enum (Requirement 6.1)
    if (!reactionType || !isValidReactionType(reactionType)) {
      return NextResponse.json(
        { error: "Invalid reaction type" },
        { status: 400 }
      );
    }

    // Check if user already has this reaction (for toggle behavior)
    const { data: existingReaction } = await supabase
      .from("reactions")
      .select("id")
      .eq("user_id", user.id)
      .eq("content_type", contentType)
      .eq("content_id", contentId)
      .eq("reaction_type", reactionType)
      .maybeSingle();

    let action: "added" | "removed";

    if (existingReaction) {
      // Remove the reaction (Requirement 1.2 - toggle behavior)
      const { error: deleteError } = await supabase
        .from("reactions")
        .delete()
        .eq("id", existingReaction.id);

      if (deleteError) throw deleteError;
      action = "removed";
    } else {
      // Add the reaction (Requirement 1.1)
      const { error: insertError } = await supabase
        .from("reactions")
        .insert({
          user_id: user.id,
          content_type: contentType,
          content_id: contentId,
          reaction_type: reactionType,
        });

      if (insertError) throw insertError;
      action = "added";
    }

    // Get updated reaction summaries
    const reactions = await getReactionSummaries(
      supabase,
      contentType,
      contentId,
      user.id
    );

    return NextResponse.json({
      success: true,
      action,
      reactions,
    });
  } catch (error) {
    // Handle authentication error specifically (Requirement 1.3)
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    return handleApiError(error, "Failed to toggle reaction");
  }
}


/**
 * GET /api/reactions - Get aggregated reactions for content
 * 
 * Query params:
 * - contentType: 'thread' | 'comment'
 * - contentId: string (UUID)
 * 
 * Returns reaction summaries with counts and hasReacted flag
 * 
 * Requirements: 1.4, 2.1
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const contentType = searchParams.get("contentType");
    const contentId = searchParams.get("contentId");

    // Validate contentType
    if (!contentType || !isValidContentType(contentType)) {
      return NextResponse.json(
        { error: "Invalid content type" },
        { status: 400 }
      );
    }

    // Validate contentId
    if (!contentId) {
      return NextResponse.json(
        { error: "Content ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Get current user (optional - for hasReacted flag)
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;

    // Get reaction summaries
    const reactions = await getReactionSummaries(
      supabase,
      contentType as ContentType,
      contentId,
      userId
    );

    return NextResponse.json({
      success: true,
      reactions,
    });
  } catch (error) {
    return handleApiError(error, "Failed to get reactions");
  }
}

/**
 * Helper function to get aggregated reaction summaries for content
 * Returns only reaction types that have at least one reaction (Requirement 1.4)
 */
async function getReactionSummaries(
  supabase: any,
  contentType: ContentType,
  contentId: string,
  userId: string | null
): Promise<ReactionSummary[]> {
  // Get all reactions for this content
  const { data: reactions, error } = await supabase
    .from("reactions")
    .select("reaction_type, user_id")
    .eq("content_type", contentType)
    .eq("content_id", contentId);

  if (error) throw error;

  // Aggregate reactions by type
  const reactionCounts: Record<ReactionType, { count: number; hasReacted: boolean }> = {} as any;

  // Initialize only for types that have reactions
  for (const reaction of reactions || []) {
    const type = reaction.reaction_type as ReactionType;
    if (!reactionCounts[type]) {
      reactionCounts[type] = { count: 0, hasReacted: false };
    }
    reactionCounts[type].count++;
    if (userId && reaction.user_id === userId) {
      reactionCounts[type].hasReacted = true;
    }
  }

  // Convert to array of ReactionSummary (only non-zero counts)
  const summaries: ReactionSummary[] = REACTION_TYPES
    .filter(type => reactionCounts[type]?.count > 0)
    .map(type => ({
      type,
      count: reactionCounts[type].count,
      hasReacted: reactionCounts[type].hasReacted,
    }));

  return summaries;
}
