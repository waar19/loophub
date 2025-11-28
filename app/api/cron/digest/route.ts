import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendDigestEmail, DigestEmailData } from '@/lib/email-digest';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://loophub.com';

// Secret key to protect this endpoint
const CRON_SECRET = process.env.CRON_SECRET;

// Create admin client lazily
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error('Missing Supabase configuration');
  }
  
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Supabase admin client
    const supabaseAdmin = getSupabaseAdmin();

    // Get digest type from query params (default: weekly)
    const { searchParams } = new URL(request.url);
    const digestType = searchParams.get('type') || 'weekly';

    // Get users who need to receive the digest
    const { data: users, error: usersError } = await supabaseAdmin
      .rpc('get_users_for_digest', { p_digest_type: digestType });

    if (usersError) {
      console.error('Error getting users for digest:', usersError);
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No users to send digest to',
        sent: 0 
      });
    }

    // Get trending threads
    const { data: trendingThreads, error: trendingError } = await supabaseAdmin
      .rpc('get_weekly_trending_threads', { p_limit: 5 });

    if (trendingError) {
      console.error('Error getting trending threads:', trendingError);
    }

    const results = {
      total: users.length,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Send digest to each user
    for (const user of users) {
      try {
        // Get user's activity
        const { data: activityData } = await supabaseAdmin
          .rpc('get_user_weekly_activity', { p_user_id: user.user_id });

        const activity = activityData?.[0] || {
          threads_created: 0,
          comments_posted: 0,
          upvotes_received: 0,
          replies_received: 0,
        };

        // Get user's subscription threads
        const { data: subscriptionThreads } = await supabaseAdmin
          .rpc('get_user_subscription_threads', { 
            p_user_id: user.user_id,
            p_limit: 5 
          });

        // Prepare email data
        const emailData: DigestEmailData = {
          to: user.email,
          username: user.username,
          language: user.language || 'es',
          trendingThreads: (trendingThreads || []).map((t: {
            id: string;
            title: string;
            forum_name: string;
            forum_slug: string;
            author_username: string;
            upvote_count: number;
            comment_count: number;
          }) => ({
            id: t.id,
            title: t.title,
            forumName: t.forum_name,
            forumSlug: t.forum_slug,
            authorUsername: t.author_username,
            upvoteCount: t.upvote_count,
            commentCount: Number(t.comment_count),
          })),
          subscriptionThreads: (subscriptionThreads || []).map((t: {
            id: string;
            title: string;
            forum_name: string;
            forum_slug: string;
            author_username: string;
            upvote_count: number;
          }) => ({
            id: t.id,
            title: t.title,
            forumName: t.forum_name,
            forumSlug: t.forum_slug,
            authorUsername: t.author_username,
            upvoteCount: t.upvote_count,
          })),
          activity: {
            threadsCreated: activity.threads_created || 0,
            commentsPosted: activity.comments_posted || 0,
            upvotesReceived: activity.upvotes_received || 0,
            repliesReceived: activity.replies_received || 0,
          },
          unsubscribeUrl: `${APP_URL}/settings?tab=notifications`,
        };

        // Send email
        const result = await sendDigestEmail(emailData);

        // Log the digest
        await supabaseAdmin.from('email_digest_log').insert({
          user_id: user.user_id,
          email_to: user.email,
          digest_type: digestType,
          threads_count: trendingThreads?.length || 0,
          comments_count: 0,
          notifications_count: 0,
          status: result.success ? 'sent' : 'failed',
          error_message: result.error,
        });

        if (result.success) {
          // Update last digest sent timestamp
          await supabaseAdmin.rpc('update_last_digest_sent', { p_user_id: user.user_id });
          results.sent++;
        } else {
          results.failed++;
          results.errors.push(`${user.email}: ${result.error}`);
        }
      } catch (error) {
        results.failed++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`${user.email}: ${errorMsg}`);
        console.error(`Error sending digest to ${user.email}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Error in digest cron:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Also support GET for testing/manual trigger
export async function GET(request: NextRequest) {
  return POST(request);
}
