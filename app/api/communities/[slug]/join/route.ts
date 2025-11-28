import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// POST - Join community
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
      .select('id, visibility, member_limit, require_approval')
      .eq('slug', slug)
      .single();

    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', community.id)
      .eq('user_id', user.id)
      .single();

    if (existingMember) {
      return NextResponse.json({ error: 'Already a member' }, { status: 400 });
    }

    // Check member limit
    if (community.member_limit) {
      const { count: memberCount } = await supabase
        .from('community_members')
        .select('*', { count: 'exact', head: true })
        .eq('community_id', community.id);

      if ((memberCount || 0) >= community.member_limit) {
        return NextResponse.json({ error: 'Community is full' }, { status: 400 });
      }
    }

    // Handle based on visibility
    if (community.visibility === 'public' && !community.require_approval) {
      // Direct join for public communities
      const { error: joinError } = await supabase
        .from('community_members')
        .insert({
          community_id: community.id,
          user_id: user.id,
          role: 'member',
        });

      if (joinError) {
        console.error('Error joining community:', joinError);
        return NextResponse.json({ error: 'Failed to join community' }, { status: 500 });
      }

      return NextResponse.json({ success: true, status: 'joined' });
    } else {
      // Request to join for private/invite_only communities
      const body = await request.json().catch(() => ({}));
      const { message } = body;

      // Check for existing pending request
      const { data: existingRequest } = await supabase
        .from('community_join_requests')
        .select('id, status')
        .eq('community_id', community.id)
        .eq('user_id', user.id)
        .single();

      if (existingRequest) {
        if (existingRequest.status === 'pending') {
          return NextResponse.json({ error: 'Request already pending' }, { status: 400 });
        }
        // Update rejected request to pending
        await supabase
          .from('community_join_requests')
          .update({ status: 'pending', message, reviewed_by: null, reviewed_at: null })
          .eq('id', existingRequest.id);
      } else {
        const { error: requestError } = await supabase
          .from('community_join_requests')
          .insert({
            community_id: community.id,
            user_id: user.id,
            message: message || null,
          });

        if (requestError) {
          console.error('Error creating join request:', requestError);
          return NextResponse.json({ error: 'Failed to request to join' }, { status: 500 });
        }
      }

      // TODO: Notify community owner/mods

      return NextResponse.json({ success: true, status: 'requested' });
    }

  } catch (error) {
    console.error('Join community error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Leave community
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Check membership
    const { data: member } = await supabase
      .from('community_members')
      .select('id, role')
      .eq('community_id', community.id)
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'Not a member' }, { status: 400 });
    }

    // Owner cannot leave (must transfer ownership or delete community)
    if (member.role === 'owner') {
      return NextResponse.json({ 
        error: 'Owner cannot leave. Transfer ownership or delete the community.' 
      }, { status: 400 });
    }

    // Leave
    const { error: leaveError } = await supabase
      .from('community_members')
      .delete()
      .eq('id', member.id);

    if (leaveError) {
      console.error('Error leaving community:', leaveError);
      return NextResponse.json({ error: 'Failed to leave community' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Leave community error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
