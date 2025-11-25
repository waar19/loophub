/**
 * Get the base URL for the application
 * Works in both server and client contexts
 */
export function getBaseUrl(): string {
  // Server-side: use environment variable or construct from headers
  if (typeof window === "undefined") {
    // Priority: NEXT_PUBLIC_BASE_URL > VERCEL_URL > fallback
    if (process.env.NEXT_PUBLIC_BASE_URL) {
      return process.env.NEXT_PUBLIC_BASE_URL;
    }
    
    if (process.env.VERCEL_URL) {
      // VERCEL_URL doesn't include protocol, add it
      return `https://${process.env.VERCEL_URL}`;
    }
    
    // Fallback for production (should be set via env var)
    return "https://loophub.vercel.app";
  }

  // Client-side: use window.location (will be correct in production)
  // But prefer NEXT_PUBLIC_BASE_URL if set (for SSR consistency)
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  
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

