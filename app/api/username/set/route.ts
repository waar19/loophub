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

    // Use the change_username function to handle initial setup
    const { data, error } = await supabase.rpc('change_username', {
      new_username_param: username
    });

    if (error) {
      console.error('Error setting username:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // The function returns a JSON object with the result
    const result = data as {
      success: boolean;
      error?: string;
      message?: string;
      can_change?: boolean;
      new_username?: string;
    };

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true,
      username: result.new_username,
      can_change: result.can_change
    });

  } catch (error) {
    console.error('Error in set username:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
