import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Turbopack config (Next.js 16 usa Turbopack por defecto)
  turbopack: {},
};

export default nextConfig;
