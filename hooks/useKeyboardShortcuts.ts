'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface KeyboardShortcut {
  key: string;
  description: string;
  action: () => void;
  combo?: string[]; // For multi-key combos like ['g', 'h']
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  onShowHelp?: () => void;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const { enabled = true, onShowHelp } = options;
  const router = useRouter();
  const pathname = usePathname();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Define shortcuts
  const shortcuts: KeyboardShortcut[] = [
    // Navigation shortcuts (g + key)
    { 
      key: 'h', 
      combo: ['g'], 
      description: 'Go to Home',
      action: () => router.push('/') 
    },
    { 
      key: 'n', 
      combo: ['g'], 
      description: 'Go to Notifications',
      action: () => router.push('/notifications') 
    },
    { 
      key: 'b', 
      combo: ['g'], 
      description: 'Go to Bookmarks',
      action: () => router.push('/bookmarks') 
    },
    { 
      key: 's', 
      combo: ['g'], 
      description: 'Go to Settings',
      action: () => router.push('/settings') 
    },
    { 
      key: 'p', 
      combo: ['g'], 
      description: 'Go to Profile',
      action: () => router.push('/settings') 
    },
    // Direct shortcuts
    { 
      key: '/', 
      description: 'Focus search',
      action: () => {
        const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        } else {
          router.push('/search');
        }
      }
    },
    { 
      key: '?', 
      description: 'Show keyboard shortcuts',
      action: () => {
        setShowHelp(true);
        onShowHelp?.();
      }
    },
    { 
      key: 'Escape', 
      description: 'Close modal/menu',
      action: () => {
        setShowHelp(false);
        // Close any open modals
        const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(escapeEvent);
      }
    },
  ];

  // Add context-specific shortcuts
  const forumMatch = pathname?.match(/^\/forum\/([^/]+)$/);
  if (forumMatch) {
    shortcuts.push({
      key: 'c',
      description: 'Create new thread',
      action: () => router.push(`/forum/${forumMatch[1]}/new`),
    });
  }

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Ignore if typing in input/textarea
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Allow Escape to blur
      if (event.key === 'Escape') {
        target.blur();
      }
      return;
    }

    const key = event.key.toLowerCase();

    // Handle 'g' prefix for navigation
    if (key === 'g' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      setPendingKey('g');
      // Clear pending key after timeout
      setTimeout(() => setPendingKey(null), 1500);
      return;
    }

    // Check for combo shortcuts
    if (pendingKey === 'g') {
      const comboShortcut = shortcuts.find(
        s => s.combo?.includes('g') && s.key === key
      );
      if (comboShortcut) {
        event.preventDefault();
        comboShortcut.action();
        setPendingKey(null);
        return;
      }
      setPendingKey(null);
    }

    // Check for direct shortcuts
    const directShortcut = shortcuts.find(
      s => !s.combo && s.key === event.key && !event.ctrlKey && !event.metaKey && !event.altKey
    );
    if (directShortcut) {
      event.preventDefault();
      directShortcut.action();
    }
  }, [enabled, pendingKey, shortcuts, router, pathname]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    shortcuts,
    showHelp,
    setShowHelp,
    pendingKey,
  };
}

// Export shortcut groups for help modal
export const shortcutGroups = {
  navigation: {
    title: 'Navigation',
    shortcuts: [
      { keys: ['g', 'h'], description: 'Go to Home' },
      { keys: ['g', 'n'], description: 'Go to Notifications' },
      { keys: ['g', 'b'], description: 'Go to Bookmarks' },
      { keys: ['g', 's'], description: 'Go to Settings' },
    ],
  },
  actions: {
    title: 'Actions',
    shortcuts: [
      { keys: ['/'], description: 'Focus search' },
      { keys: ['c'], description: 'Create new thread (in forum)' },
      { keys: ['?'], description: 'Show shortcuts' },
      { keys: ['Esc'], description: 'Close modal/menu' },
    ],
  },
};
