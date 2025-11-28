/**
 * Hook para Prefetch de Rutas
 * Mejora la navegación precargando páginas probables
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface PrefetchOptions {
  /** Delay antes de hacer prefetch (ms) */
  delay?: number;
  /** Usar Intersection Observer */
  useIntersection?: boolean;
  /** Prefetch en hover */
  prefetchOnHover?: boolean;
}

/**
 * Hook para prefetch inteligente de rutas
 */
export function usePrefetch(options: PrefetchOptions = {}) {
  const {
    delay = 100,
    prefetchOnHover = true,
  } = options;

  const router = useRouter();
  const prefetchedUrls = useRef<Set<string>>(new Set());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Prefetch una URL específica
   */
  const prefetch = useCallback((url: string) => {
    if (prefetchedUrls.current.has(url)) return;
    
    prefetchedUrls.current.add(url);
    router.prefetch(url);
  }, [router]);

  /**
   * Prefetch con delay
   */
  const prefetchDelayed = useCallback((url: string) => {
    if (prefetchedUrls.current.has(url)) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      prefetch(url);
    }, delay);
  }, [prefetch, delay]);

  /**
   * Cancelar prefetch pendiente
   */
  const cancelPrefetch = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  /**
   * Props para elementos con prefetch en hover
   */
  const getPrefetchProps = useCallback((url: string) => {
    if (!prefetchOnHover) return {};

    return {
      onMouseEnter: () => prefetchDelayed(url),
      onMouseLeave: cancelPrefetch,
      onFocus: () => prefetchDelayed(url),
      onBlur: cancelPrefetch,
    };
  }, [prefetchDelayed, cancelPrefetch, prefetchOnHover]);

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  /**
   * Verificar si una URL ya fue prefetched
   */
  const isPrefetched = useCallback((url: string) => {
    return prefetchedUrls.current.has(url);
  }, []);

  return {
    prefetch,
    prefetchDelayed,
    cancelPrefetch,
    getPrefetchProps,
    isPrefetched,
  };
}

/**
 * Hook para prefetch basado en visibilidad
 */
export function usePrefetchOnVisible(url: string, enabled = true) {
  const router = useRouter();
  const prefetched = useRef(false);
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled || prefetched.current || !elementRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !prefetched.current) {
            router.prefetch(url);
            prefetched.current = true;
            observer.disconnect();
          }
        });
      },
      { rootMargin: '100px' }
    );

    observer.observe(elementRef.current);

    return () => observer.disconnect();
  }, [router, url, enabled]);

  return elementRef;
}

/**
 * Prefetch rutas críticas de la aplicación
 */
export function usePrefetchCriticalRoutes() {
  const router = useRouter();
  const hasPrefetched = useRef(false);

  useEffect(() => {
    if (hasPrefetched.current) return;
    hasPrefetched.current = true;

    // Rutas más probables que el usuario visitará
    const criticalRoutes = [
      '/',
      '/forum',
      '/search',
      '/notifications',
    ];

    // Prefetch después de que la página principal cargue
    const timer = setTimeout(() => {
      criticalRoutes.forEach((route) => {
        router.prefetch(route);
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);
}

/**
 * Hook para prefetch de threads relacionados
 */
export function usePrefetchThreads(threadIds: string[]) {
  const router = useRouter();
  const prefetchedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const newIds = threadIds.filter(id => !prefetchedIds.current.has(id));
    
    if (newIds.length === 0) return;

    // Prefetch máximo 5 threads para no sobrecargar
    const toFetch = newIds.slice(0, 5);
    
    const timer = setTimeout(() => {
      toFetch.forEach((id) => {
        router.prefetch(`/thread/${id}`);
        prefetchedIds.current.add(id);
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [router, threadIds]);
}

export default usePrefetch;
