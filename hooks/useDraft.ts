'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface Draft {
  content: string;
  title?: string;
  updatedAt: number;
}

interface UseDraftOptions {
  /** Clave única para identificar el draft */
  key: string;
  /** Intervalo de autoguardado en ms (default: 5000) */
  saveInterval?: number;
  /** Tiempo máximo que un draft se mantiene (default: 7 días) */
  maxAge?: number;
  /** Callback cuando se restaura un draft */
  onRestore?: (draft: Draft) => void;
}

const DRAFT_PREFIX = 'loophub_draft_';
const DEFAULT_SAVE_INTERVAL = 5000; // 5 segundos
const DEFAULT_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 días

/**
 * Hook para auto-guardar borradores en localStorage
 */
export function useDraft({
  key,
  saveInterval = DEFAULT_SAVE_INTERVAL,
  maxAge = DEFAULT_MAX_AGE,
  onRestore,
}: UseDraftOptions) {
  const storageKey = `${DRAFT_PREFIX}${key}`;
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [hasDraft, setHasDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadRef = useRef(false);

  // Cargar draft existente al montar
  useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;

    const savedDraft = loadDraft(storageKey);
    if (savedDraft) {
      // Verificar si no ha expirado
      const age = Date.now() - savedDraft.updatedAt;
      if (age < maxAge) {
        setHasDraft(true);
        if (onRestore) {
          onRestore(savedDraft);
        }
      } else {
        // Draft expirado, eliminarlo
        removeDraft(storageKey);
      }
    }
  }, [storageKey, maxAge, onRestore]);

  // Auto-guardar con debounce
  const saveDraft = useCallback(() => {
    if (!content.trim() && !title.trim()) {
      // No guardar drafts vacíos
      removeDraft(storageKey);
      setHasDraft(false);
      return;
    }

    setIsSaving(true);
    const draft: Draft = {
      content,
      title: title || undefined,
      updatedAt: Date.now(),
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(draft));
      setLastSaved(new Date());
      setHasDraft(true);
    } catch (error) {
      console.error('Error saving draft:', error);
    } finally {
      setIsSaving(false);
    }
  }, [content, title, storageKey]);

  // Programar auto-guardado cuando cambia el contenido
  useEffect(() => {
    if (!initialLoadRef.current) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveDraft();
    }, saveInterval);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, title, saveDraft, saveInterval]);

  // Guardar antes de cerrar la página
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (content.trim() || title.trim()) {
        saveDraft();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [content, title, saveDraft]);

  // Restaurar draft manualmente
  const restore = useCallback(() => {
    const savedDraft = loadDraft(storageKey);
    if (savedDraft) {
      setContent(savedDraft.content);
      setTitle(savedDraft.title || '');
      return savedDraft;
    }
    return null;
  }, [storageKey]);

  // Limpiar draft (después de publicar)
  const clear = useCallback(() => {
    removeDraft(storageKey);
    setContent('');
    setTitle('');
    setHasDraft(false);
    setLastSaved(null);
  }, [storageKey]);

  // Descartar draft
  const discard = useCallback(() => {
    removeDraft(storageKey);
    setHasDraft(false);
    setLastSaved(null);
  }, [storageKey]);

  return {
    // Estado
    content,
    title,
    hasDraft,
    lastSaved,
    isSaving,
    // Setters
    setContent,
    setTitle,
    // Acciones
    restore,
    clear,
    discard,
    saveDraft,
  };
}

// Helper functions
function loadDraft(key: string): Draft | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error loading draft:', error);
  }
  return null;
}

function removeDraft(key: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing draft:', error);
  }
}

/**
 * Hook simplificado para drafts de comentarios
 */
export function useCommentDraft(threadId: string) {
  return useDraft({
    key: `comment_${threadId}`,
    saveInterval: 3000,
    maxAge: 24 * 60 * 60 * 1000, // 1 día para comentarios
  });
}

/**
 * Hook simplificado para drafts de threads
 */
export function useThreadDraft(forumSlug: string) {
  return useDraft({
    key: `thread_${forumSlug}`,
    saveInterval: 5000,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días para threads
  });
}

/**
 * Hook simplificado para drafts de respuestas a comentarios
 */
export function useReplyDraft(commentId: string) {
  return useDraft({
    key: `reply_${commentId}`,
    saveInterval: 3000,
    maxAge: 24 * 60 * 60 * 1000,
  });
}

/**
 * Limpiar todos los drafts expirados
 * Llamar ocasionalmente para mantener localStorage limpio
 */
export function cleanupExpiredDrafts(maxAge = DEFAULT_MAX_AGE): number {
  if (typeof window === 'undefined') return 0;

  let cleanedCount = 0;
  const now = Date.now();

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(DRAFT_PREFIX)) {
        try {
          const draft = JSON.parse(localStorage.getItem(key) || '');
          if (draft.updatedAt && now - draft.updatedAt > maxAge) {
            localStorage.removeItem(key);
            cleanedCount++;
          }
        } catch {
          // Draft corrupto, eliminarlo
          localStorage.removeItem(key!);
          cleanedCount++;
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up drafts:', error);
  }

  return cleanedCount;
}

export default useDraft;
