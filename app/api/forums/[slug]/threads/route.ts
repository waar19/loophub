import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createThreadSchema } from "@/lib/validations";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Get forum by slug
    const { data: forum, error: forumError } = await supabase
      .from("forums")
      .select("*")
      .eq("slug", slug)
      .single();

    if (forumError || !forum) {
      return NextResponse.json({ error: "Forum not found" }, { status: 404 });
    }

    // Get threads for this forum
    const { data: threads, error: threadsError } = await supabase
      .from("threads")
      .select(
        `
        *,
        comments:comments(count),
        profile:profiles(username)
      `
      )
      .eq("forum_id", forum.id)
      .order("created_at", { ascending: false });

    if (threadsError) throw threadsError;

    // Transform count data
    const threadsWithCount = threads?.map((thread) => ({
      ...thread,
      _count: {
        comments: thread.comments[0]?.count || 0,
      },
    }));

    return NextResponse.json({ forum, threads: threadsWithCount || [] });
  } catch (error) {
    console.error("Error fetching threads:", error);
    return NextResponse.json(
      { error: "Failed to fetch threads" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const validatedData = createThreadSchema.parse(body);

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

    // Get forum by slug
    const { data: forum, error: forumError } = await supabase
      .from("forums")
      .select("id")
      .eq("slug", slug)
      .single();

    if (forumError || !forum) {
      return NextResponse.json({ error: "Forum not found" }, { status: 404 });
    }

    // Create thread with user_id
    const { data: thread, error: threadError } = await supabase
      .from("threads")
      .insert([
        {
          ...validatedData,
          forum_id: forum.id,
          user_id: user.id,
        },
      ])
      .select()
      .single();

    if (threadError) throw threadError;

    return NextResponse.json(thread, { status: 201 });
  } catch (error) {
    console.error("Error creating thread:", error);

    if (error instanceof Error && "issues" in error) {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create thread" },
      { status: 500 }
    );
  }
}
