/**
 * Lazy Loading de Componentes
 * Centraliza las importaciones dinámicas para componentes pesados
 */

import dynamic from 'next/dynamic';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { createElement } from 'react';

// Función helper para crear loading fallback
const createLoadingFallback = (height: string = '200px') => {
  return createElement(LoadingSkeleton, { 
    variant: 'block',
    className: `w-full`,
    style: { height }
  });
};

/**
 * MarkdownEditor - Editor pesado con preview
 * Solo se carga cuando el usuario necesita escribir
 */
export const LazyMarkdownEditor = dynamic(
  () => import('@/components/MarkdownEditor'),
  {
    loading: () => createLoadingFallback('300px'),
    ssr: false, // Editor no necesita SSR
  }
);

/**
 * MarkdownRenderer - Renderizador de Markdown
 * Puede ser pesado con syntax highlighting
 */
export const LazyMarkdownRenderer = dynamic(
  () => import('@/components/MarkdownRenderer'),
  {
    loading: () => createLoadingFallback('100px'),
    ssr: true, // SEO importante para contenido
  }
);

/**
 * CommentThread - Árbol de comentarios recursivo
 * Puede ser muy pesado con muchos comentarios
 */
export const LazyCommentThread = dynamic(
  () => import('@/components/CommentThread'),
  {
    loading: () => createLoadingFallback('400px'),
    ssr: true,
  }
);

/**
 * LinkPreview - Genera previews de URLs
 * Hace llamadas externas, mejor cargar lazy
 */
export const LazyLinkPreview = dynamic(
  () => import('@/components/LinkPreview'),
  {
    loading: () => createLoadingFallback('80px'),
    ssr: false,
  }
);

/**
 * TrendingPanel - Panel de trending en sidebar
 * No crítico para primera carga
 */
export const LazyTrendingPanel = dynamic(
  () => import('@/components/TrendingPanel'),
  {
    loading: () => createLoadingFallback('200px'),
    ssr: false,
  }
);

/**
 * BadgeDisplay - Muestra badges del usuario
 * No crítico para primera carga
 */
export const LazyBadgeDisplay = dynamic(
  () => import('@/components/BadgeDisplay'),
  {
    loading: () => createLoadingFallback('100px'),
    ssr: false,
  }
);

/**
 * ShareButtons - Botones de compartir en redes
 * Solo se necesita cuando el usuario quiere compartir
 */
export const LazyShareButtons = dynamic(
  () => import('@/components/ShareButtons'),
  {
    loading: () => createLoadingFallback('40px'),
    ssr: false,
  }
);

/**
 * KarmaProgress - Barra de progreso de karma
 */
export const LazyKarmaProgress = dynamic(
  () => import('@/components/KarmaProgress'),
  {
    loading: () => createLoadingFallback('60px'),
    ssr: false,
  }
);

/**
 * InfiniteScroll - Componente de scroll infinito
 */
export const LazyInfiniteScroll = dynamic(
  () => import('@/components/InfiniteScroll'),
  {
    loading: () => createLoadingFallback('100px'),
    ssr: false,
  }
);

/**
 * SearchBar - Barra de búsqueda con autocomplete
 * Puede diferirse después de la carga inicial
 */
export const LazySearchBar = dynamic(
  () => import('@/components/SearchBar'),
  {
    loading: () => createLoadingFallback('40px'),
    ssr: false,
  }
);

/**
 * ThreadSortFilter - Filtros de ordenamiento
 */
export const LazyThreadSortFilter = dynamic(
  () => import('@/components/ThreadSortFilter'),
  {
    loading: () => createLoadingFallback('50px'),
    ssr: false,
  }
);

/**
 * MobileMenu - Menú móvil
 * Solo se necesita en mobile
 */
export const LazyMobileMenu = dynamic(
  () => import('@/components/MobileMenu'),
  {
    loading: () => null, // Sin loading visible
    ssr: false,
  }
);

/**
 * MobileThreadSidebar - Sidebar móvil
 */
export const LazyMobileThreadSidebar = dynamic(
  () => import('@/components/MobileThreadSidebar'),
  {
    loading: () => null,
    ssr: false,
  }
);

/**
 * PWAInstallPrompt - Prompt de instalación PWA
 */
export const LazyPWAInstallPrompt = dynamic(
  () => import('@/components/PWAInstallPrompt'),
  {
    loading: () => null,
    ssr: false,
  }
);

/**
 * NotificationBell - Campana de notificaciones
 */
export const LazyNotificationBell = dynamic(
  () => import('@/components/NotificationBell'),
  {
    loading: () => createLoadingFallback('40px'),
    ssr: false,
  }
);

/**
 * Toast Container - Contenedor de toasts
 */
export const LazyToastContainer = dynamic(
  () => import('@/components/ToastContainer'),
  {
    loading: () => null,
    ssr: false,
  }
);

// Re-export para uso más fácil
export {
  LazyMarkdownEditor as MarkdownEditor,
  LazyMarkdownRenderer as MarkdownRenderer,
  LazyCommentThread as CommentThread,
  LazyLinkPreview as LinkPreview,
  LazyTrendingPanel as TrendingPanel,
  LazyBadgeDisplay as BadgeDisplay,
  LazyShareButtons as ShareButtons,
  LazyKarmaProgress as KarmaProgress,
  LazyInfiniteScroll as InfiniteScroll,
  LazySearchBar as SearchBar,
  LazyThreadSortFilter as ThreadSortFilter,
  LazyMobileMenu as MobileMenu,
  LazyMobileThreadSidebar as MobileThreadSidebar,
  LazyPWAInstallPrompt as PWAInstallPrompt,
  LazyNotificationBell as NotificationBell,
  LazyToastContainer as ToastContainer,
};
