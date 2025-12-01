import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

type FollowerRecord = {
  id: string;
  created_at: string;
  follower: {
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

    // Get followers with user profiles
    const { data: followers, error } = await supabase
      .from("user_follows")
      .select(
        `
        id,
        created_at,
        follower:follower_id (
          id,
          username,
          avatar_url,
          bio,
          level,
          reputation
        )
      `
      )
      .eq("following_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching followers:", error);
      return NextResponse.json(
        { error: "Failed to fetch followers" },
        { status: 500 }
      );
    }

    // Get current user to check if they're following each follower
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // If logged in, check which followers the current user is following
    let followingIds: string[] = [];
    if (user) {
      const { data: following } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", user.id);

      followingIds = following?.map((f) => f.following_id) || [];
    }

    // Format response
    const formattedFollowers =
      followers?.map((f: FollowerRecord) => ({
        ...f.follower[0],
        followedAt: f.created_at,
        isFollowing: user ? followingIds.includes(f.follower[0].id) : false,
      })) || [];

    // Get total count
    const { count } = await supabase
      .from("user_follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", userId);

    return NextResponse.json({
      followers: formattedFollowers,
      total: count || 0,
      page,
      limit,
      hasMore: (count || 0) > offset + limit,
    });
  } catch (error) {
    console.error("Error in followers endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
