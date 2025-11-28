'use client';

import { useState, useEffect } from 'react';
import { usePWA, registerServiceWorker } from '@/hooks/usePWA';

export default function PWAInstallPrompt() {
  const { isInstallable, isInstalled, isOnline, install } = usePWA();
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    // Check localStorage on initial render
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pwa-prompt-dismissed') === 'true';
    }
    return false;
  });

  useEffect(() => {
    // Register service worker on mount
    registerServiceWorker();

    // Show prompt after 30 seconds if installable
    const timer = setTimeout(() => {
      if (isInstallable && !dismissed && !isInstalled) {
        setShowPrompt(true);
      }
    }, 30000);

    return () => clearTimeout(timer);
  }, [isInstallable, dismissed, isInstalled]);

  const handleInstall = async () => {
    const result = await install();
    if (result) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  // Offline indicator
  if (!isOnline) {
    return (
      <div
        className="fixed top-0 left-0 right-0 z-50 py-2 px-4 text-center text-sm font-medium"
        style={{ background: '#f59e0b', color: '#000' }}
      >
        📡 You are currently offline. Some features may not be available.
      </div>
    );
  }

  // Install prompt
  if (!showPrompt || isInstalled || dismissed) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom"
    >
      <div
        className="card shadow-lg"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
        }}
      >
        <div className="flex items-start gap-3">
          <div className="text-3xl">📱</div>
          <div className="flex-1">
            <h3 className="font-bold mb-1">Install LoopHub</h3>
            <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>
              Install our app for a better experience with offline support and quick access.
            </p>
            <div className="flex gap-2">
              <button onClick={handleInstall} className="btn btn-primary text-sm">
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="btn btn-secondary text-sm"
              >
                Not now
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-lg opacity-50 hover:opacity-100"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

// Small install button for settings or footer
export function PWAInstallButton() {
  const { isInstallable, isInstalled, install } = usePWA();

  if (!isInstallable || isInstalled) {
    return null;
  }

  return (
    <button
      onClick={install}
      className="btn btn-secondary text-sm flex items-center gap-2"
    >
      <span>📱</span>
      Install App
    </button>
  );
}
