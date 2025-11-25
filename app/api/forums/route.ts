import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createForumSchema } from "@/lib/validations";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: forums, error } = await supabase
      .from("forums")
      .select("id, name, slug, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error fetching forums:", error);
      // Return empty array instead of error if it's just a query issue
      return NextResponse.json([]);
    }

    if (!forums || forums.length === 0) {
      return NextResponse.json([]);
    }

    // Get thread counts separately
    const forumIds = forums.map((f) => f.id);
    const countsMap: Record<string, number> = {};
    
    if (forumIds.length > 0) {
      const { data: threads, error: threadsError } = await supabase
        .from("threads")
        .select("forum_id")
        .in("forum_id", forumIds);
      
      if (!threadsError && threads) {
        threads.forEach((thread) => {
          countsMap[thread.forum_id] = (countsMap[thread.forum_id] || 0) + 1;
        });
      }
    }

    // Transform the count data and return simplified structure
    const forumsWithCount = forums.map((forum) => ({
      id: forum.id,
      name: forum.name,
      slug: forum.slug,
      _count: {
        threads: countsMap[forum.id] || 0,
      },
    }));

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
