import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

type FollowingWithProfile = {
  id: string;
  created_at: string;
  following: {
    id: string;
    username: string;
    avatar_url: string | null;
    bio: string | null;
    level: number;
    reputation: number;
  }[];
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await params;
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  try {
    const supabase = await createClient();

    // Get following with user profiles
    const { data: following, error } = await supabase
      .from("user_follows")
      .select(
        `
        id,
        created_at,
        following:following_id (
          id,
          username,
          avatar_url,
          bio,
          level,
          reputation
        )
      `
      )
      .eq("follower_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching following:", error);
      return NextResponse.json(
        { error: "Failed to fetch following" },
        { status: 500 }
      );
    }

    // Get current user to check if they're following each user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // If logged in, check which users the current user is following
    let followingIds: string[] = [];
    if (user) {
      const { data: userFollowing } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", user.id);

      followingIds = userFollowing?.map((f) => f.following_id) || [];
    }

    // Format response
    const formattedFollowing =
      following?.map((f: FollowingWithProfile) => {
        const followingUser = f.following[0];
        return {
          ...followingUser,
          followedAt: f.created_at,
          isFollowing: user ? followingIds.includes(followingUser.id) : false,
        };
      }) || [];

    // Get total count
    const { count } = await supabase
      .from("user_follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", userId);

    return NextResponse.json({
      following: formattedFollowing,
      total: count || 0,
      page,
      limit,
      hasMore: (count || 0) > offset + limit,
    });
  } catch (error) {
    console.error("Error in following endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
