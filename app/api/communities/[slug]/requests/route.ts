import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// GET - List pending join requests
export async function GET(request: NextRequest, { params }: RouteParams) {
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
      .select('id')
      .eq('slug', slug)
      .single();

    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    // Check if user is owner or mod
    const { data: membership } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', community.id)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'moderator'].includes(membership.role)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Get pending requests
    const { data: requests, error } = await supabase
      .from('community_join_requests')
      .select(`
        id,
        message,
        created_at,
        user:profiles!community_join_requests_user_id_fkey(
          id,
          username,
          avatar_url,
          karma,
          level
        )
      `)
      .eq('community_id', community.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching requests:', error);
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
    }

    return NextResponse.json({ requests: requests || [] });

  } catch (error) {
    console.error('Requests GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create join request (for users wanting to join)
export async function POST(request: NextRequest, { params }: RouteParams) {
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
      .select('id, visibility')
      .eq('slug', slug)
      .single();

    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    if (community.visibility !== 'private') {
      return NextResponse.json({ error: 'Community does not require request to join' }, { status: 400 });
    }

    // Check if already a member
    const { data: existingMembership } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', community.id)
      .eq('user_id', user.id)
      .single();

    if (existingMembership) {
      return NextResponse.json({ error: 'Already a member' }, { status: 400 });
    }

    // Check if already has pending request
    const { data: existingRequest } = await supabase
      .from('community_join_requests')
      .select('id')
      .eq('community_id', community.id)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .single();

    if (existingRequest) {
      return NextResponse.json({ error: 'Request already pending' }, { status: 400 });
    }

    const body = await request.json();
    const { message } = body;

    // Create request
    const { data: joinRequest, error: createError } = await supabase
      .from('community_join_requests')
      .insert({
        community_id: community.id,
        user_id: user.id,
        message: message || null,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating request:', createError);
      return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
    }

    return NextResponse.json({ request: joinRequest }, { status: 201 });

  } catch (error) {
    console.error('Requests POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Approve or reject request
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { requestId, action } = body; // action: 'approve' | 'reject'

    if (!requestId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Get community
    const { data: community } = await supabase
      .from('communities')
      .select('id, member_count, max_members')
      .eq('slug', slug)
      .single();

    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    // Check if user is owner or mod
    const { data: membership } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', community.id)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'moderator'].includes(membership.role)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Get the request
    const { data: joinRequest } = await supabase
      .from('community_join_requests')
      .select('id, user_id, status')
      .eq('id', requestId)
      .eq('community_id', community.id)
      .single();

    if (!joinRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (joinRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Request already processed' }, { status: 400 });
    }

    if (action === 'approve') {
      // Check if community is full
      if (community.max_members && community.member_count >= community.max_members) {
        return NextResponse.json({ error: 'Community is full' }, { status: 400 });
      }

      // Add member
      const { error: memberError } = await supabase
        .from('community_members')
        .insert({
          community_id: community.id,
          user_id: joinRequest.user_id,
          role: 'member',
        });

      if (memberError) {
        console.error('Error adding member:', memberError);
        return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
      }

      // Increment member count
      await supabase
        .from('communities')
        .update({ member_count: community.member_count + 1 })
        .eq('id', community.id);
    }

    // Update request status
    const { error: updateError } = await supabase
      .from('community_join_requests')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('Error updating request:', updateError);
      return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
    }

    return NextResponse.json({ success: true, action });

  } catch (error) {
    console.error('Requests PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
