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

  // Client-side: Always prefer NEXT_PUBLIC_BASE_URL if set
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  
  // If we're in production (not localhost), use the current origin
  // This handles cases where NEXT_PUBLIC_BASE_URL might not be set but we're in production
  const isLocalhost = window.location.hostname === "localhost" || 
                      window.location.hostname === "127.0.0.1" ||
                      window.location.hostname === "0.0.0.0";
  
  if (!isLocalhost) {
    // We're in production, use the current origin
    return window.location.origin;
  }
  
  // Development: use localhost
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

