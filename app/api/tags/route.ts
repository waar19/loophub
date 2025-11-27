import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// GET - Get tags (popular or search)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const threadId = searchParams.get('threadId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    // Get tags for a specific thread
    if (threadId) {
      const { data, error } = await supabase.rpc('get_thread_tags', {
        p_thread_id: threadId
      });

      if (error) {
        // Fallback query
        const { data: tags } = await supabase
          .from('thread_tags')
          .select('tag:tags(*)')
          .eq('thread_id', threadId);

        return NextResponse.json({ tags: tags?.map(t => t.tag) || [] });
      }

      return NextResponse.json({ tags: data || [] });
    }

    // Search tags
    if (query) {
      const { data, error } = await supabase.rpc('search_tags', {
        p_query: query,
        p_limit: limit
      });

      if (error) {
        const { data: tags } = await supabase
          .from('tags')
          .select('*')
          .ilike('name', `${query}%`)
          .order('usage_count', { ascending: false })
          .limit(limit);

        return NextResponse.json({ tags: tags || [] });
      }

      return NextResponse.json({ tags: data || [] });
    }

    // Get popular tags
    const { data, error } = await supabase.rpc('get_popular_tags', {
      p_limit: limit
    });

    if (error) {
      const { data: tags } = await supabase
        .from('tags')
        .select('*')
        .gt('usage_count', 0)
        .order('usage_count', { ascending: false })
        .limit(limit);

      return NextResponse.json({ tags: tags || [] });
    }

    return NextResponse.json({ tags: data || [] });

  } catch (error) {
    console.error('Get tags error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Add tag to thread
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { threadId, tagName } = await request.json();

    if (!threadId || !tagName) {
      return NextResponse.json(
        { error: 'Thread ID and tag name required' },
        { status: 400 }
      );
    }

    // Validate tag name
    const cleanTagName = tagName.trim();
    if (cleanTagName.length < 2 || cleanTagName.length > 30) {
      return NextResponse.json(
        { error: 'Tag name must be 2-30 characters' },
        { status: 400 }
      );
    }

    // Check thread ownership
    const { data: thread, error: threadError } = await supabase
      .from('threads')
      .select('id, user_id')
      .eq('id', threadId)
      .single();

    if (threadError || !thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    if (thread.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Only thread owner can add tags' },
        { status: 403 }
      );
    }

    // Check tag limit (max 5 per thread)
    const { count } = await supabase
      .from('thread_tags')
      .select('*', { count: 'exact', head: true })
      .eq('thread_id', threadId);

    if ((count || 0) >= 5) {
      return NextResponse.json(
        { error: 'Maximum 5 tags per thread' },
        { status: 400 }
      );
    }

    // Add tag using the database function
    const { data, error } = await supabase.rpc('add_tag_to_thread', {
      p_thread_id: threadId,
      p_tag_name: cleanTagName,
      p_user_id: user.id
    });

    if (error) {
      // Fallback: manual insert
      const tagId = await createOrGetTag(supabase, cleanTagName, user.id);
      
      if (tagId) {
        await supabase
          .from('thread_tags')
          .insert({ thread_id: threadId, tag_id: tagId })
          .single();
      }
    }

    // Get updated tags for the thread
    const { data: tags } = await supabase.rpc('get_thread_tags', {
      p_thread_id: threadId
    });

    return NextResponse.json({ success: true, tags: tags || [] });

  } catch (error) {
    console.error('Add tag error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove tag from thread
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { threadId, tagId } = await request.json();

    if (!threadId || !tagId) {
      return NextResponse.json(
        { error: 'Thread ID and tag ID required' },
        { status: 400 }
      );
    }

    // Use database function
    const { data, error } = await supabase.rpc('remove_tag_from_thread', {
      p_thread_id: threadId,
      p_tag_id: tagId,
      p_user_id: user.id
    });

    if (error || data === false) {
      // Fallback: check ownership and delete manually
      const { data: thread } = await supabase
        .from('threads')
        .select('user_id')
        .eq('id', threadId)
        .single();

      if (!thread || thread.user_id !== user.id) {
        return NextResponse.json(
          { error: 'Only thread owner can remove tags' },
          { status: 403 }
        );
      }

      await supabase
        .from('thread_tags')
        .delete()
        .eq('thread_id', threadId)
        .eq('tag_id', tagId);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Remove tag error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to create or get a tag
async function createOrGetTag(
  supabase: Awaited<ReturnType<typeof createClient>>,
  name: string,
  userId: string
): Promise<string | null> {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  
  // Try to get existing
  const { data: existing } = await supabase
    .from('tags')
    .select('id')
    .or(`slug.eq.${slug},name.ilike.${name}`)
    .single();

  if (existing) return existing.id;

  // Create new
  const { data: newTag } = await supabase
    .from('tags')
    .insert({ name, slug, created_by: userId })
    .select('id')
    .single();

  return newTag?.id || null;
}
