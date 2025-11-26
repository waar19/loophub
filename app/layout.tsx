import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppLayout from "@/components/AppLayout";
import { ToastProvider } from "@/contexts/ToastContext";
import { TranslationsProvider } from "@/components/TranslationsProvider";
import { WebsiteStructuredData } from "@/components/StructuredData";
import { getBaseUrl, getFullUrl } from "@/lib/url-helpers";

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
    default: "LoopHub - Minimalismo Digital y Organización Personal",
    template: "%s | LoopHub",
  },
  description:
    "Comunidad enfocada en minimalismo digital, organización personal, productividad realista y sistemas como PARA, GTD y Zettelkasten",
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
  authors: [{ name: "LoopHub" }],
  creator: "LoopHub",
  publisher: "LoopHub",
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: siteUrl,
    siteName: "LoopHub",
    title: "LoopHub - Minimalismo Digital y Organización Personal",
    description:
      "Comunidad enfocada en minimalismo digital, organización personal, productividad realista y sistemas como PARA, GTD y Zettelkasten",
    images: [
      {
        url: `${baseUrl}/og-image.png`, // Update with your actual OG image
        width: 1200,
        height: 630,
        alt: "LoopHub - Minimalismo Digital y Organización Personal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LoopHub - Minimalismo Digital y Organización Personal",
    description:
      "Comunidad enfocada en minimalismo digital, organización personal, productividad realista",
    creator: "@loophub",
    images: [
      {
        url: `${baseUrl}/api/og?title=LoopHub`,
        alt: "LoopHub - Minimalismo Digital y Organización Personal",
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
        <TranslationsProvider>
          <ToastProvider>
            <AppLayout>{children}</AppLayout>
          </ToastProvider>
        </TranslationsProvider>
      </body>
    </html>
  );
}
