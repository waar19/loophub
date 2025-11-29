import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// GET - Get community theme/design
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: community, error } = await supabase
      .from('communities')
      .select(`
        theme_color,
        accent_color,
        text_color,
        custom_css,
        banner_url,
        image_url
      `)
      .eq('slug', slug)
      .single();

    if (error || !community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    return NextResponse.json({ design: community });

  } catch (error) {
    console.error('Design GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update community design
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is owner or moderator
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
    const {
      theme_color,
      accent_color,
      text_color,
      custom_css,
      banner_url,
      image_url,
    } = body;

    // Validate colors (hex format)
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    if (theme_color && !hexRegex.test(theme_color)) {
      return NextResponse.json({ error: 'Invalid theme_color format' }, { status: 400 });
    }
    if (accent_color && !hexRegex.test(accent_color)) {
      return NextResponse.json({ error: 'Invalid accent_color format' }, { status: 400 });
    }
    if (text_color && !hexRegex.test(text_color)) {
      return NextResponse.json({ error: 'Invalid text_color format' }, { status: 400 });
    }

    // Sanitize custom CSS (basic sanitization - remove potentially dangerous content)
    let sanitizedCss = custom_css;
    if (custom_css) {
      // Remove javascript: urls and other potentially dangerous patterns
      sanitizedCss = custom_css
        .replace(/javascript:/gi, '')
        .replace(/expression\s*\(/gi, '')
        .replace(/@import/gi, '')
        .replace(/behavior\s*:/gi, '')
        .slice(0, 5000); // Limit to 5000 chars
    }

    const { data: updatedCommunity, error: updateError } = await supabase
      .from('communities')
      .update({
        theme_color: theme_color || null,
        accent_color: accent_color || null,
        text_color: text_color || null,
        custom_css: sanitizedCss || null,
        banner_url: banner_url || null,
        image_url: image_url || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', community.id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update design' }, { status: 500 });
    }

    return NextResponse.json({ community: updatedCommunity });

  } catch (error) {
    console.error('Design PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
