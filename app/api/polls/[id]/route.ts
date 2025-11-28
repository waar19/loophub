import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// GET /api/polls/[id] - Get poll with results
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Get poll details
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select('*')
      .eq('id', id)
      .single();

    if (pollError || !poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    // Get options with vote counts using the existing function
    const { data: results, error: resultsError } = await supabase.rpc('get_poll_results', {
      p_poll_id: id,
    });

    if (resultsError) {
      console.error('Error getting poll results:', resultsError);
      return NextResponse.json({ error: resultsError.message }, { status: 500 });
    }

    // Get user's votes if logged in
    let userVotes: string[] = [];
    if (user) {
      const { data: votes } = await supabase.rpc('get_user_poll_votes', {
        p_poll_id: id,
        p_user_id: user.id,
      });
      userVotes = votes || [];
    }

    // Get total unique voters
    const { count: totalVoters } = await supabase
      .from('poll_votes')
      .select('user_id', { count: 'exact', head: true })
      .eq('poll_id', id);

    return NextResponse.json({
      poll: {
        id: poll.id,
        question: poll.question,
        pollType: poll.poll_type,
        allowMultiple: poll.allow_multiple,
        maxChoices: poll.max_choices,
        isClosed: poll.is_closed,
        closesAt: poll.closes_at,
        showResultsBeforeVote: poll.show_results_before_vote,
        createdAt: poll.created_at,
      },
      options: results || [],
      userVotes,
      totalVoters: totalVoters || 0,
      hasVoted: userVotes.length > 0,
    });
  } catch (error) {
    console.error('Error in get poll:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/polls/[id] - Vote on a poll
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

    const body = await request.json();
    const { optionIds } = body;

    if (!optionIds || !Array.isArray(optionIds) || optionIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one option must be selected' },
        { status: 400 }
      );
    }

    // Check if poll exists and is open
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select('*')
      .eq('id', id)
      .single();

    if (pollError || !poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    if (poll.is_closed || (poll.closes_at && new Date(poll.closes_at) <= new Date())) {
      return NextResponse.json({ error: 'This poll is closed' }, { status: 400 });
    }

    // Check user level requirement
    const { data: profile } = await supabase
      .from('profiles')
      .select('level')
      .eq('id', user.id)
      .single();

    if (profile && profile.level < poll.min_level_to_vote) {
      return NextResponse.json(
        { error: `You must be level ${poll.min_level_to_vote} or higher to vote` },
        { status: 403 }
      );
    }

    // Check if already voted (for single choice)
    const { data: existingVotes } = await supabase
      .from('poll_votes')
      .select('id')
      .eq('poll_id', id)
      .eq('user_id', user.id);

    if (poll.poll_type === 'single' && existingVotes && existingVotes.length > 0) {
      return NextResponse.json(
        { error: 'You have already voted on this poll' },
        { status: 400 }
      );
    }

    // For multiple choice, check max choices
    if (poll.poll_type === 'multiple') {
      const totalVotes = (existingVotes?.length || 0) + optionIds.length;
      if (totalVotes > poll.max_choices) {
        return NextResponse.json(
          { error: `You can only select up to ${poll.max_choices} options` },
          { status: 400 }
        );
      }
    }

    // Insert votes
    const votesToInsert = optionIds.map((optionId: string) => ({
      poll_id: id,
      option_id: optionId,
      user_id: user.id,
    }));

    const { error: voteError } = await supabase
      .from('poll_votes')
      .insert(votesToInsert);

    if (voteError) {
      console.error('Error voting:', voteError);
      return NextResponse.json({ error: voteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in vote:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
