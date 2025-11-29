import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// GET - List community members
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    
    const role = searchParams.get('role'); // filter by role
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get community
    const { data: community } = await supabase
      .from('communities')
      .select('id, visibility')
      .eq('slug', slug)
      .single();

    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    // Check access for private communities
    if (community.visibility !== 'public') {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { data: membership } = await supabase
        .from('community_members')
        .select('role')
        .eq('community_id', community.id)
        .eq('user_id', user.id)
        .single();

      if (!membership) {
        return NextResponse.json({ error: 'Not a member' }, { status: 403 });
      }
    }

    // Build query
    let query = supabase
      .from('community_members')
      .select(`
        id,
        role,
        joined_at,
        user:profiles(id, username, avatar_url, level, karma)
      `, { count: 'exact' })
      .eq('community_id', community.id);

    if (role) {
      query = query.eq('role', role);
    }

    query = query
      .order('role', { ascending: true }) // owner first, then mod, then member
      .order('joined_at', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data: members, error, count } = await query;

    if (error) {
      console.error('Error fetching members:', error);
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }

    return NextResponse.json({
      members: members || [],
      total: count || 0,
      hasMore: (offset + limit) < (count || 0),
    });

  } catch (error) {
    console.error('Members GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update member role (promote/demote)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get community
    const { data: community } = await supabase
      .from('communities')
      .select('id, created_by')
      .eq('slug', slug)
      .single();

    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    // Check if requester is owner or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    const { data: requesterMembership } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', community.id)
      .eq('user_id', user.id)
      .single();

    const isOwner = requesterMembership?.role === 'owner';
    const isAdmin = profile?.is_admin;

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Only owner can manage members' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json({ error: 'userId and role required' }, { status: 400 });
    }

    if (!['moderator', 'member'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Cannot change owner's role
    if (userId === community.created_by) {
      return NextResponse.json({ error: 'Cannot change owner role' }, { status: 400 });
    }

    // Update role
    const { error: updateError } = await supabase
      .from('community_members')
      .update({ role })
      .eq('community_id', community.id)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating member role:', updateError);
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Members PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove member (kick)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    // Get community
    const { data: community } = await supabase
      .from('communities')
      .select('id, created_by')
      .eq('slug', slug)
      .single();

    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    // Check if requester has permission
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    const { data: requesterMembership } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', community.id)
      .eq('user_id', user.id)
      .single();

    const isOwner = requesterMembership?.role === 'owner';
    const isMod = requesterMembership?.role === 'moderator';
    const isAdmin = profile?.is_admin;

    // Get target member
    const { data: targetMember } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', community.id)
      .eq('user_id', userId)
      .single();

    if (!targetMember) {
      return NextResponse.json({ error: 'User is not a member' }, { status: 400 });
    }

    // Cannot remove owner
    if (targetMember.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove owner' }, { status: 400 });
    }

    // Mods can only remove members, not other mods
    if (isMod && targetMember.role === 'moderator') {
      return NextResponse.json({ error: 'Moderators cannot remove other moderators' }, { status: 403 });
    }

    // Must be owner, mod, or admin
    if (!isOwner && !isMod && !isAdmin) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Remove member
    const { error: deleteError } = await supabase
      .from('community_members')
      .delete()
      .eq('community_id', community.id)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error removing member:', deleteError);
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Members DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
