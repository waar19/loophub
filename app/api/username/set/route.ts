import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

/**
 * POST /api/username/set
 * Sets username for a user during onboarding
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { username } = await request.json();

    // Validate format
    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    // Check length
    if (username.length < 3 || username.length > 30) {
      return NextResponse.json(
        { error: "Username must be between 3-30 characters" },
        { status: 400 }
      );
    }

    // Check format
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { error: "Username can only contain letters, numbers, and underscores" },
        { status: 400 }
      );
    }

    // Check if user already has a username
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    if (currentProfile?.username) {
      return NextResponse.json(
        { error: "Username already set" },
        { status: 400 }
      );
    }

    // Update profile with new username
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ username })
      .eq('id', user.id);

    if (updateError) {
      // Check if it's a duplicate username error
      if (updateError.code === '23505') {
        return NextResponse.json(
          { error: "Username is already taken" },
          { status: 409 }
        );
      }
      
      console.error('Error setting username:', updateError);
      return NextResponse.json(
        { error: "Error setting username" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in set username:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
