import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// POST - Toggle subscription
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { threadId } = await request.json();

    if (!threadId) {
      return NextResponse.json({ error: 'Thread ID required' }, { status: 400 });
    }

    // Verify thread exists
    const { data: thread, error: threadError } = await supabase
      .from('threads')
      .select('id')
      .eq('id', threadId)
      .single();

    if (threadError || !thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    // Toggle subscription
    const { data, error } = await supabase.rpc('toggle_thread_subscription', {
      p_user_id: user.id,
      p_thread_id: threadId
    });

    if (error) {
      // Fallback to manual toggle
      const { data: existing } = await supabase
        .from('thread_subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('thread_id', threadId)
        .single();

      if (existing) {
        await supabase
          .from('thread_subscriptions')
          .delete()
          .eq('id', existing.id);
        
        return NextResponse.json({ subscribed: false });
      } else {
        const { data: newSub } = await supabase
          .from('thread_subscriptions')
          .insert({ user_id: user.id, thread_id: threadId })
          .select()
          .single();
        
        return NextResponse.json({ subscribed: true, id: newSub?.id });
      }
    }

    const result = data?.[0];
    return NextResponse.json({
      subscribed: result?.subscribed ?? false,
      id: result?.subscription_id
    });

  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Get user's subscriptions or check specific thread
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const threadId = searchParams.get('threadId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Check specific thread
    if (threadId) {
      const { data } = await supabase
        .from('thread_subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('thread_id', threadId)
        .single();

      return NextResponse.json({ subscribed: !!data });
    }

    // Get all subscriptions
    const { data, error } = await supabase.rpc('get_user_subscriptions', {
      p_user_id: user.id,
      p_limit: limit,
      p_offset: offset
    });

    if (error) {
      // Fallback query
      const { data: subs, error: fbError } = await supabase
        .from('thread_subscriptions')
        .select(`
          id,
          created_at,
          thread:threads (
            id,
            title,
            created_at,
            upvotes,
            downvotes,
            forum:forums (name, slug),
            author:profiles!threads_user_id_fkey (username)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (fbError) throw fbError;

      return NextResponse.json({
        subscriptions: subs || [],
        hasMore: (subs?.length || 0) === limit
      });
    }

    // Transform RPC result
    const subscriptions = (data || []).map((s: Record<string, unknown>) => ({
      id: s.subscription_id,
      created_at: s.subscribed_at,
      thread: {
        id: s.thread_id,
        title: s.thread_title,
        created_at: s.thread_created_at,
        upvotes: s.thread_upvotes,
        downvotes: s.thread_downvotes,
        forum: { name: s.forum_name, slug: s.forum_slug },
        author: { username: s.author_username },
        comment_count: s.comment_count
      }
    }));

    return NextResponse.json({
      subscriptions,
      hasMore: subscriptions.length === limit
    });

  } catch (error) {
    console.error('Get subscriptions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
