import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

/**
 * POST /api/username/check
 * Validates if a username is available
 */
export async function POST(request: Request) {
  try {
    const { username } = await request.json();

    // Validate format
    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { available: false, error: "Username is required" },
        { status: 400 }
      );
    }

    // Check length
    if (username.length < 3 || username.length > 30) {
      return NextResponse.json(
        { available: false, error: "Username must be between 3-30 characters" },
        { status: 400 }
      );
    }

    // Check format (alphanumeric + underscore only)
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { available: false, error: "Username can only contain letters, numbers, and underscores" },
        { status: 400 }
      );
    }

    // Check if username exists in database
    const supabase = await createClient();
    const { data: existingProfile, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .maybeSingle();

    if (error) {
      console.error('Error checking username:', error);
      return NextResponse.json(
        { available: false, error: "Error checking username availability" },
        { status: 500 }
      );
    }

    // Username is available if no existing profile found
    const available = !existingProfile;

    return NextResponse.json({
      available,
      error: available ? null : "Username is already taken",
    });

  } catch (error) {
    console.error('Error in username check:', error);
    return NextResponse.json(
      { available: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
