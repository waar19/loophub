import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// POST /api/threads/[id]/pin - Pin a thread
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Call the pin_thread function
    const { data, error } = await supabase.rpc('pin_thread', {
      p_thread_id: id,
      p_user_id: user.id,
      p_max_pins: 3,
    });

    if (error) {
      console.error('Error pinning thread:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data?.success) {
      return NextResponse.json(
        { error: data?.error || 'Failed to pin thread' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in pin thread:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/threads/[id]/pin - Unpin a thread
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Call the unpin_thread function
    const { data, error } = await supabase.rpc('unpin_thread', {
      p_thread_id: id,
      p_user_id: user.id,
    });

    if (error) {
      console.error('Error unpinning thread:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data?.success) {
      return NextResponse.json(
        { error: data?.error || 'Failed to unpin thread' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in unpin thread:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
