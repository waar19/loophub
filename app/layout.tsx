import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import AuthButton from "@/components/AuthButton";
import DarkModeToggle from "@/components/DarkModeToggle";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LoopHub - Minimalismo Digital y Organización Personal",
  description: "Comunidad enfocada en minimalismo digital, organización personal, productividad realista y sistemas como PARA, GTD y Zettelkasten",
  keywords: [
    "minimalismo digital",
    "organización personal",
    "productividad",
    "GTD",
    "PARA",
    "Zettelkasten",
    "Notion",
    "Obsidian",
    "gestión del tiempo",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="border-b bg-white dark:bg-gray-900 transition-colors" style={{ borderColor: "var(--border)" }}>
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link
              href="/"
              className="text-2xl font-bold"
              style={{ color: "var(--foreground)" }}
            >
              LoopHub
            </Link>
            <div className="flex items-center gap-4">
              <DarkModeToggle />
              <AuthButton />
            </div>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
        <footer
          className="border-t mt-16 bg-white dark:bg-gray-900 transition-colors"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            className="max-w-5xl mx-auto px-4 py-8 text-center"
            style={{ color: "var(--muted)" }}
          >
            <p className="text-sm mb-2">LoopHub</p>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Minimalismo Digital • Organización Personal • Productividad Realista
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
