import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { z } from "zod";

// Schema for updating notification settings
const updateSettingsSchema = z.object({
  notify_comments: z.boolean().optional(),
  notify_replies: z.boolean().optional(),
  notify_mentions: z.boolean().optional(),
  notify_upvotes: z.boolean().optional(),
  notify_downvotes: z.boolean().optional(),
  notify_milestones: z.boolean().optional(),
  notify_reactions: z.boolean().optional(),
  browser_notifications: z.boolean().optional(),
  sound_enabled: z.boolean().optional(),
  email_digest: z.boolean().optional(),
  email_mentions: z.boolean().optional(),
});

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get or create notification settings
    const { data: settings, error } = await supabase.rpc(
      "get_or_create_notification_settings",
      { p_user_id: user.id }
    );

    if (error) {
      console.error("Error fetching notification settings:", error);
      return NextResponse.json(
        { error: "Failed to fetch settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error in notification settings GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = updateSettingsSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const updates = validationResult.data;

    // Upsert notification settings
    const { data: settings, error } = await supabase
      .from("notification_settings")
      .upsert(
        {
          user_id: user.id,
          ...updates,
        },
        {
          onConflict: "user_id",
        }
      )
      .select()
      .single();

    if (error) {
      console.error("Error updating notification settings:", error);
      return NextResponse.json(
        { error: "Failed to update settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error in notification settings PUT:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
