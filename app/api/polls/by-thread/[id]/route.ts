import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// GET /api/polls/by-thread/[id] - Get poll for a thread
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: threadId } = await params;
    const supabase = await createClient();

    const { data: poll, error } = await supabase
      .from('polls')
      .select('id')
      .eq('thread_id', threadId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error getting poll:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ pollId: poll?.id || null });
  } catch (error) {
    console.error('Error in get poll by thread:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
