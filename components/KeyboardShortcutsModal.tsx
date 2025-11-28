'use client';

import { useEffect } from 'react';
import { useTranslations } from '@/components/TranslationsProvider';
import { shortcutGroups } from '@/hooks/useKeyboardShortcuts';
import MotionWrapper from './MotionWrapper';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const { t } = useTranslations();

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tr = t as any;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <MotionWrapper>
        <div
          className="relative w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
          style={{ background: 'var(--card-bg)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="px-6 py-4 border-b flex items-center justify-between"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">⌨️</span>
              <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
                {tr('shortcuts.title')}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--muted)' }}
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {Object.entries(shortcutGroups).map(([key, group]) => (
              <div key={key} className="mb-6 last:mb-0">
                <h3
                  className="text-sm font-semibold uppercase tracking-wider mb-3"
                  style={{ color: 'var(--muted)' }}
                >
                  {tr(`shortcuts.${key}`) || group.title}
                </h3>
                <div className="space-y-2">
                  {group.shortcuts.map((shortcut, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2 px-3 rounded-lg"
                      style={{ background: 'var(--background)' }}
                    >
                      <span style={{ color: 'var(--foreground)' }}>
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((k, i) => (
                          <span key={i} className="flex items-center gap-1">
                            <kbd
                              className="px-2 py-1 text-xs font-mono rounded border"
                              style={{
                                background: 'var(--card-bg)',
                                borderColor: 'var(--border)',
                                color: 'var(--foreground)',
                              }}
                            >
                              {k === 'Esc' ? 'Esc' : k}
                            </kbd>
                            {i < shortcut.keys.length - 1 && (
                              <span style={{ color: 'var(--muted)' }}>+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div
            className="px-6 py-4 border-t text-center"
            style={{ borderColor: 'var(--border)' }}
          >
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {tr('shortcuts.pressQuestion')}
            </p>
          </div>
        </div>
      </MotionWrapper>
    </div>
  );
}
