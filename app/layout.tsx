import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppLayout from "@/components/AppLayout";
import { ToastProvider } from "@/contexts/ToastContext";
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
  authors: [{ name: "LoopHub" }],
  creator: "LoopHub",
  publisher: "LoopHub",
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: siteUrl,
    siteName: "LoopHub",
    title: "LoopHub - Minimalismo Digital y Organización Personal",
    description: "Comunidad enfocada en minimalismo digital, organización personal, productividad realista y sistemas como PARA, GTD y Zettelkasten",
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
    description: "Comunidad enfocada en minimalismo digital, organización personal, productividad realista",
    creator: "@loophub",
    images: [`${baseUrl}/og-image.png`],
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
      </head>
      <body className={`${inter.variable} antialiased`}>
        <ToastProvider>
          <AppLayout>{children}</AppLayout>
        </ToastProvider>
      </body>
    </html>
  );
}
