import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
    
    // Check if user needs onboarding (no username set)
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();
      
      // Determine the correct base URL for redirect
      const headersList = await headers();
      const origin = headersList.get("origin") || headersList.get("host");
      const protocol = headersList.get("x-forwarded-proto") || (origin?.includes("localhost") ? "http" : "https");
      const host = origin?.replace(/^https?:\/\//, "") || requestUrl.host;
      const baseUrl = `${protocol}://${host}`;
      
      // If user has no username, redirect to onboarding
      if (!profile?.username) {
        return NextResponse.redirect(new URL("/onboarding", baseUrl));
      }
      
      // Otherwise redirect to home
      return NextResponse.redirect(new URL("/", baseUrl));
    }
  }

  // Determine the correct base URL for redirect
  // This handles both development (localhost) and production (Vercel) environments
  const headersList = await headers();
  const origin = headersList.get("origin") || headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") || (origin?.includes("localhost") ? "http" : "https");
  const host = origin?.replace(/^https?:\/\//, "") || requestUrl.host;
  const baseUrl = `${protocol}://${host}`;

  // Redirect to home page after authentication
  return NextResponse.redirect(new URL("/", baseUrl));
}
