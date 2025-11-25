import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { z } from "zod";
import { requireAuth, handleApiError } from "@/lib/api-helpers";

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
    const { user, supabase } = await requireAuth();

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
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    return handleApiError(error, "Error al crear el reporte");
  }
}
