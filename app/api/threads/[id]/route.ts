import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createThreadSchema } from "@/lib/validations";
import { requireAuth, handleApiError, checkRateLimit } from "@/lib/api-helpers";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = createThreadSchema.parse(body);

    // Check authentication
    const { user, supabase } = await requireAuth();

    // Check rate limit for thread edits (using threads limit)
    const rateLimitError = checkRateLimit(request, "threads", user.id);
    if (rateLimitError) return rateLimitError;

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
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    return handleApiError(error, "Error al actualizar el hilo");
  }
}

