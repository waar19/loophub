import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createForumSchema } from "@/lib/validations";
import { getThreadCountsMap, extractForumIds } from "@/lib/api-helpers";
import { cache, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";

export async function GET() {
  try {
    // Check cache first
    const cacheKey = CACHE_KEYS.forums();
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const supabase = await createClient();
    const { data: forums, error } = await supabase
      .from("forums")
      .select("id, name, slug, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error fetching forums:", error);
      return NextResponse.json([]);
    }

    if (!forums || forums.length === 0) {
      return NextResponse.json([]);
    }

    // Get thread counts using helper function
    const forumIds = forums.map((f) => f.id);
    const countsMap = await getThreadCountsMap(forumIds);

    // Transform the count data and return simplified structure
    const forumsWithCount = forums.map((forum) => ({
      id: forum.id,
      name: forum.name,
      slug: forum.slug,
      created_at: forum.created_at,
      _count: {
        threads: countsMap[forum.id] || 0,
      },
    }));

    // Cache the result
    cache.set(cacheKey, forumsWithCount, CACHE_TTL.forums);

    return NextResponse.json(forumsWithCount);
  } catch (error) {
    console.error("Error fetching forums:", error);
    // Return empty array on error instead of 500
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const validatedData = createForumSchema.parse(body);

    const { data: forum, error } = await supabase
      .from("forums")
      .insert([validatedData])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(forum, { status: 201 });
  } catch (error) {
    console.error("Error creating forum:", error);

    if (error instanceof Error && "issues" in error) {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create forum" },
      { status: 500 }
    );
  }
}
