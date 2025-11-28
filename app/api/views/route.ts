import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import crypto from 'crypto';

// POST /api/views - Record a thread view
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { threadId } = body;

    if (!threadId) {
      return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Get current user (optional)
    const { data: { user } } = await supabase.auth.getUser();
    
    // Get IP hash for anonymous tracking (privacy-friendly)
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
    const ipHash = crypto.createHash('sha256').update(ip + process.env.NEXTAUTH_SECRET || 'salt').digest('hex').substring(0, 16);
    
    // Get user agent and referrer
    const userAgent = request.headers.get('user-agent') || null;
    const referrer = request.headers.get('referer') || null;

    // Record the view
    const { error } = await supabase.rpc('record_thread_view', {
      p_thread_id: threadId,
      p_user_id: user?.id || null,
      p_ip_hash: ipHash,
      p_user_agent: userAgent?.substring(0, 255),
      p_referrer: referrer?.substring(0, 500),
    });

    if (error) {
      console.error('Error recording view:', error);
      // Don't fail silently - still return success to not break the UI
      // but log the error for debugging
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('View tracking error:', error);
    return NextResponse.json({ error: 'Failed to record view' }, { status: 500 });
  }
}
