import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api-helpers";
import { z } from "zod";

// Schema for profile update
const updateProfileSchema = z.object({
  bio: z.string().max(500).optional().nullable(),
  website: z.string().url().optional().nullable().or(z.literal("")),
  location: z.string().max(100).optional().nullable(),
});

// PUT - Update user profile
export async function PUT(request: Request) {
  try {
    const { user, supabase } = await requireAuth();
    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);

    // Update profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update({
        bio: validatedData.bio || null,
        website: validatedData.website || null,
        location: validatedData.location || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(updatedProfile);
  } catch (error) {
    return handleApiError(error, "Failed to update profile");
  }
}

// GET - Get current user profile
export async function GET() {
  try {
    const { user, supabase } = await requireAuth();

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;

    return NextResponse.json(profile);
  } catch (error) {
    return handleApiError(error, "Failed to get profile");
  }
}
