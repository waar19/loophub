import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

const forumSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  icon: z.string().max(10).optional(),
  color: z.string().max(20).optional(),
});

// GET - Get single forum
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: forum, error } = await supabase
      .from('forums')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !forum) {
      return NextResponse.json({ error: 'Forum not found' }, { status: 404 });
    }

    return NextResponse.json(forum);
  } catch (error) {
    console.error('Error fetching forum:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update forum
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parseResult = forumSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name, slug, description, icon, color } = parseResult.data;

    // Check if slug already exists for different forum
    const { data: existingForum } = await supabase
      .from('forums')
      .select('id')
      .eq('slug', slug)
      .neq('id', id)
      .single();

    if (existingForum) {
      return NextResponse.json({ error: 'Ya existe otro foro con ese slug' }, { status: 400 });
    }

    const { data: forum, error } = await supabase
      .from('forums')
      .update({
        name,
        slug,
        description: description || null,
        icon: icon || '📁',
        color: color || '#8B5CF6',
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(forum);
  } catch (error) {
    console.error('Error updating forum:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete forum
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if forum has threads
    const { count } = await supabase
      .from('threads')
      .select('*', { count: 'exact', head: true })
      .eq('forum_id', id);

    if (count && count > 0) {
      return NextResponse.json(
        { error: 'No puedes eliminar un foro que tiene threads' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('forums')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting forum:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
