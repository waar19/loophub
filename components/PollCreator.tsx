'use client';

import { useState, useTransition } from 'react';
import { createPoll } from '@/lib/actions/polls';
import { useToast } from '@/contexts/ToastContext';
import { useTranslations } from '@/components/TranslationsProvider';

interface PollCreatorProps {
  threadId: string;
  onCreated?: () => void;
  onCancel?: () => void;
}

export default function PollCreator({ threadId, onCreated, onCancel }: PollCreatorProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [pollType, setPollType] = useState<'single' | 'multiple'>('single');
  const [maxChoices, setMaxChoices] = useState(2);
  const [closesIn, setClosesIn] = useState<string>(''); // '1h', '1d', '3d', '7d', 'never'
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [minLevel, setMinLevel] = useState(0);
  const [showResultsBeforeVote, setShowResultsBeforeVote] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { showSuccess, showError } = useToast();
  const { t } = useTranslations();

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const getClosesAt = (): string | undefined => {
    if (!closesIn || closesIn === 'never') return undefined;
    
    const now = new Date();
    switch (closesIn) {
      case '1h':
        now.setHours(now.getHours() + 1);
        break;
      case '1d':
        now.setDate(now.getDate() + 1);
        break;
      case '3d':
        now.setDate(now.getDate() + 3);
        break;
      case '7d':
        now.setDate(now.getDate() + 7);
        break;
      default:
        return undefined;
    }
    return now.toISOString();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validOptions = options.filter(opt => opt.trim().length > 0);
    
    if (!question.trim()) {
      showError(t('polls.questionRequired') || 'Escribe una pregunta');
      return;
    }
    
    if (validOptions.length < 2) {
      showError(t('polls.minOptions') || 'Necesitas al menos 2 opciones');
      return;
    }

    startTransition(async () => {
      const result = await createPoll({
        threadId,
        question: question.trim(),
        options: validOptions,
        pollType,
        maxChoices: pollType === 'multiple' ? maxChoices : 1,
        closesAt: getClosesAt(),
        minLevelToVote: minLevel,
        showResultsBeforeVote,
      });

      if (result.success) {
        showSuccess(t('polls.pollCreated') || '¡Encuesta creada!');
        onCreated?.();
      } else {
        showError(result.error || t('polls.createError'));
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="card border-l-4 border-l-[var(--brand)]">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">📊</span>
        <h3 className="font-semibold text-lg" style={{ color: 'var(--foreground)' }}>
          {t('polls.createPoll') || 'Crear Encuesta'}
        </h3>
      </div>

      {/* Question */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
          {t('polls.question') || 'Pregunta'}
        </label>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t('polls.questionPlaceholder') || '¿Cuál es tu opción favorita?'}
          className="input w-full"
          maxLength={200}
          required
        />
      </div>

      {/* Options */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
          {t('polls.options') || 'Opciones'}
        </label>
        <div className="space-y-2">
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-sm text-gray-500 w-6">{index + 1}.</span>
              <input
                type="text"
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
                placeholder={`${t('polls.option') || 'Opción'} ${index + 1}`}
                className="input flex-1"
                maxLength={100}
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeOption(index)}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        {options.length < 10 && (
          <button
            type="button"
            onClick={addOption}
            className="mt-2 text-sm text-[var(--brand)] hover:underline"
          >
            + {t('polls.addOption') || 'Añadir opción'}
          </button>
        )}
      </div>

      {/* Poll Type */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
          {t('polls.type') || 'Tipo de encuesta'}
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="pollType"
              value="single"
              checked={pollType === 'single'}
              onChange={() => setPollType('single')}
              className="accent-[var(--brand)]"
            />
            <span className="text-sm">{t('polls.singleChoice') || 'Una opción'}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="pollType"
              value="multiple"
              checked={pollType === 'multiple'}
              onChange={() => setPollType('multiple')}
              className="accent-[var(--brand)]"
            />
            <span className="text-sm">{t('polls.multipleChoice') || 'Múltiples opciones'}</span>
          </label>
        </div>
      </div>

      {/* Max Choices (for multiple) */}
      {pollType === 'multiple' && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
            {t('polls.maxChoices') || 'Máximo de opciones a elegir'}
          </label>
          <select
            value={maxChoices}
            onChange={(e) => setMaxChoices(Number(e.target.value))}
            className="input"
          >
            {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      )}

      {/* Duration */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
          {t('polls.duration') || 'Duración'}
        </label>
        <select
          value={closesIn}
          onChange={(e) => setClosesIn(e.target.value)}
          className="input"
        >
          <option value="never">{t('polls.noLimit') || 'Sin límite'}</option>
          <option value="1h">1 {t('common.hour') || 'hora'}</option>
          <option value="1d">1 {t('common.day') || 'día'}</option>
          <option value="3d">3 {t('common.days') || 'días'}</option>
          <option value="7d">7 {t('common.days') || 'días'}</option>
        </select>
      </div>

      {/* Advanced Options Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-sm text-gray-500 hover:text-[var(--brand)] mb-4 flex items-center gap-1"
      >
        {showAdvanced ? '▼' : '▶'} {t('polls.advancedOptions') || 'Opciones avanzadas'}
      </button>

      {/* Advanced Options */}
      {showAdvanced && (
        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg mb-4">
          {/* Minimum Level */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
              {t('polls.minLevel') || 'Nivel mínimo para votar'}
            </label>
            <select
              value={minLevel}
              onChange={(e) => setMinLevel(Number(e.target.value))}
              className="input"
            >
              <option value={0}>{t('polls.anyLevel') || 'Cualquier nivel'}</option>
              <option value={1}>Nivel 1+</option>
              <option value={2}>Nivel 2+</option>
              <option value={3}>Nivel 3+</option>
            </select>
          </div>

          {/* Show Results Before Vote */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showResultsBeforeVote}
              onChange={(e) => setShowResultsBeforeVote(e.target.checked)}
              className="accent-[var(--brand)]"
            />
            <span className="text-sm">{t('polls.showResultsBeforeVote') || 'Mostrar resultados antes de votar'}</span>
          </label>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
            disabled={isPending}
          >
            {t('common.cancel') || 'Cancelar'}
          </button>
        )}
        <button
          type="submit"
          className="btn-primary"
          disabled={isPending}
        >
          {isPending 
            ? (t('common.creating') || 'Creando...') 
            : (t('polls.createPoll') || 'Crear Encuesta')
          }
        </button>
      </div>
    </form>
  );
}
