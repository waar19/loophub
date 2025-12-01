import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-helpers";
import { createClient } from "@/lib/supabase-server";
import {
  ReactorInfo,
  isValidReactionType,
  isValidContentType,
} from "@/lib/reactions";

/**
 * GET /api/reactions/users - Get list of users who reacted
 * 
 * Query params:
 * - contentType: 'thread' | 'comment'
 * - contentId: string (UUID)
 * - reactionType: ReactionType
 * 
 * Returns list of users who reacted (max 10)
 * - Current user shown first if they reacted
 * - Others ordered by timestamp (most recent first)
 * 
 * Requirements: 2.1, 2.2, 2.3
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const contentType = searchParams.get("contentType");
    const contentId = searchParams.get("contentId");
    const reactionType = searchParams.get("reactionType");

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

    // Validate reactionType
    if (!reactionType || !isValidReactionType(reactionType)) {
      return NextResponse.json(
        { error: "Invalid reaction type" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Get current user (optional - for ordering)
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user?.id || null;

    // Get total count of reactions of this type
    const { count: totalCount, error: countError } = await supabase
      .from("reactions")
      .select("*", { count: "exact", head: true })
      .eq("content_type", contentType)
      .eq("content_id", contentId)
      .eq("reaction_type", reactionType);

    if (countError) throw countError;

    // Get reactions with user profiles (max 10)
    // Order by created_at descending (most recent first) - Requirement 2.2
    const { data: reactions, error: reactionsError } = await supabase
      .from("reactions")
      .select(`
        user_id,
        created_at,
        profiles:user_id (
          username,
          avatar_url
        )
      `)
      .eq("content_type", contentType)
      .eq("content_id", contentId)
      .eq("reaction_type", reactionType)
      .order("created_at", { ascending: false })
      .limit(10);

    if (reactionsError) throw reactionsError;

    // Transform to ReactorInfo array
    let reactors: ReactorInfo[] = (reactions || []).map((reaction: any) => ({
      userId: reaction.user_id,
      username: reaction.profiles?.username || "Unknown",
      avatarUrl: reaction.profiles?.avatar_url || null,
      reactedAt: reaction.created_at,
    }));

    // Move current user to front if they reacted (Requirement 2.3)
    if (currentUserId) {
      const currentUserIndex = reactors.findIndex(r => r.userId === currentUserId);
      if (currentUserIndex > 0) {
        const [currentUserReactor] = reactors.splice(currentUserIndex, 1);
        reactors.unshift(currentUserReactor);
      }
    }

    return NextResponse.json({
      success: true,
      reactors,
      totalCount: totalCount || 0,
    });
  } catch (error) {
    return handleApiError(error, "Failed to get reactors");
  }
}
