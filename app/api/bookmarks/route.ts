import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// POST - Toggle bookmark (add/remove)
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

    // Toggle bookmark using the database function
    const { data, error } = await supabase.rpc('toggle_bookmark', {
      p_user_id: user.id,
      p_thread_id: threadId
    });

    if (error) {
      // Fallback to manual toggle
      const { data: existing } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('user_id', user.id)
        .eq('thread_id', threadId)
        .single();

      if (existing) {
        await supabase
          .from('bookmarks')
          .delete()
          .eq('id', existing.id);
        
        return NextResponse.json({ bookmarked: false });
      } else {
        const { data: newBookmark } = await supabase
          .from('bookmarks')
          .insert({ user_id: user.id, thread_id: threadId })
          .select()
          .single();
        
        return NextResponse.json({ bookmarked: true, id: newBookmark?.id });
      }
    }

    const result = data?.[0];
    return NextResponse.json({
      bookmarked: result?.bookmarked ?? false,
      id: result?.bookmark_id
    });

  } catch (error) {
    console.error('Bookmark error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Get user's bookmarks
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');
    const threadId = searchParams.get('threadId');

    // If threadId provided, just check if it's bookmarked
    if (threadId) {
      const { data } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('user_id', user.id)
        .eq('thread_id', threadId)
        .single();

      return NextResponse.json({ bookmarked: !!data });
    }

    // Get user's bookmarks with thread details
    const { data, error } = await supabase.rpc('get_user_bookmarks', {
      p_user_id: user.id,
      p_limit: limit,
      p_offset: offset
    });

    if (error) {
      // Fallback query
      const { data: bookmarks, error: fbError } = await supabase
        .from('bookmarks')
        .select(`
          id,
          created_at,
          thread:threads (
            id,
            title,
            content,
            created_at,
            user_id,
            forum_id,
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
        bookmarks: bookmarks || [],
        hasMore: (bookmarks?.length || 0) === limit
      });
    }

    // Transform the RPC result
    const bookmarks = (data || []).map((b: Record<string, unknown>) => ({
      id: b.bookmark_id,
      created_at: b.bookmarked_at,
      thread: {
        id: b.thread_id,
        title: b.thread_title,
        content: b.thread_content,
        created_at: b.thread_created_at,
        user_id: b.thread_user_id,
        forum_id: b.thread_forum_id,
        upvotes: b.thread_upvotes,
        downvotes: b.thread_downvotes,
        forum: { name: b.forum_name, slug: b.forum_slug },
        author: { username: b.author_username }
      }
    }));

    return NextResponse.json({
      bookmarks,
      hasMore: bookmarks.length === limit
    });

  } catch (error) {
    console.error('Get bookmarks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
