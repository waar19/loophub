'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useOfflineStore } from '@/hooks/useOfflineStore';
import type { CachedThread } from '@/lib/offline/types';

/**
 * Enhanced Offline Page
 * Shows cached content suggestions and offline queue status
 * Requirements: 1.3
 */
export default function OfflinePage() {
  const { 
    isInitialized, 
    isSupported, 
    getCachedThreads, 
    queueCount,
    isOnline 
  } = useOfflineStore();
  
  const [cachedThreads, setCachedThreads] = useState<CachedThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load cached threads on mount
  useEffect(() => {
    const loadCachedContent = async () => {
      if (!isSupported) {
        setIsLoading(false);
        return;
      }
      
      try {
        const threads = await getCachedThreads();
        // Sort by most recently cached
        threads.sort((a, b) => b.cachedAt - a.cachedAt);
        setCachedThreads(threads.slice(0, 10)); // Show top 10
      } catch (error) {
        console.error('[OfflinePage] Error loading cached content:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isInitialized) {
      loadCachedContent();
    }
  }, [isInitialized, isSupported, getCachedThreads]);

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Hace un momento';
    if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)} h`;
    return new Date(timestamp).toLocaleDateString();
  };

  // If online, redirect suggestion
  if (isOnline && isInitialized) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-3xl font-bold mb-2">¡Estás conectado!</h1>
          <p className="text-lg mb-6" style={{ color: 'var(--muted)' }}>
            Tu conexión a internet está funcionando.
          </p>
          <Link href="/" className="btn btn-primary">
            🏠 Ir al Inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">📡</div>
          <h1 className="text-3xl font-bold mb-2">Estás sin conexión</h1>
          <p className="text-lg" style={{ color: 'var(--muted)' }}>
            No te preocupes, puedes seguir navegando contenido guardado.
          </p>
        </div>

        {/* Offline Queue Status */}
        {queueCount > 0 && (
          <div 
            className="card p-4 mb-6"
            style={{ borderLeft: '4px solid var(--warning)' }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">⏳</span>
              <div>
                <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                  {queueCount} acción{queueCount !== 1 ? 'es' : ''} pendiente{queueCount !== 1 ? 's' : ''}
                </p>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  Se sincronizarán automáticamente cuando vuelvas a conectarte.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cached Content */}
        <div className="card p-4">
          <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--foreground)' }}>
            📚 Contenido disponible offline
          </h2>

          {isLoading ? (
            <div className="py-8 text-center">
              <div 
                className="animate-spin w-8 h-8 border-4 border-current border-t-transparent rounded-full mx-auto"
                style={{ color: 'var(--brand)' }}
              />
              <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
                Cargando contenido guardado...
              </p>
            </div>
          ) : !isSupported ? (
            <div className="py-8 text-center">
              <p style={{ color: 'var(--muted)' }}>
                Tu navegador no soporta almacenamiento offline.
              </p>
            </div>
          ) : cachedThreads.length === 0 ? (
            <div className="py-8 text-center">
              <div className="text-4xl mb-3">📭</div>
              <p style={{ color: 'var(--muted)' }}>
                No hay contenido guardado offline.
              </p>
              <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
                Visita hilos mientras estés conectado para guardarlos automáticamente.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {cachedThreads.map((cached) => (
                <Link
                  key={cached.id}
                  href={`/thread/${cached.id}`}
                  className="block p-3 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                  style={{ background: 'var(--background)' }}
                >
                  <h3 
                    className="font-medium truncate"
                    style={{ color: 'var(--foreground)' }}
                  >
                    {cached.data.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: 'var(--muted)' }}>
                    <span>Guardado {formatTimeAgo(cached.cachedAt)}</span>
                    {cached.data.commentCount !== undefined && (
                      <>
                        <span>•</span>
                        <span>{cached.data.commentCount} comentarios</span>
                      </>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary"
          >
            🔄 Intentar reconectar
          </button>
          <Link href="/" className="btn btn-secondary">
            🏠 Ir al Inicio
          </Link>
        </div>

        {/* Tips */}
        <div className="mt-8 text-center">
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            💡 Tip: Visita hilos mientras estés conectado para guardarlos automáticamente.
          </p>
        </div>
      </div>
    </div>
  );
}
