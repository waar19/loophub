'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface DraftData {
  content: string;
  title?: string;
  savedAt: number;
}

interface UseDraftAutosaveOptions {
  key: string; // Unique key for this draft (e.g., 'forum-slug-new' or 'thread-id-comment')
  debounceMs?: number; // Debounce time in ms (default: 2000)
  maxAge?: number; // Max age of draft in ms before auto-delete (default: 7 days)
}

interface UseDraftAutosaveReturn {
  draft: DraftData | null;
  saveDraft: (content: string, title?: string) => void;
  clearDraft: () => void;
  hasDraft: boolean;
  lastSaved: Date | null;
  restoreDraft: () => DraftData | null;
}

const DRAFT_PREFIX = 'loophub_draft_';
const DEFAULT_DEBOUNCE_MS = 2000;
const DEFAULT_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

export function useDraftAutosave(options: UseDraftAutosaveOptions): UseDraftAutosaveReturn {
  const { key, debounceMs = DEFAULT_DEBOUNCE_MS, maxAge = DEFAULT_MAX_AGE } = options;
  const storageKey = `${DRAFT_PREFIX}${key}`;
  
  const [draft, setDraft] = useState<DraftData | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadDone = useRef(false);

  // Load draft from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (initialLoadDone.current) return;
    
    initialLoadDone.current = true;

    const loadDraft = () => {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed: DraftData = JSON.parse(stored);
          
          // Check if draft is expired
          if (Date.now() - parsed.savedAt > maxAge) {
            localStorage.removeItem(storageKey);
            return;
          }
          
          setDraft(parsed);
          setLastSaved(new Date(parsed.savedAt));
        }
      } catch (error) {
        console.error('Error loading draft:', error);
        localStorage.removeItem(storageKey);
      }
    };

    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(loadDraft, 0);
  }, [storageKey, maxAge]);

  // Cleanup old drafts periodically
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const cleanupOldDrafts = () => {
      const keys = Object.keys(localStorage);
      const now = Date.now();

      keys.forEach(k => {
        if (k.startsWith(DRAFT_PREFIX)) {
          try {
            const stored = localStorage.getItem(k);
            if (stored) {
              const parsed: DraftData = JSON.parse(stored);
              if (now - parsed.savedAt > maxAge) {
                localStorage.removeItem(k);
              }
            }
          } catch {
            localStorage.removeItem(k);
          }
        }
      });
    };

    cleanupOldDrafts();
  }, [maxAge]);

  const saveDraft = useCallback((content: string, title?: string) => {
    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Don't save empty content
    if (!content.trim() && !title?.trim()) {
      return;
    }

    debounceRef.current = setTimeout(() => {
      try {
        const draftData: DraftData = {
          content,
          title,
          savedAt: Date.now(),
        };

        localStorage.setItem(storageKey, JSON.stringify(draftData));
        setDraft(draftData);
        setLastSaved(new Date());
      } catch (error) {
        console.error('Error saving draft:', error);
      }
    }, debounceMs);
  }, [storageKey, debounceMs]);

  const clearDraft = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    try {
      localStorage.removeItem(storageKey);
      setDraft(null);
      setLastSaved(null);
    } catch (error) {
      console.error('Error clearing draft:', error);
    }
  }, [storageKey]);

  const restoreDraft = useCallback((): DraftData | null => {
    return draft;
  }, [draft]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    draft,
    saveDraft,
    clearDraft,
    hasDraft: !!draft && (!!draft.content.trim() || !!draft.title?.trim()),
    lastSaved,
    restoreDraft,
  };
}

// Helper function to generate draft keys
export function getDraftKey(type: 'thread' | 'comment' | 'reply', id: string): string {
  return `${type}-${id}`;
}

// Helper to get time ago string
export function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'ahora';
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)}h`;
  return `hace ${Math.floor(seconds / 86400)}d`;
}
