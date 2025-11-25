import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { requireAuth, handleApiError } from "@/lib/api-helpers";

export async function POST(request: Request) {
  try {
    const { user } = await requireAuth();
    const supabase = await createClient();

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "Error al marcar todas las notificaciones como leídas");
  }
}

