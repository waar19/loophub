import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/api-helpers';

const searchSchema = z.object({
  q: z.string().min(1).max(20),
  limit: z.coerce.number().min(1).max(10).optional().default(5),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check rate limit
    const rateLimitError = checkRateLimit(request, 'userSearch', user.id);
    if (rateLimitError) return rateLimitError;

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const parseResult = searchSchema.safeParse({
      q: searchParams.get('q'),
      limit: searchParams.get('limit'),
    });

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { q, limit } = parseResult.data;

    // Try RPC function first, then fallback to direct query
    let users = null;
    
    // Try the RPC function
    const { data: rpcUsers, error: rpcError } = await supabase
      .rpc('search_users_for_mention', {
        p_query: q,
        p_limit: limit,
      });

    if (!rpcError && rpcUsers) {
      users = rpcUsers;
    } else {
      // Log RPC error for debugging
      if (rpcError) {
        console.error('RPC search_users_for_mention error:', rpcError.message);
      }
      
      // Fallback to direct query
      const { data: fallbackUsers, error: fallbackError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, level')
        .not('username', 'is', null)
        .ilike('username', `${q}%`)
        .order('level', { ascending: false })
        .limit(limit);
      
      if (fallbackError) {
        console.error('Fallback query error:', fallbackError.message);
        
        // Last resort: simple query without ordering by karma
        const { data: simpleUsers, error: simpleError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, level')
          .not('username', 'is', null)
          .ilike('username', `${q}%`)
          .limit(limit);
        
        if (simpleError) {
          console.error('Simple query error:', simpleError.message);
          return NextResponse.json(
            { error: 'Failed to search users', details: simpleError.message },
            { status: 500 }
          );
        }
        
        users = simpleUsers;
      } else {
        users = fallbackUsers;
      }
    }

    return NextResponse.json(users || []);
  } catch (error) {
    console.error('User search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
