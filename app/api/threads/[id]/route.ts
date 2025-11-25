import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createThreadSchema } from "@/lib/validations";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
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

    // Verify thread exists and user owns it
    const { data: thread, error: threadError } = await supabase
      .from("threads")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (threadError || !thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    if (thread.user_id !== user.id) {
      return NextResponse.json(
        { error: "You can only edit your own threads" },
        { status: 403 }
      );
    }

    // Update thread
    const { data: updatedThread, error: updateError } = await supabase
      .from("threads")
      .update({
        title: validatedData.title,
        content: validatedData.content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(updatedThread);
  } catch (error) {
    console.error("Error updating thread:", error);

    if (error instanceof Error && "issues" in error) {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update thread" },
      { status: 500 }
    );
  }
}

