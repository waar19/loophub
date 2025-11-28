import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// POST /api/polls - Create a new poll
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user level (must be 3+ or admin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('level, is_admin')
      .eq('id', user.id)
      .single();

    if (!profile || (!profile.is_admin && profile.level < 3)) {
      return NextResponse.json(
        { error: 'You must be level 3 or higher to create polls' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { threadId, question, options, endsAt, isMultipleChoice, maxChoices } = body;

    // Validations
    if (!threadId) {
      return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
    }

    if (!question || question.trim().length < 5) {
      return NextResponse.json(
        { error: 'Question must be at least 5 characters' },
        { status: 400 }
      );
    }

    if (!options || !Array.isArray(options) || options.length < 2 || options.length > 6) {
      return NextResponse.json(
        { error: 'Poll must have 2-6 options' },
        { status: 400 }
      );
    }

    // Filter empty options
    const validOptions = options.filter((opt: string) => opt && opt.trim().length > 0);
    if (validOptions.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 valid options required' },
        { status: 400 }
      );
    }

    // Create the poll
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .insert({
        thread_id: threadId,
        question: question.trim(),
        poll_type: isMultipleChoice ? 'multiple' : 'single',
        allow_multiple: isMultipleChoice || false,
        max_choices: maxChoices || 1,
        closes_at: endsAt || null,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (pollError) {
      console.error('Error creating poll:', pollError);
      return NextResponse.json({ error: pollError.message }, { status: 500 });
    }

    // Create poll options
    const optionsToInsert = validOptions.map((opt: string, index: number) => ({
      poll_id: poll.id,
      option_text: opt.trim(),
      option_order: index,
    }));

    const { error: optionsError } = await supabase
      .from('poll_options')
      .insert(optionsToInsert);

    if (optionsError) {
      console.error('Error creating poll options:', optionsError);
      // Try to delete the poll if options failed
      await supabase.from('polls').delete().eq('id', poll.id);
      return NextResponse.json({ error: optionsError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      pollId: poll.id 
    });
  } catch (error) {
    console.error('Error in create poll:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
