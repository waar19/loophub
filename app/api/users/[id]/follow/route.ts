import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: followingId } = await params;

  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Cannot follow yourself
    if (user.id === followingId) {
      return NextResponse.json(
        { error: "Cannot follow yourself" },
        { status: 400 }
      );
    }

    // Check if already following
    const { data: existing } = await supabase
      .from("user_follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", followingId)
      .single();

    if (existing) {
      // Already following, return current state
      const { data: followerCount } = await supabase.rpc("get_follower_count", {
        p_user_id: followingId,
      });

      return NextResponse.json({
        isFollowing: true,
        followerCount: followerCount || 0,
      });
    }

    // Create follow relationship
    const { error: insertError } = await supabase.from("user_follows").insert({
      follower_id: user.id,
      following_id: followingId,
    });

    if (insertError) {
      console.error("Error creating follow:", insertError);
      return NextResponse.json(
        { error: "Failed to follow user" },
        { status: 500 }
      );
    }

    // Get updated follower count
    const { data: followerCount } = await supabase.rpc("get_follower_count", {
      p_user_id: followingId,
    });

    // Create notification for the followed user
    await supabase.from("notifications").insert({
      user_id: followingId,
      type: "follow",
      content: `started following you`,
      from_user_id: user.id,
    });

    return NextResponse.json({
      isFollowing: true,
      followerCount: followerCount || 0,
    });
  } catch (error) {
    console.error("Error in follow endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: followingId } = await params;

  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete follow relationship
    const { error: deleteError } = await supabase
      .from("user_follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", followingId);

    if (deleteError) {
      console.error("Error deleting follow:", deleteError);
      return NextResponse.json(
        { error: "Failed to unfollow user" },
        { status: 500 }
      );
    }

    // Get updated follower count
    const { data: followerCount } = await supabase.rpc("get_follower_count", {
      p_user_id: followingId,
    });

    return NextResponse.json({
      isFollowing: false,
      followerCount: followerCount || 0,
    });
  } catch (error) {
    console.error("Error in unfollow endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
