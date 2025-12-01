import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppLayout from "@/components/AppLayout";
import OnboardingGuard from "@/components/OnboardingGuard";
import { ToastProvider } from "@/contexts/ToastContext";
import { TranslationsProvider } from "@/components/TranslationsProvider";
import { WebsiteStructuredData } from "@/components/StructuredData";
import { getBaseUrl, getFullUrl } from "@/lib/url-helpers";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import OfflineIndicator from "@/components/OfflineIndicator";
import { QueryProvider } from "@/lib/query-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const baseUrl = getBaseUrl();
const siteUrl = getFullUrl("");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "LoopHub - Digital Minimalism & Personal Organization",
    template: "%s | LoopHub",
  },
  description:
    "Community focused on digital minimalism, personal organization, realistic productivity and systems like PARA, GTD and Zettelkasten",
  keywords: [
    "digital minimalism",
    "personal organization",
    "productivity",
    "GTD",
    "PARA",
    "Zettelkasten",
    "Notion",
    "Obsidian",
    "time management",
  ],
  authors: [{ name: "LoopHub" }],
  creator: "LoopHub",
  publisher: "LoopHub",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "LoopHub",
    title: "LoopHub - Digital Minimalism & Personal Organization",
    description:
      "Community focused on digital minimalism, personal organization, realistic productivity and systems like PARA, GTD and Zettelkasten",
    images: [
      {
        url: `${baseUrl}/og-image.png`, // Update with your actual OG image
        width: 1200,
        height: 630,
        alt: "LoopHub - Digital Minimalism & Personal Organization",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LoopHub - Digital Minimalism & Personal Organization",
    description:
      "Community focused on digital minimalism, personal organization, realistic productivity",
    creator: "@loophub",
    images: [
      {
        url: `${baseUrl}/api/og?title=LoopHub`,
        alt: "LoopHub - Digital Minimalism & Personal Organization",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LoopHub",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <WebsiteStructuredData />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var savedTheme = localStorage.getItem("theme");
                  var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                  if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
                    document.documentElement.classList.add("dark");
                  } else {
                    document.documentElement.classList.remove("dark");
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <QueryProvider>
          <TranslationsProvider>
            <ToastProvider>
              <OnboardingGuard>
                <OfflineIndicator />
                <AppLayout>{children}</AppLayout>
                <PWAInstallPrompt />
              </OnboardingGuard>
            </ToastProvider>
          </TranslationsProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
