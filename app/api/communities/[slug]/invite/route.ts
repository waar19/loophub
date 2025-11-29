import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { nanoid } from 'nanoid';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// GET - List community invites
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

    // Get invites
    const { data: invites, error } = await supabase
      .from('community_invites')
      .select(`
        id,
        code,
        max_uses,
        uses,
        expires_at,
        created_at,
        creator:profiles!community_invites_created_by_fkey(username)
      `)
      .eq('community_id', community.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invites:', error);
      return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 });
    }

    return NextResponse.json({ invites: invites || [] });

  } catch (error) {
    console.error('Invites GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create invite
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

    const body = await request.json();
    const { maxUses, expiresIn } = body; // expiresIn in hours

    // Generate unique code
    const code = nanoid(10);

    // Calculate expiry
    let expiresAt = null;
    if (expiresIn && expiresIn > 0) {
      expiresAt = new Date(Date.now() + expiresIn * 60 * 60 * 1000).toISOString();
    }

    // Create invite
    const { data: invite, error: createError } = await supabase
      .from('community_invites')
      .insert({
        community_id: community.id,
        code,
        max_uses: maxUses || null,
        expires_at: expiresAt,
        created_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating invite:', createError);
      return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
    }

    return NextResponse.json({ invite }, { status: 201 });

  } catch (error) {
    console.error('Invites POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete invite
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const inviteId = searchParams.get('id');

    if (!inviteId) {
      return NextResponse.json({ error: 'Invite ID required' }, { status: 400 });
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

    // Delete invite
    const { error: deleteError } = await supabase
      .from('community_invites')
      .delete()
      .eq('id', inviteId)
      .eq('community_id', community.id);

    if (deleteError) {
      console.error('Error deleting invite:', deleteError);
      return NextResponse.json({ error: 'Failed to delete invite' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Invites DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
