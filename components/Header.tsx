"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthButton from "./AuthButton";
import DarkModeToggle from "./DarkModeToggle";
import SearchBar from "./SearchBar";

export default function Header() {
  const pathname = usePathname();

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
      <div className="h-full flex items-center justify-between px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-xl"
          style={{ color: "var(--foreground)" }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white"
            style={{ background: "var(--brand)" }}
          >
            L
          </div>
          <span className="hidden sm:inline">LoopHub</span>
        </Link>

        {/* Search Bar - Only on home and forum pages */}
        {(pathname === "/" || pathname?.startsWith("/forum/")) && (
          <div className="flex-1 max-w-2xl mx-8 hidden md:block">
            <SearchBar />
          </div>
        )}

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          <DarkModeToggle />
          <AuthButton />
        </div>
      </div>
    </header>
  );
}

