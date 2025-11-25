import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { requireAuth, handleApiError } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    const { user } = await requireAuth();
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const unreadOnly = searchParams.get("unread") === "true";

    // Build query
    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      query = query.eq("read", false);
    }

    const { data: notifications, error } = await query;

    if (error) throw error;

    // Get unread count
    const { count: unreadCount, error: countError } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false);

    if (countError) throw countError;

    return NextResponse.json({
      notifications: notifications || [],
      unreadCount: unreadCount || 0,
      total: notifications?.length || 0,
    });
  } catch (error) {
    return handleApiError(error, "Error al obtener notificaciones");
  }
}

