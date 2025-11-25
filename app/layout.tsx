import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppLayout from "@/components/AppLayout";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
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
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
