/**
 * Cache Strategy Selection Module
 *
 * Property 8: Cache strategy selection
 * For any request URL, the cache strategy should be:
 * - cache-first for static assets (/icons, /_next/static)
 * - network-first for API single items (/api/threads/[id])
 * - stale-while-revalidate for API lists (/api/threads, /api/comments)
 *
 * Requirements: 4.2, 4.3
 */

export type CacheStrategy =
  | 'cache-first'
  | 'network-first'
  | 'stale-while-revalidate'
  | 'network-only';

export type RequestDestination =
  | 'document'
  | 'image'
  | 'font'
  | 'style'
  | 'script'
  | 'audio'
  | 'video'
  | 'worker'
  | 'manifest'
  | 'object'
  | 'embed'
  | 'report'
  | '';

/**
 * Simplified request info for cache strategy determination
 */
export interface RequestInfo {
  pathname: string;
  destination: RequestDestination;
}

/**
 * API patterns for single item requests (network-first)
 * These patterns match URLs that fetch a specific resource by ID/slug
 */
export const API_SINGLE_ITEM_PATTERNS: RegExp[] = [
  /^\/api\/threads\/[^/]+$/,           // /api/threads/[id]
  /^\/api\/threads\/[^/]+\/comments$/, // /api/threads/[id]/comments
  /^\/api\/comments\/[^/]+$/,          // /api/comments/[id]
  /^\/api\/forums\/[^/]+$/,            // /api/forums/[slug]
  /^\/api\/forums\/[^/]+\/threads$/,   // /api/forums/[slug]/threads
  /^\/api\/communities\/[^/]+$/,       // /api/communities/[slug]
  /^\/api\/profile\/[^/]+$/,           // /api/profile/[id]
  /^\/api\/users\/[^/]+$/,             // /api/users/[id]
  /^\/api\/polls\/[^/]+$/,             // /api/polls/[id]
  /^\/api\/polls\/by-thread\/[^/]+$/,  // /api/polls/by-thread/[id]
];

/**
 * API patterns for list requests (stale-while-revalidate)
 * These patterns match URLs that fetch collections of resources
 */
export const API_LIST_PATTERNS: RegExp[] = [
  /^\/api\/threads\/?$/,
  /^\/api\/comments\/?$/,
  /^\/api\/forums\/?$/,
  /^\/api\/communities\/?$/,
  /^\/api\/notifications\/?$/,
  /^\/api\/bookmarks\/?$/,
  /^\/api\/tags\/?$/,
  /^\/api\/search\/?$/,
  /^\/api\/feed\//,
];

/**
 * Checks if a pathname matches static asset patterns (cache-first)
 *
 * Static assets include:
 * - /icons/* - App icons
 * - /_next/static/* - Next.js static assets
 * - /fonts/* - Font files
 * - *.ico - Favicon files
 */
export function isStaticAssetPath(pathname: string): boolean {
  return (
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/fonts/') ||
    pathname.endsWith('.ico')
  );
}

/**
 * Checks if a request destination indicates a static asset (cache-first)
 */
export function isStaticAssetDestination(destination: RequestDestination): boolean {
  return (
    destination === 'image' ||
    destination === 'font' ||
    destination === 'style' ||
    destination === 'script'
  );
}

/**
 * Checks if a pathname matches API single item patterns (network-first)
 */
export function isApiSingleItem(pathname: string): boolean {
  return API_SINGLE_ITEM_PATTERNS.some((pattern) => pattern.test(pathname));
}

/**
 * Checks if a pathname matches API list patterns (stale-while-revalidate)
 */
export function isApiList(pathname: string): boolean {
  return API_LIST_PATTERNS.some((pattern) => pattern.test(pathname));
}

/**
 * Determines the appropriate cache strategy for a given request.
 *
 * Property 8: Cache strategy selection
 * For any request URL, the cache strategy should be:
 * - cache-first for static assets (/icons, /_next/static)
 * - network-first for API single items (/api/threads/[id])
 * - stale-while-revalidate for API lists (/api/threads, /api/comments)
 *
 * @param requestInfo - The request information (pathname and destination)
 * @returns The appropriate cache strategy
 */
export function getCacheStrategy(requestInfo: RequestInfo): CacheStrategy {
  const { pathname, destination } = requestInfo;

  // Static assets - cache-first
  // Includes: /icons/*, /_next/static/*, fonts, images, scripts, styles
  if (isStaticAssetPath(pathname) || isStaticAssetDestination(destination)) {
    return 'cache-first';
  }

  // API routes
  if (pathname.startsWith('/api/')) {
    // API single item routes - network-first
    if (isApiSingleItem(pathname)) {
      return 'network-first';
    }

    // API list routes - stale-while-revalidate
    if (isApiList(pathname)) {
      return 'stale-while-revalidate';
    }

    // Default for other API routes - network-first
    return 'network-first';
  }

  // HTML documents - network-first with offline fallback
  if (destination === 'document') {
    return 'network-first';
  }

  // Default - stale-while-revalidate
  return 'stale-while-revalidate';
}
