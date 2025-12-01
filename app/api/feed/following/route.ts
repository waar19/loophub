import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

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

    // Get list of users the current user follows
    const { data: following } = await supabase
      .from("user_follows")
      .select("following_id")
      .eq("follower_id", user.id);

    const followingIds = following?.map((f) => f.following_id) || [];

    if (followingIds.length === 0) {
      return NextResponse.json({
        threads: [],
        total: 0,
        page,
        limit,
        hasMore: false,
      });
    }

    // Get threads from followed users
    const { data: threads, error: threadsError } = await supabase
      .from("threads")
      .select(
        `
        id,
        title,
        content,
        created_at,
        upvote_count,
        downvote_count,
        score,
        user_id,
        forum_id,
        profiles!threads_user_id_fkey (
          id,
          username,
          avatar_url,
          level
        ),
        forums (
          id,
          name,
          slug
        ),
        comments (count)
      `
      )
      .in("user_id", followingIds)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (threadsError) {
      console.error("Error fetching following feed:", threadsError);
      return NextResponse.json(
        { error: "Failed to fetch feed" },
        { status: 500 }
      );
    }

    // Get total count
    const { count } = await supabase
      .from("threads")
      .select("*", { count: "exact", head: true })
      .in("user_id", followingIds);

    // Format threads
    const formattedThreads =
      threads?.map((thread: any) => ({
        id: thread.id,
        title: thread.title,
        content: thread.content,
        created_at: thread.created_at,
        score: thread.score || 0,
        upvote_count: thread.upvote_count || 0,
        downvote_count: thread.downvote_count || 0,
        comment_count: Array.isArray(thread.comments)
          ? thread.comments.length
          : thread.comments?.count || 0,
        author: {
          id: thread.profiles?.id,
          username: thread.profiles?.username,
          avatar_url: thread.profiles?.avatar_url,
          level: thread.profiles?.level,
        },
        forum: thread.forums
          ? {
              id: thread.forums.id,
              name: thread.forums.name,
              slug: thread.forums.slug,
            }
          : null,
      })) || [];

    return NextResponse.json({
      threads: formattedThreads,
      total: count || 0,
      page,
      limit,
      hasMore: (count || 0) > offset + limit,
    });
  } catch (error) {
    console.error("Error in following feed endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
