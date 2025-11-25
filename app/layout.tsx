import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "LoopHub - Modern Forum Platform",
  description: "A clean, minimalist forum platform for focused discussions",
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
        <header className="border-b" style={{ borderColor: "var(--border)" }}>
          <div className="max-w-5xl mx-auto px-4 py-4">
            <Link
              href="/"
              className="text-2xl font-bold"
              style={{ color: "var(--foreground)" }}
            >
              LoopHub
            </Link>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
        <footer
          className="border-t mt-16"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            className="max-w-5xl mx-auto px-4 py-6 text-center"
            style={{ color: "var(--muted)" }}
          >
            <p className="text-sm">LoopHub - Modern Forum Platform</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
