import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { requireAuth, handleApiError } from "@/lib/api-helpers";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuth();
    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();

    // Verify notification belongs to user
    const { data: notification, error: fetchError } = await supabase
      .from("notifications")
      .select("user_id")
      .eq("id", id)
      .single();

    if (fetchError || !notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    if (notification.user_id !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Update notification
    const { data, error } = await supabase
      .from("notifications")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error, "Error al actualizar la notificación");
  }
}

