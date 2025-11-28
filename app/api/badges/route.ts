import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// GET /api/badges - Get all badges or user's badges
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (userId) {
      // Get user's badges
      const { data: userBadges, error } = await supabase
        .from('user_badges')
        .select(`
          id,
          earned_at,
          badge:badges(
            id,
            name,
            slug,
            description,
            icon,
            color,
            category
          )
        `)
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      if (error) throw error;

      return NextResponse.json({ badges: userBadges });
    } else {
      // Get all available badges
      const { data: badges, error } = await supabase
        .from('badges')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true });

      if (error) throw error;

      return NextResponse.json({ badges });
    }
  } catch (error) {
    console.error('Error fetching badges:', error);
    return NextResponse.json({ error: 'Failed to fetch badges' }, { status: 500 });
  }
}

// POST /api/badges/check - Check and award badges for current user
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check and award badges
    const { data: newBadges, error } = await supabase.rpc('check_and_award_badges', {
      p_user_id: user.id
    });

    if (error) {
      console.error('Error checking badges:', error);
      throw error;
    }

    return NextResponse.json({ 
      success: true, 
      newBadges: newBadges || [],
      message: newBadges && newBadges.length > 0 
        ? `You earned ${newBadges.length} new badge(s)!` 
        : 'No new badges earned'
    });
  } catch (error) {
    console.error('Error awarding badges:', error);
    return NextResponse.json({ error: 'Failed to check badges' }, { status: 500 });
  }
}
