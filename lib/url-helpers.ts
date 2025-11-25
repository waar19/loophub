/**
 * Get the base URL for the application
 * Works in both server and client contexts
 */
export function getBaseUrl(): string {
  // Server-side: use environment variable or construct from headers
  if (typeof window === "undefined") {
    return (
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "https://loophub.vercel.app"
    );
  }

  // Client-side: use window.location
  return window.location.origin;
}

/**
 * Get the full URL for a path
 */
export function getFullUrl(path: string): string {
  const baseUrl = getBaseUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

