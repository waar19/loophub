import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// GET - Get trending communities based on recent activity
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20);
    const period = searchParams.get('period') || 'week'; // day, week, month

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'week':
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
    }

    // Get public communities with their activity
    const { data: communities, error } = await supabase
      .from('communities')
      .select(`
        id,
        name,
        slug,
        description,
        image_url,
        banner_url,
        theme_color,
        visibility,
        created_at,
        category:community_categories(id, name, slug, icon)
      `)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching communities:', error);
      return NextResponse.json({ error: 'Failed to fetch communities' }, { status: 500 });
    }

    // Calculate trending score for each community
    const communitiesWithScores = await Promise.all(
      (communities || []).map(async (community) => {
        // Get member count
        const { count: memberCount } = await supabase
          .from('community_members')
          .select('*', { count: 'exact', head: true })
          .eq('community_id', community.id);

        // Get new members in period
        const { count: newMembers } = await supabase
          .from('community_members')
          .select('*', { count: 'exact', head: true })
          .eq('community_id', community.id)
          .gte('joined_at', startDate.toISOString());

        // Get threads in period (if threads can be in communities)
        // For now, we'll use member growth as the main metric
        
        // Calculate trending score
        // Formula: (newMembers * 10) + (totalMembers * 0.5) + recencyBonus
        const daysSinceCreation = Math.max(1, Math.floor((now.getTime() - new Date(community.created_at).getTime()) / (24 * 60 * 60 * 1000)));
        const recencyBonus = daysSinceCreation <= 7 ? 20 : daysSinceCreation <= 30 ? 10 : 0;
        
        const trendingScore = 
          ((newMembers || 0) * 10) + 
          ((memberCount || 0) * 0.5) + 
          recencyBonus;

        return {
          ...community,
          member_count: memberCount || 0,
          new_members: newMembers || 0,
          trending_score: trendingScore,
        };
      })
    );

    // Sort by trending score and take top N
    const trendingCommunities = communitiesWithScores
      .sort((a, b) => b.trending_score - a.trending_score)
      .slice(0, limit);

    return NextResponse.json({
      communities: trendingCommunities,
      period,
    });

  } catch (error) {
    console.error('Trending communities error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
