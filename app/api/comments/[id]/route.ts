import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createCommentSchema } from "@/lib/validations";
import { requireAuth, handleApiError } from "@/lib/api-helpers";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = createCommentSchema.parse(body);

    // Check authentication
    const { user, supabase } = await requireAuth();

    // Verify comment exists and user owns it
    const { data: comment, error: commentError } = await supabase
      .from("comments")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (commentError || !comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (comment.user_id !== user.id) {
      return NextResponse.json(
        { error: "You can only edit your own comments" },
        { status: 403 }
      );
    }

    // Update comment
    const { data: updatedComment, error: updateError } = await supabase
      .from("comments")
      .update({
        content: validatedData.content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(updatedComment);
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    return handleApiError(error, "Error al actualizar el comentario");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check authentication
    const { user, supabase } = await requireAuth();

    // Verify comment exists and user owns it
    const { data: comment, error: commentError } = await supabase
      .from("comments")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (commentError || !comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (comment.user_id !== user.id) {
      return NextResponse.json(
        { error: "You can only delete your own comments" },
        { status: 403 }
      );
    }

    // Delete comment
    const { error: deleteError } = await supabase
      .from("comments")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    return handleApiError(error, "Error al eliminar el comentario");
  }
}

