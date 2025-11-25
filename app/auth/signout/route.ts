import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  
  // Get the origin from the request headers to support any domain
  const headersList = await headers();
  const origin = headersList.get("origin") || headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") || (origin?.includes("localhost") ? "http" : "https");
  const host = origin?.replace(/^https?:\/\//, "") || "localhost:3000";
  const baseUrl = `${protocol}://${host}`;
  
  return NextResponse.redirect(new URL("/", baseUrl));
}
