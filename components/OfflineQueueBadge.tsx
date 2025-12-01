'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOfflineStore } from '@/hooks/useOfflineStore';
import type { OfflineQueueItem } from '@/lib/offline/types';

/**
 * OfflineQueueBadge component
 * Shows count of pending actions with expandable panel for queue details
 * Requirements: 2.3, 5.4, 5.5
 */
export default function OfflineQueueBadge() {
  const { queueCount, getQueuedActions, cancelQueuedAction, isInitialized, isSupported } = useOfflineStore();
  const [isOpen, setIsOpen] = useState(false);
  const [queueItems, setQueueItems] = useState<OfflineQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Load queue items when panel opens
  useEffect(() => {
    if (isOpen && isSupported) {
      loadQueueItems();
    }
  }, [isOpen, isSupported]);

  const loadQueueItems = async () => {
    setIsLoading(true);
    try {
      const items = await getQueuedActions();
      setQueueItems(items);
    } catch (error) {
      console.error('[OfflineQueueBadge] Error loading queue:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async (itemId: string) => {
    try {
      await cancelQueuedAction(itemId);
      setQueueItems(prev => prev.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('[OfflineQueueBadge] Error canceling item:', error);
    }
  };

  const getActionIcon = (type: string, action: string) => {
    if (type === 'comment') return '💬';
    if (type === 'vote') return action === 'create' ? '⬆️' : '⬇️';
    if (type === 'reaction') return '😊';
    return '📝';
  };

  const getActionLabel = (item: OfflineQueueItem) => {
    const labels: Record<string, Record<string, string>> = {
      comment: { create: 'Nuevo comentario', update: 'Editar comentario', delete: 'Eliminar comentario' },
      vote: { create: 'Voto', update: 'Cambiar voto', delete: 'Quitar voto' },
      reaction: { create: 'Reacción', update: 'Cambiar reacción', delete: 'Quitar reacción' },
    };
    return labels[item.type]?.[item.action] || `${item.type} - ${item.action}`;
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Hace un momento';
    if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)} h`;
    return date.toLocaleDateString();
  };

  // Don't render if not initialized or no pending items
  if (!isInitialized || !isSupported || queueCount === 0) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-label={`${queueCount} acciones pendientes`}
        title="Cola de sincronización"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          style={{ color: 'var(--foreground)' }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <span
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ background: 'var(--warning)' }}
        >
          {queueCount > 9 ? '9+' : queueCount}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 rounded-lg shadow-xl border z-50 overflow-hidden"
            style={{
              background: 'var(--card-bg)',
              borderColor: 'var(--border)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-4 border-b"
              style={{ borderColor: 'var(--border)' }}
            >
              <h3 className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>
                Cola de sincronización
              </h3>
              <span
                className="text-xs px-2 py-1 rounded-full"
                style={{ background: 'var(--warning)', color: 'white' }}
              >
                {queueCount} pendiente{queueCount !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Queue items */}
            <div className="max-h-64 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center">
                  <div
                    className="animate-spin w-6 h-6 border-2 border-current border-t-transparent rounded-full mx-auto"
                    style={{ color: 'var(--brand)' }}
                  />
                </div>
              ) : queueItems.length === 0 ? (
                <div className="p-4 text-center text-sm" style={{ color: 'var(--muted)' }}>
                  No hay acciones pendientes
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {queueItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <span className="text-xl shrink-0">
                        {getActionIcon(item.type, item.action)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                          {getActionLabel(item)}
                        </p>
                        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
                          <span>{formatTime(item.createdAt)}</span>
                          {item.status === 'failed' && (
                            <span className="text-red-500">• Fallido</span>
                          )}
                          {item.retryCount > 0 && (
                            <span>• Intento {item.retryCount}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleCancel(item.id)}
                        className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        title="Cancelar"
                      >
                        <svg
                          className="w-4 h-4 text-red-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="p-3 border-t text-center text-xs"
              style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
            >
              Se sincronizará automáticamente al conectar
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
