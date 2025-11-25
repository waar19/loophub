import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createForumSchema } from "@/lib/validations";

export async function GET() {
  try {
    const { data: forums, error } = await supabase
      .from("forums")
      .select(
        `
        *,
        threads:threads(count)
      `
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Transform the count data and return simplified structure
    const forumsWithCount = forums?.map((forum) => ({
      id: forum.id,
      name: forum.name,
      slug: forum.slug,
      description: forum.description,
      _count: {
        threads: forum.threads[0]?.count || 0,
      },
    }));

    return NextResponse.json(forumsWithCount || []);
  } catch (error) {
    console.error("Error fetching forums:", error);
    return NextResponse.json(
      { error: "Failed to fetch forums" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
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
