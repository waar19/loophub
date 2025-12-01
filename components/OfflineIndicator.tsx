'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOfflineStore } from '@/hooks/useOfflineStore';

/**
 * OfflineIndicator component
 * Shows offline status bar when disconnected and sync progress when reconnecting
 * Requirements: 1.2
 */
export default function OfflineIndicator() {
  const { isOnline, isInitialized, queueCount } = useOfflineStore();
  const [showReconnecting, setShowReconnecting] = useState(false);
  const wasOfflineRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for online/offline events directly
  useEffect(() => {
    const handleOnline = () => {
      if (wasOfflineRef.current) {
        setShowReconnecting(true);
        wasOfflineRef.current = false;
        
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        
        timerRef.current = setTimeout(() => {
          setShowReconnecting(false);
        }, 3000);
      }
    };

    const handleOffline = () => {
      wasOfflineRef.current = true;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initialize wasOfflineRef based on current state
    if (!navigator.onLine) {
      wasOfflineRef.current = true;
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Don't render anything if online and not reconnecting
  if (!isInitialized || (isOnline && !showReconnecting)) {
    return null;
  }

  return (
    <AnimatePresence>
      {(!isOnline || showReconnecting) && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-50"
        >
          {!isOnline ? (
            // Offline state
            <div
              className="flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium"
              style={{
                background: 'var(--warning)',
                color: 'white',
              }}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
                />
              </svg>
              <span>Sin conexión</span>
              {queueCount > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full text-xs" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  {queueCount} pendiente{queueCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          ) : (
            // Reconnecting/syncing state
            <div
              className="flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium"
              style={{
                background: 'var(--success)',
                color: 'white',
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </motion.div>
              <span>Conexión restaurada</span>
              {queueCount > 0 && (
                <span className="ml-2">• Sincronizando {queueCount} elemento{queueCount !== 1 ? 's' : ''}...</span>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
