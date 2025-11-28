'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from '@/components/TranslationsProvider';

interface DraftIndicatorProps {
  hasDraft: boolean;
  lastSaved: Date | null;
  isSaving: boolean;
  onRestore?: () => void;
  onDiscard?: () => void;
  className?: string;
}

export default function DraftIndicator({
  hasDraft,
  lastSaved,
  isSaving,
  onRestore,
  onDiscard,
  className = '',
}: DraftIndicatorProps) {
  const { t } = useTranslations();
  // Inicializar directamente desde props para evitar setState en useEffect
  const [showRestorePrompt, setShowRestorePrompt] = useState(hasDraft && !!onRestore);
  const [timeSinceLastSave, setTimeSinceLastSave] = useState<string>('');

  // Actualizar tiempo desde última guardada
  useEffect(() => {
    if (!lastSaved) return;

    const updateTime = () => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - lastSaved.getTime()) / 1000);

      if (diff < 5) {
        setTimeSinceLastSave('Guardado');
      } else if (diff < 60) {
        setTimeSinceLastSave(`${diff}s`);
      } else {
        const mins = Math.floor(diff / 60);
        setTimeSinceLastSave(`${mins}m`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, [lastSaved]);

  if (showRestorePrompt && hasDraft) {
    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 ${className}`}>
        <span className="text-amber-600 dark:text-amber-400">📝</span>
        <span className="text-sm text-amber-700 dark:text-amber-300 flex-1">
          {t('common.draftFound') || 'Se encontró un borrador guardado'}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              onRestore?.();
              setShowRestorePrompt(false);
            }}
            className="px-3 py-1 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md transition-colors"
          >
            {t('common.restore') || 'Restaurar'}
          </button>
          <button
            onClick={() => {
              onDiscard?.();
              setShowRestorePrompt(false);
            }}
            className="px-3 py-1 text-sm font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800/30 rounded-md transition-colors"
          >
            {t('common.discard') || 'Descartar'}
          </button>
        </div>
      </div>
    );
  }

  // Mostrar indicador de guardado
  if (isSaving) {
    return (
      <div className={`flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 ${className}`}>
        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
        <span>{t('common.saving') || 'Guardando...'}</span>
      </div>
    );
  }

  if (lastSaved && timeSinceLastSave) {
    return (
      <div className={`flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 ${className}`}>
        <div className="w-2 h-2 rounded-full bg-green-500"></div>
        <span>
          {t('common.saved') || 'Guardado'} {timeSinceLastSave !== 'Guardado' && `(${timeSinceLastSave})`}
        </span>
      </div>
    );
  }

  return null;
}

/**
 * Banner de restauración de draft más prominente
 */
interface DraftRestoreBannerProps {
  show: boolean;
  onRestore: () => void;
  onDiscard: () => void;
  draftAge?: number; // en ms
}

export function DraftRestoreBanner({
  show,
  onRestore,
  onDiscard,
  draftAge,
}: DraftRestoreBannerProps) {
  const { t } = useTranslations();
  
  if (!show) return null;

  const getAgeString = (age?: number): string => {
    if (!age) return '';
    
    const hours = Math.floor(age / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days} día${days > 1 ? 's' : ''}`;
    }
    if (hours > 0) {
      return `${hours} hora${hours > 1 ? 's' : ''}`;
    }
    return 'recientemente';
  };

  return (
    <div className="mb-4 p-4 rounded-xl bg-linear-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700/50 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-800/50 flex items-center justify-center text-2xl">
          📝
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-amber-800 dark:text-amber-200">
            {t('common.draftFound') || 'Borrador encontrado'}
          </h3>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
            {t('common.draftFoundMessage') || 'Tienes un borrador sin publicar'}
            {draftAge && (
              <span className="ml-1">
                (guardado hace {getAgeString(draftAge)})
              </span>
            )}
          </p>
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={onRestore}
              className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-sm"
            >
              {t('common.restoreDraft') || 'Restaurar borrador'}
            </button>
            <button
              onClick={onDiscard}
              className="px-4 py-2 text-sm font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800/30 rounded-lg transition-colors"
            >
              {t('common.startFresh') || 'Empezar de nuevo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
