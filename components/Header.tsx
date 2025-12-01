"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthButton from "./AuthButton";
import DarkModeToggle from "./DarkModeToggle";
import SearchBar from "./SearchBar";
import MobileMenu from "./MobileMenu";
import NotificationBell from "./NotificationBell";
import OfflineQueueBadge from "./OfflineQueueBadge";
import LanguageSelector from "./LanguageSelector";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";

interface Forum {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export default function Header() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [forums, setForums] = useState<Forum[]>([]);
  const [threadCounts, setThreadCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    async function fetchData() {
      try {
        const [forumsRes, statsRes] = await Promise.all([
          fetch("/api/forums"),
          fetch("/api/forums/stats"),
        ]);

        if (forumsRes.ok) {
          const forumsData = await forumsRes.json();
          console.log("Header fetched forums:", forumsData?.length || 0);
          setForums(forumsData || []);
        } else {
          console.error("Failed to fetch forums:", forumsRes.status);
          const errorText = await forumsRes.text();
          console.error("Error response:", errorText);
        }

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setThreadCounts(statsData.counts || {});
        }
      } catch (error) {
        console.error("Error fetching header data:", error);
      }
    }

    fetchData();
  }, []);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-sm"
      style={{
        height: "var(--header-height)",
        background: "var(--card-bg)",
        borderColor: "var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="h-full flex items-center justify-between px-3 sm:px-4 relative">
        {/* Left side: Mobile menu + Logo */}
        <div className="flex items-center gap-2 relative z-10">
          <MobileMenu forums={forums} threadCounts={threadCounts} />
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-lg"
            style={{ color: "var(--foreground)" }}
          >
            <div
              className="w-7 h-7 rounded flex items-center justify-center font-bold text-white shrink-0"
              style={{ background: "var(--brand)" }}
            >
              L
            </div>
            <span className="hidden sm:inline">LoopHub</span>
          </Link>
        </div>

        {/* Search Bar - Only on home and forum pages */}
        {(pathname === "/" || pathname?.startsWith("/forum/")) && (
          <div className="flex-1 max-w-2xl mx-6 hidden md:block">
            <SearchBar />
          </div>
        )}

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          <LanguageSelector />
          {user && <NotificationBell />}
          <OfflineQueueBadge />
          <DarkModeToggle />
          <AuthButton />
        </div>
      </div>
    </header>
  );
}

