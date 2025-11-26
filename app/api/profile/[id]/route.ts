import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { handleApiError } from "@/lib/api-helpers";

// GET - Get user profile by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (profileError) throw profileError;

    return NextResponse.json(profile);
  } catch (error) {
    return handleApiError(error, "Failed to get profile");
  }
}
