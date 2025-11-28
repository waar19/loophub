import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

interface RouteParams {
  params: Promise<{ code: string }>;
}

// GET - Get invite info
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params;
    const supabase = await createClient();

    // Get invite with community info
    const { data: invite, error } = await supabase
      .from('community_invites')
      .select(`
        id,
        code,
        max_uses,
        uses,
        expires_at,
        community:communities(
          id,
          name,
          slug,
          description,
          avatar_url,
          visibility
        )
      `)
      .eq('code', code)
      .single();

    if (error || !invite) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
    }

    // Check if expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invite has expired' }, { status: 410 });
    }

    // Check if max uses reached
    if (invite.max_uses && invite.uses >= invite.max_uses) {
      return NextResponse.json({ error: 'Invite has reached maximum uses' }, { status: 410 });
    }

    return NextResponse.json({ invite });

  } catch (error) {
    console.error('Invite GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Use invite to join community
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get invite with community info
    const { data: invite, error } = await supabase
      .from('community_invites')
      .select(`
        id,
        code,
        max_uses,
        uses,
        expires_at,
        community_id,
        community:communities(
          id,
          name,
          slug,
          member_count,
          max_members
        )
      `)
      .eq('code', code)
      .single();

    if (error || !invite) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
    }

    // Check if expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invite has expired' }, { status: 410 });
    }

    // Check if max uses reached
    if (invite.max_uses && invite.uses >= invite.max_uses) {
      return NextResponse.json({ error: 'Invite has reached maximum uses' }, { status: 410 });
    }

    // Get community data (Supabase returns array for joins)
    const communityData = invite.community;
    const community = (Array.isArray(communityData) ? communityData[0] : communityData) as {
      id: string;
      name: string;
      slug: string;
      member_count: number;
      max_members: number | null;
    } | undefined;

    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    // Check if community is full
    if (community.max_members && community.member_count >= community.max_members) {
      return NextResponse.json({ error: 'Community is full' }, { status: 400 });
    }

    // Check if already a member
    const { data: existingMembership } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', invite.community_id)
      .eq('user_id', user.id)
      .single();

    if (existingMembership) {
      return NextResponse.json({ 
        error: 'Already a member',
        community: { slug: community.slug }
      }, { status: 400 });
    }

    // Join the community
    const { error: joinError } = await supabase
      .from('community_members')
      .insert({
        community_id: invite.community_id,
        user_id: user.id,
        role: 'member',
      });

    if (joinError) {
      console.error('Error joining community:', joinError);
      return NextResponse.json({ error: 'Failed to join community' }, { status: 500 });
    }

    // Increment invite uses
    await supabase
      .from('community_invites')
      .update({ uses: invite.uses + 1 })
      .eq('id', invite.id);

    // Increment member count
    await supabase
      .from('communities')
      .update({ member_count: community.member_count + 1 })
      .eq('id', invite.community_id);

    return NextResponse.json({ 
      success: true,
      community: { 
        name: community.name,
        slug: community.slug 
      }
    });

  } catch (error) {
    console.error('Invite POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
