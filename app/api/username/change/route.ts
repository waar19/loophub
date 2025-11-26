import { createClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get new username from request
    const { username: newUsername } = await request.json();

    if (!newUsername) {
      return NextResponse.json(
        { success: false, error: 'Username is required' },
        { status: 400 }
      );
    }

    // Call the database function to change username
    const { data, error } = await supabase.rpc('change_username', {
      new_username_param: newUsername
    });

    if (error) {
      console.error('Error changing username:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // The function returns a JSON object with the result
    const result = data as {
      success: boolean;
      error?: string;
      message?: string;
      can_change?: boolean;
      previous_username?: string;
      new_username?: string;
    };

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      can_change: result.can_change,
      previous_username: result.previous_username,
      new_username: result.new_username
    });

  } catch (error) {
    console.error('Error in username change API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
