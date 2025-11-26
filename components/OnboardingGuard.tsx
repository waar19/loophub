"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

/**
 * OnboardingGuard - Redirects users without username to onboarding page
 * Use this component to wrap pages that require a complete profile
 */
export default function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    // Don't redirect on onboarding page itself
    if (pathname === "/onboarding") {
      return;
    }

    // Don't redirect on auth pages
    if (pathname?.startsWith("/login") || pathname?.startsWith("/signup") || pathname?.startsWith("/auth")) {
      return;
    }

    // Wait for auth to load
    if (loading) {
      return;
    }

    // If user is logged in but has no username, redirect to onboarding
    if (user && (!profile || !profile.username)) {
      router.push("/onboarding");
    }
  }, [user, profile, loading, router, pathname]);

  // Show children if no redirect needed
  return <>{children}</>;
}
