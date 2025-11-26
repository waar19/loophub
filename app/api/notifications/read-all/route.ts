import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { requireAuth, handleApiError } from "@/lib/api-helpers";

export async function POST(request: Request) {
  try {
    const { user } = await requireAuth();
    const supabase = await createClient();

    // Use the database function for better performance
    const { data, error } = await supabase.rpc('mark_all_notifications_read', {
      p_user_id: user.id
    });

    if (error) throw error;

    return NextResponse.json({ success: true, count: data || 0 });
  } catch (error) {
    return handleApiError(error, "Error al marcar todas las notificaciones como leídas");
  }
}

