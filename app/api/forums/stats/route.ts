import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: threads } = await supabase
      .from("threads")
      .select("forum_id");

    if (!threads) {
      return NextResponse.json({ counts: {} });
    }

    const counts: Record<string, number> = {};
    threads.forEach((thread) => {
      counts[thread.forum_id] = (counts[thread.forum_id] || 0) + 1;
    });

    return NextResponse.json({ counts });
  } catch (error) {
    console.error("Error fetching forum stats:", error);
    return NextResponse.json({ counts: {} }, { status: 500 });
  }
}

