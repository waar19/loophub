'use client';

import { useState, useTransition } from 'react';
import {
  togglePinThread,
  toggleLockThread,
  moderateHideThread,
} from '@/lib/actions/moderation';
import { useToast } from '@/contexts/ToastContext';

interface ModeratorActionsProps {
  threadId: string;
  isPinned: boolean;
  isLocked: boolean;
  isHidden: boolean;
  permissions: {
    can_pin_threads?: boolean;
    can_lock_threads?: boolean;
    can_hide_content?: boolean;
  };
}

export default function ModeratorActions({
  threadId,
  isPinned,
  isLocked,
  isHidden,
  permissions,
}: ModeratorActionsProps) {
  const [showReasonModal, setShowReasonModal] = useState<'lock' | 'hide' | null>(null);
  const [reason, setReason] = useState('');
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();

  const handlePin = () => {
    startTransition(async () => {
      const result = await togglePinThread(threadId, !isPinned);
      if (result.success) {
        showToast(isPinned ? 'Thread desanclado' : 'Thread anclado', 'success');
      } else {
        showToast(result.error || 'Error', 'error');
      }
    });
  };

  const handleLock = () => {
    if (!isLocked) {
      setShowReasonModal('lock');
    } else {
      startTransition(async () => {
        const result = await toggleLockThread(threadId, false);
        if (result.success) {
          showToast('Thread desbloqueado', 'success');
        } else {
          showToast(result.error || 'Error', 'error');
        }
      });
    }
  };

  const handleHide = () => {
    if (!isHidden) {
      setShowReasonModal('hide');
    } else {
      startTransition(async () => {
        const result = await moderateHideThread(threadId, false);
        if (result.success) {
          showToast('Thread visible', 'success');
        } else {
          showToast(result.error || 'Error', 'error');
        }
      });
    }
  };

  const confirmAction = () => {
    if (showReasonModal === 'lock') {
      startTransition(async () => {
        const result = await toggleLockThread(threadId, true, reason);
        if (result.success) {
          showToast('Thread bloqueado', 'success');
          setShowReasonModal(null);
          setReason('');
        } else {
          showToast(result.error || 'Error', 'error');
        }
      });
    } else if (showReasonModal === 'hide') {
      startTransition(async () => {
        const result = await moderateHideThread(threadId, true, reason);
        if (result.success) {
          showToast('Thread oculto', 'success');
          setShowReasonModal(null);
          setReason('');
        } else {
          showToast(result.error || 'Error', 'error');
        }
      });
    }
  };

  const hasAnyPermission =
    permissions.can_pin_threads ||
    permissions.can_lock_threads ||
    permissions.can_hide_content;

  if (!hasAnyPermission) return null;

  return (
    <>
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))',
          border: '1px solid rgba(59, 130, 246, 0.3)',
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🛡️</span>
          <h3 className="font-semibold text-sm">Acciones de Moderador</h3>
        </div>

        <div className="flex flex-wrap gap-2">
          {permissions.can_pin_threads && (
            <button
              onClick={handlePin}
              disabled={isPending}
              className="btn btn-sm flex items-center gap-1"
              style={{
                background: isPinned ? 'var(--primary)' : 'var(--card-bg)',
                color: isPinned ? 'white' : 'var(--foreground)',
              }}
            >
              📌 {isPinned ? 'Desanclar' : 'Anclar'}
            </button>
          )}

          {permissions.can_lock_threads && (
            <button
              onClick={handleLock}
              disabled={isPending}
              className="btn btn-sm flex items-center gap-1"
              style={{
                background: isLocked ? '#ef4444' : 'var(--card-bg)',
                color: isLocked ? 'white' : 'var(--foreground)',
              }}
            >
              {isLocked ? '🔓 Desbloquear' : '🔒 Bloquear'}
            </button>
          )}

          {permissions.can_hide_content && (
            <button
              onClick={handleHide}
              disabled={isPending}
              className="btn btn-sm flex items-center gap-1"
              style={{
                background: isHidden ? '#f59e0b' : 'var(--card-bg)',
                color: isHidden ? 'white' : 'var(--foreground)',
              }}
            >
              {isHidden ? '👁️ Mostrar' : '🙈 Ocultar'}
            </button>
          )}
        </div>

        {(isLocked || isPinned || isHidden) && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {isPinned && (
              <span className="px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">
                📌 Anclado
              </span>
            )}
            {isLocked && (
              <span className="px-2 py-1 rounded-full bg-red-500/20 text-red-400">
                🔒 Bloqueado
              </span>
            )}
            {isHidden && (
              <span className="px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400">
                🙈 Oculto
              </span>
            )}
          </div>
        )}
      </div>

      {/* Reason Modal */}
      {showReasonModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setShowReasonModal(null)}
        >
          <div
            className="card w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-lg mb-4">
              {showReasonModal === 'lock' ? '🔒 Bloquear Thread' : '🙈 Ocultar Thread'}
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
              {showReasonModal === 'lock'
                ? 'Los usuarios no podrán comentar en este thread.'
                : 'Este thread no aparecerá en las listas públicas.'}
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Razón (opcional)"
              className="input w-full mb-4"
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowReasonModal(null)}
                className="btn"
                style={{ background: 'var(--card-bg)' }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmAction}
                disabled={isPending}
                className="btn"
                style={{
                  background: showReasonModal === 'lock' ? '#ef4444' : '#f59e0b',
                  color: 'white',
                }}
              >
                {isPending ? 'Procesando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
