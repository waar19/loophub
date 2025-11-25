import { createClient } from "@/lib/supabase-server";
import Link from "next/link";

export default async function AuthButton() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex gap-2">
        <Link
          href="/login"
          className="btn"
          style={{ 
            background: "var(--card-bg)", 
            color: "var(--foreground)",
            border: "1px solid var(--border)" 
          }}
        >
          Login
        </Link>
        <Link href="/signup" className="btn btn-primary">
          Sign up
        </Link>
      </div>
    );
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, is_admin")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex items-center gap-4">
      {profile?.is_admin && (
        <Link
          href="/admin"
          className="text-sm font-medium hover:underline"
          style={{ color: "var(--accent)" }}
        >
          Admin Dashboard
        </Link>
      )}
      <span style={{ color: "var(--muted)" }}>
        {profile?.username || user.email}
      </span>
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="btn"
          style={{ 
            background: "var(--card-bg)", 
            color: "var(--foreground)",
            border: "1px solid var(--border)" 
          }}
        >
          Logout
        </button>
      </form>
    </div>
  );
}
