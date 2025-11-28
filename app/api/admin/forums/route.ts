import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

const forumSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
});

// GET - List all forums
export async function GET() {
  try {
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

    const { data: forums, error } = await supabase
      .from('forums')
      .select('*')
      .order('name');

    if (error) throw error;

    return NextResponse.json(forums);
  } catch (error) {
    console.error('Error fetching forums:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new forum
export async function POST(request: NextRequest) {
  try {
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

    const { name, slug } = parseResult.data;

    // Check if slug already exists
    const { data: existingForum } = await supabase
      .from('forums')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingForum) {
      return NextResponse.json({ error: 'Ya existe un foro con ese slug' }, { status: 400 });
    }

    const { data: forum, error } = await supabase
      .from('forums')
      .insert({
        name,
        slug,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(forum, { status: 201 });
  } catch (error) {
    console.error('Error creating forum:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
