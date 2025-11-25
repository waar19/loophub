import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createCommentSchema } from "@/lib/validations";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    // Get comments for this thread
    const { data: comments, error: commentsError } = await supabase
      .from("comments")
      .select("*")
      .eq("thread_id", id)
      .order("created_at", { ascending: true });

    if (commentsError) throw commentsError;

    return NextResponse.json({ thread, comments: comments || [] });
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

    // Verify thread exists
    const { data: thread, error: threadError } = await supabase
      .from("threads")
      .select("id")
      .eq("id", id)
      .single();

    if (threadError || !thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Create comment
    const { data: comment, error: commentError } = await supabase
      .from("comments")
      .insert([
        {
          ...validatedData,
          thread_id: id,
        },
      ])
      .select()
      .single();

    if (commentError) throw commentError;

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("Error creating comment:", error);

    if (error instanceof Error && "issues" in error) {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}
