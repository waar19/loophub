'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useOfflineStore } from '@/hooks/useOfflineStore';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import type { OfflineQueueItem } from '@/lib/offline/types';

/**
 * PWASettings component
 * Settings panel for PWA features: cache management, push notifications, offline queue
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */
export default function PWASettings() {
  const {
    isInitialized,
    isSupported,
    cacheSize,
    queueCount,
    clearCache,
    getQueuedActions,
    cancelQueuedAction,
    refreshStats,
  } = useOfflineStore();

  const {
    isSupported: pushSupported,
    permission,
    isSubscribed,
    isLoading: pushLoading,
    error: pushError,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  const [isClearing, setIsClearing] = useState(false);
  const [queueItems, setQueueItems] = useState<OfflineQueueItem[]>([]);
  const [showQueue, setShowQueue] = useState(false);

  // Load queue items
  useEffect(() => {
    const loadItems = async () => {
      try {
        const items = await getQueuedActions();
        setQueueItems(items);
      } catch (error) {
        console.error('[PWASettings] Error loading queue:', error);
      }
    };

    if (isSupported && showQueue) {
      loadItems();
    }
  }, [isSupported, showQueue, queueCount, getQueuedActions]);

  const handleClearCache = async () => {
    if (!confirm('¿Estás seguro de que quieres limpiar la caché? Se eliminarán todos los datos guardados offline.')) {
      return;
    }
    
    setIsClearing(true);
    try {
      await clearCache();
      await refreshStats();
    } catch (error) {
      console.error('[PWASettings] Error clearing cache:', error);
    } finally {
      setIsClearing(false);
    }
  };

  const handleTogglePush = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const handleCancelQueueItem = async (itemId: string) => {
    try {
      await cancelQueuedAction(itemId);
      setQueueItems(prev => prev.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('[PWASettings] Error canceling item:', error);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getActionLabel = (item: OfflineQueueItem) => {
    const labels: Record<string, Record<string, string>> = {
      comment: { create: 'Nuevo comentario', update: 'Editar comentario', delete: 'Eliminar comentario' },
      vote: { create: 'Voto', update: 'Cambiar voto', delete: 'Quitar voto' },
      reaction: { create: 'Reacción', update: 'Cambiar reacción', delete: 'Quitar reacción' },
    };
    return labels[item.type]?.[item.action] || `${item.type} - ${item.action}`;
  };

  if (!isInitialized) {
    return (
      <div className="p-4 text-center" style={{ color: 'var(--muted)' }}>
        Cargando configuración...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cache Management Section */}
      <div className="card p-4">
        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--foreground)' }}>
          📦 Almacenamiento Offline
        </h3>
        
        {!isSupported ? (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Tu navegador no soporta almacenamiento offline.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Cache size display */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                  Tamaño de caché
                </p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  Contenido guardado para uso offline
                </p>
              </div>
              <span className="text-lg font-bold" style={{ color: 'var(--brand)' }}>
                {formatBytes(cacheSize)}
              </span>
            </div>

            {/* Clear cache button */}
            <button
              onClick={handleClearCache}
              disabled={isClearing || cacheSize === 0}
              className="w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              style={{
                background: 'var(--error)',
                color: 'white',
              }}
            >
              {isClearing ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  />
                  Limpiando...
                </span>
              ) : (
                '🗑️ Limpiar caché'
              )}
            </button>
          </div>
        )}
      </div>

      {/* Push Notifications Section */}
      <div className="card p-4">
        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--foreground)' }}>
          🔔 Notificaciones Push
        </h3>
        
        {!pushSupported ? (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Tu navegador no soporta notificaciones push.
          </p>
        ) : permission === 'denied' ? (
          <div className="space-y-2">
            <p className="text-sm" style={{ color: 'var(--error)' }}>
              Las notificaciones están bloqueadas.
            </p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Habilítalas en la configuración de tu navegador.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                  Recibir notificaciones
                </p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  Recibe alertas de comentarios, menciones y más
                </p>
              </div>
              <button
                onClick={handleTogglePush}
                disabled={pushLoading}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  pushLoading ? 'opacity-50' : ''
                }`}
                style={{
                  background: isSubscribed ? 'var(--brand)' : 'var(--border)',
                }}
              >
                <motion.span
                  className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
                  animate={{ left: isSubscribed ? '26px' : '4px' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
            
            {pushError && (
              <p className="text-xs" style={{ color: 'var(--error)' }}>
                {pushError}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Offline Queue Section */}
      {isSupported && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
              📋 Cola de sincronización
            </h3>
            {queueCount > 0 && (
              <span
                className="px-2 py-1 rounded-full text-xs font-medium"
                style={{ background: 'var(--warning)', color: 'white' }}
              >
                {queueCount} pendiente{queueCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {queueCount === 0 ? (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              No hay acciones pendientes de sincronizar.
            </p>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => setShowQueue(!showQueue)}
                className="text-sm font-medium transition-colors"
                style={{ color: 'var(--brand)' }}
              >
                {showQueue ? '▼ Ocultar detalles' : '▶ Ver detalles'}
              </button>

              {showQueue && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  {queueItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-lg"
                      style={{ background: 'var(--background)' }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                          {getActionLabel(item)}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>
                          {item.status === 'failed' ? 'Fallido' : 'Pendiente'}
                          {item.retryCount > 0 && ` • Intento ${item.retryCount}`}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCancelQueueItem(item.id)}
                        className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        title="Cancelar"
                      >
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </motion.div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
