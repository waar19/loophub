import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { z } from "zod";

const createReportSchema = z.object({
  content_type: z.enum(["thread", "comment"]),
  content_id: z.string().uuid(),
  reason: z.string().min(1, "Reason is required").max(500, "Reason too long"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = createReportSchema.parse(body);

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Create report
    const { data: report, error } = await supabase
      .from("reports")
      .insert([
        {
          ...validatedData,
          reporter_id: user.id,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error("Error creating report:", error);

    if (error instanceof Error && "issues" in error) {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create report" },
      { status: 500 }
    );
  }
}
