import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { rateLimit, getRateLimitIdentifier, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * Get profiles for multiple user IDs in a single query
 */
export async function getProfilesMap(
  userIds: string[]
): Promise<Record<string, { username: string }>> {
  if (userIds.length === 0) return {};

  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", userIds);

  const profilesMap: Record<string, { username: string }> = {};
  profiles?.forEach((profile) => {
    profilesMap[profile.id] = { username: profile.username };
  });

  return profilesMap;
}

/**
 * Get comment counts for multiple thread IDs in a single query
 */
export async function getCommentCountsMap(
  threadIds: string[]
): Promise<Record<string, number>> {
  if (threadIds.length === 0) return {};

  const supabase = await createClient();
  const { data: comments } = await supabase
    .from("comments")
    .select("thread_id")
    .in("thread_id", threadIds);

  const countsMap: Record<string, number> = {};
  comments?.forEach((comment) => {
    countsMap[comment.thread_id] = (countsMap[comment.thread_id] || 0) + 1;
  });

  return countsMap;
}

/**
 * Get thread counts for multiple forum IDs in a single query
 */
export async function getThreadCountsMap(
  forumIds: string[]
): Promise<Record<string, number>> {
  if (forumIds.length === 0) return {};

  const supabase = await createClient();
  const { data: threads } = await supabase
    .from("threads")
    .select("forum_id")
    .in("forum_id", forumIds);

  const countsMap: Record<string, number> = {};
  threads?.forEach((thread) => {
    countsMap[thread.forum_id] = (countsMap[thread.forum_id] || 0) + 1;
  });

  return countsMap;
}

/**
 * Check if user is authenticated
 */
export async function requireAuth(): Promise<{ user: any; supabase: any }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required");
  }

  return { user, supabase };
}

/**
 * Standardized error response handler
 */
export function handleApiError(error: unknown, defaultMessage: string) {
  console.error("API Error:", error);

  // Handle Zod validation errors
  if (error instanceof Error && "issues" in error) {
    const zodError = error as any;
    const firstIssue = zodError.issues?.[0];
    const errorMessage = firstIssue?.message || "Error de validación";
    return NextResponse.json(
      { error: errorMessage, details: zodError.issues },
      { status: 400 }
    );
  }

  // Handle Supabase errors
  if (error && typeof error === "object" && "message" in error) {
    const supabaseError = error as any;
    return NextResponse.json(
      { error: supabaseError.message || defaultMessage },
      { status: 500 }
    );
  }

  // Handle generic errors
  const errorMessage =
    error instanceof Error ? error.message : defaultMessage;
  return NextResponse.json({ error: errorMessage }, { status: 500 });
}

/**
 * Extract unique user IDs from threads or comments
 */
export function extractUserIds(items: Array<{ user_id?: string }>): string[] {
  return [...new Set(items.map((item) => item.user_id).filter(Boolean))] as string[];
}

/**
 * Extract unique thread IDs from comments
 */
export function extractThreadIds(items: Array<{ thread_id: string }>): string[] {
  return [...new Set(items.map((item) => item.thread_id))];
}

/**
 * Extract unique forum IDs from threads
 */
export function extractForumIds(items: Array<{ forum_id: string }>): string[] {
  return [...new Set(items.map((item) => item.forum_id))];
}

/**
 * Check rate limit and return error response if exceeded
 */
export function checkRateLimit(
  request: Request,
  limitType: keyof typeof RATE_LIMITS = "default",
  userId?: string
): NextResponse | null {
  const identifier = userId ? `user:${userId}` : getRateLimitIdentifier(request);
  const limits = RATE_LIMITS[limitType];
  const result = rateLimit(identifier, limits);

  if (!result.allowed) {
    const resetDate = new Date(result.resetTime);
    const retryAfterSeconds = Math.ceil((result.resetTime - Date.now()) / 1000);
    return NextResponse.json(
      {
        error: `Demasiadas solicitudes. Por favor espera ${retryAfterSeconds} segundos`,
        retryAfter: retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": retryAfterSeconds.toString(),
          "X-RateLimit-Limit": limits.maxRequests.toString(),
          "X-RateLimit-Remaining": result.remaining.toString(),
          "X-RateLimit-Reset": result.resetTime.toString(),
        },
      }
    );
  }

  return null;
}

