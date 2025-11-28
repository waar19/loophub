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
        className="card p-4"
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.08))',
          border: '1px solid rgba(99, 102, 241, 0.2)',
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div 
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            <span className="text-sm">🛡️</span>
          </div>
          <h3 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
            Acciones de Moderador
          </h3>
        </div>

        <div className="flex flex-wrap gap-2">
          {permissions.can_pin_threads && (
            <button
              onClick={handlePin}
              disabled={isPending}
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                isPinned 
                  ? 'bg-blue-500 text-white shadow-md hover:bg-blue-600' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              📌 {isPinned ? 'Desanclar' : 'Anclar'}
            </button>
          )}

          {permissions.can_lock_threads && (
            <button
              onClick={handleLock}
              disabled={isPending}
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                isLocked 
                  ? 'bg-red-500 text-white shadow-md hover:bg-red-600' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {isLocked ? '🔓 Desbloquear' : '🔒 Bloquear'}
            </button>
          )}

          {permissions.can_hide_content && (
            <button
              onClick={handleHide}
              disabled={isPending}
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                isHidden 
                  ? 'bg-amber-500 text-white shadow-md hover:bg-amber-600' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {isHidden ? '👁️ Mostrar' : '🙈 Ocultar'}
            </button>
          )}
        </div>
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
