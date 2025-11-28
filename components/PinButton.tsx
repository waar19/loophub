'use client';

import { useState, useTransition } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { useTranslations } from '@/components/TranslationsProvider';

interface PinButtonProps {
  threadId: string;
  isPinned: boolean;
  onPinChange?: (isPinned: boolean) => void;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export default function PinButton({
  threadId,
  isPinned,
  onPinChange,
  showLabel = true,
  size = 'md',
}: PinButtonProps) {
  const [pinned, setPinned] = useState(isPinned);
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();
  const { t } = useTranslations();

  const handleTogglePin = () => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/threads/${threadId}/pin`, {
          method: pinned ? 'DELETE' : 'POST',
          credentials: 'include',
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to update pin status');
        }

        const newPinned = !pinned;
        setPinned(newPinned);
        onPinChange?.(newPinned);
        showToast(
          newPinned ? t('threads.threadPinned') : t('threads.threadUnpinned'),
          'success'
        );
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : t('common.error'),
          'error'
        );
      }
    });
  };

  const sizeClasses = size === 'sm' ? 'text-sm px-2 py-1' : 'px-3 py-1.5';

  return (
    <button
      onClick={handleTogglePin}
      disabled={isPending}
      className={`btn flex items-center gap-1.5 ${sizeClasses}`}
      style={{
        background: pinned ? 'var(--brand)' : 'var(--card-bg)',
        color: pinned ? 'white' : 'var(--foreground)',
        border: '1px solid var(--border)',
        opacity: isPending ? 0.7 : 1,
      }}
      title={pinned ? t('threads.unpinThread') : t('threads.pinThread')}
    >
      <span>{pinned ? '📌' : '📍'}</span>
      {showLabel && (
        <span>
          {isPending
            ? '...'
            : pinned
            ? t('threads.unpin')
            : t('threads.pin')}
        </span>
      )}
    </button>
  );
}
