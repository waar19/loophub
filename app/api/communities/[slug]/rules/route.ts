import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// GET - Get community rules
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const supabase = await createClient();

    // Get community ID
    const { data: community } = await supabase
      .from('communities')
      .select('id')
      .eq('slug', slug)
      .single();

    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    const { data: rules, error } = await supabase
      .from('community_rules')
      .select('*')
      .eq('community_id', community.id)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Rules fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 });
    }

    return NextResponse.json({ rules: rules || [] });

  } catch (error) {
    console.error('Rules GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new rule
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get community and check permissions
    const { data: community } = await supabase
      .from('communities')
      .select('id')
      .eq('slug', slug)
      .single();

    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

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
    const { title, description } = body;

    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (title.length > 100) {
      return NextResponse.json({ error: 'Title too long (max 100 chars)' }, { status: 400 });
    }

    // Get max sort_order
    const { data: maxOrder } = await supabase
      .from('community_rules')
      .select('sort_order')
      .eq('community_id', community.id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const newOrder = (maxOrder?.sort_order || 0) + 1;

    const { data: rule, error: insertError } = await supabase
      .from('community_rules')
      .insert({
        community_id: community.id,
        title: title.trim(),
        description: description?.trim() || null,
        sort_order: newOrder,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create rule' }, { status: 500 });
    }

    return NextResponse.json({ rule }, { status: 201 });

  } catch (error) {
    console.error('Rules POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update rules (bulk update for reordering)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get community and check permissions
    const { data: community } = await supabase
      .from('communities')
      .select('id')
      .eq('slug', slug)
      .single();

    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

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
    const { rules } = body;

    if (!Array.isArray(rules)) {
      return NextResponse.json({ error: 'Rules must be an array' }, { status: 400 });
    }

    // Update each rule
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      await supabase
        .from('community_rules')
        .update({
          title: rule.title,
          description: rule.description,
          sort_order: i + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', rule.id)
        .eq('community_id', community.id);
    }

    // Fetch updated rules
    const { data: updatedRules } = await supabase
      .from('community_rules')
      .select('*')
      .eq('community_id', community.id)
      .order('sort_order', { ascending: true });

    return NextResponse.json({ rules: updatedRules || [] });

  } catch (error) {
    console.error('Rules PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a rule
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get('ruleId');

    if (!ruleId) {
      return NextResponse.json({ error: 'Rule ID required' }, { status: 400 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get community and check permissions
    const { data: community } = await supabase
      .from('communities')
      .select('id')
      .eq('slug', slug)
      .single();

    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    const { data: membership } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', community.id)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'moderator'].includes(membership.role)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { error: deleteError } = await supabase
      .from('community_rules')
      .delete()
      .eq('id', ruleId)
      .eq('community_id', community.id);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete rule' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Rules DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
