'use client';

import { useState, useCallback } from 'react';
import SimpleForm from './SimpleForm';
import DraftIndicator, { DraftRestoreBanner } from './DraftIndicator';
import { useDraft } from '@/hooks/useDraft';
import { useTranslations } from './TranslationsProvider';

interface CommentFormWithDraftProps {
  threadId: string;
  parentId?: string;
  onSubmit: (values: Record<string, string>) => Promise<void>;
  onCancel?: () => void;
  placeholder?: string;
  submitText?: string;
}

export default function CommentFormWithDraft({
  threadId,
  parentId,
  onSubmit,
  onCancel,
  placeholder,
  submitText,
}: CommentFormWithDraftProps) {
  const { t } = useTranslations();
  
  // Unique draft key for this comment location
  const draftKey = parentId 
    ? `comment-reply-${threadId}-${parentId}` 
    : `comment-${threadId}`;
  
  const {
    content,
    setContent,
    hasDraft,
    lastSaved,
    isSaving,
    restore,
    clear,
    discard,
  } = useDraft({ key: draftKey });

  const [showRestoreBanner, setShowRestoreBanner] = useState(hasDraft);
  
  // Calculate draft age on initial render
  const [draftAge] = useState<number | undefined>(() => {
    if (hasDraft) {
      const draft = restore();
      if (draft?.updatedAt) {
        return Date.now() - draft.updatedAt;
      }
    }
    return undefined;
  });

  // Handle content change
  const handleChange = useCallback((field: string, value: string) => {
    if (field === 'content') {
      setContent(value);
    }
  }, [setContent]);

  // Restore draft
  const handleRestoreDraft = useCallback(() => {
    restore();
    setShowRestoreBanner(false);
  }, [restore]);

  // Discard draft
  const handleDiscardDraft = useCallback(() => {
    discard();
    setShowRestoreBanner(false);
  }, [discard]);

  // Handle submit
  const handleSubmit = async (values: Record<string, string>) => {
    await onSubmit(values);
    // Clear draft on successful submit
    clear();
  };

  // Handle cancel
  const handleCancel = () => {
    // Don't discard draft on cancel, just close
    onCancel?.();
  };

  return (
    <div>
      {/* Draft Restore Banner */}
      <DraftRestoreBanner
        show={showRestoreBanner}
        onRestore={handleRestoreDraft}
        onDiscard={handleDiscardDraft}
        draftAge={draftAge}
      />

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
            style={{
              background: 'var(--brand)',
              color: 'white',
            }}
          >
            ✍️
          </div>
          <h3
            className="font-bold text-lg"
            style={{ color: 'var(--foreground)' }}
          >
            {parentId ? t('threads.reply') : t('threads.addComment')}
          </h3>
        </div>
        <div className="flex items-center gap-3">
          {/* Draft Indicator */}
          <DraftIndicator
            hasDraft={hasDraft}
            lastSaved={lastSaved}
            isSaving={isSaving}
          />
          {onCancel && (
            <button
              onClick={handleCancel}
              className="hover:opacity-70 transition-opacity text-xl"
              style={{ color: 'var(--muted)' }}
              aria-label="Cancel"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <SimpleForm
        fields={[
          {
            name: 'content',
            label: t('threads.yourComment'),
            type: 'markdown',
            placeholder: placeholder || t('threads.commentPlaceholder'),
            required: true,
            maxLength: 10000,
          },
        ]}
        values={{ content }}
        onChange={handleChange}
        onSubmit={handleSubmit}
        submitText={submitText || t('threads.postComment')}
      />
    </div>
  );
}
