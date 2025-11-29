import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// GET - Get community details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: community, error } = await supabase
      .from('communities')
      .select(`
        *,
        category:community_categories(id, name, slug, icon),
        creator:profiles!communities_created_by_fkey(id, username, avatar_url)
      `)
      .eq('slug', slug)
      .single();

    if (error || !community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    // Get member count
    const { count: memberCount } = await supabase
      .from('community_members')
      .select('*', { count: 'exact', head: true })
      .eq('community_id', community.id);

    // Check if current user is a member
    const { data: { user } } = await supabase.auth.getUser();
    let membership = null;
    let pendingRequest = null;

    if (user) {
      const { data: member } = await supabase
        .from('community_members')
        .select('role, joined_at')
        .eq('community_id', community.id)
        .eq('user_id', user.id)
        .single();
      
      membership = member;

      // Check for pending request
      if (!member && community.visibility !== 'public') {
        const { data: request } = await supabase
          .from('community_join_requests')
          .select('status, created_at')
          .eq('community_id', community.id)
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .single();
        
        pendingRequest = request;
      }
    }

    // Get moderators
    const { data: moderators } = await supabase
      .from('community_members')
      .select(`
        role,
        joined_at,
        user:profiles(id, username, avatar_url)
      `)
      .eq('community_id', community.id)
      .in('role', ['owner', 'moderator'])
      .order('role', { ascending: true });

    // Get recent threads count
    const { count: threadCount } = await supabase
      .from('threads')
      .select('*', { count: 'exact', head: true })
      .eq('community_id', community.id);

    return NextResponse.json({
      ...community,
      member_count: memberCount || 0,
      thread_count: threadCount || 0,
      membership,
      pending_request: pendingRequest,
      moderators: moderators || [],
    });

  } catch (error) {
    console.error('Community GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update community
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get community and check ownership
    const { data: community } = await supabase
      .from('communities')
      .select('id, created_by')
      .eq('slug', slug)
      .single();

    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    // Check if user is owner or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (community.created_by !== user.id && !profile?.is_admin) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, rules, category_id, visibility, member_limit, image_url, banner_url } = body;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (name !== undefined) {
      if (name.trim().length < 3 || name.trim().length > 100) {
        return NextResponse.json({ 
          error: 'Community name must be between 3 and 100 characters' 
        }, { status: 400 });
      }
      updates.name = name.trim();
    }

    if (description !== undefined) updates.description = description?.trim() || null;
    if (rules !== undefined) updates.rules = rules?.trim() || null;
    if (category_id !== undefined) updates.category_id = category_id || null;
    if (visibility !== undefined) updates.visibility = visibility;
    if (member_limit !== undefined) updates.member_limit = member_limit || null;
    if (image_url !== undefined) updates.image_url = image_url || null;
    if (banner_url !== undefined) updates.banner_url = banner_url || null;

    const { data: updated, error: updateError } = await supabase
      .from('communities')
      .update(updates)
      .eq('id', community.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating community:', updateError);
      return NextResponse.json({ error: 'Failed to update community' }, { status: 500 });
    }

    return NextResponse.json({ community: updated });

  } catch (error) {
    console.error('Community PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete community
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
      .select('id, created_by')
      .eq('slug', slug)
      .single();

    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    // Check if user is owner or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (community.created_by !== user.id && !profile?.is_admin) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Check if community has threads
    const { count: threadCount } = await supabase
      .from('threads')
      .select('*', { count: 'exact', head: true })
      .eq('community_id', community.id);

    if ((threadCount || 0) > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete community with existing threads. Move or delete threads first.' 
      }, { status: 400 });
    }

    // Delete community (cascade will delete members, requests, invites)
    const { error: deleteError } = await supabase
      .from('communities')
      .delete()
      .eq('id', community.id);

    if (deleteError) {
      console.error('Error deleting community:', deleteError);
      return NextResponse.json({ error: 'Failed to delete community' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Community DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
