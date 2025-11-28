'use client';

import { useState, useEffect, useTransition } from 'react';
import { votePoll, getPollResults, closePoll } from '@/lib/actions/polls';
import { useToast } from '@/contexts/ToastContext';
import { useTranslations } from '@/components/TranslationsProvider';

interface PollOption {
  id: string;
  option_text: string;
  vote_count: number;
  percentage: number;
}

interface PollDisplayProps {
  pollId: string;
  canClose?: boolean;
  className?: string;
}

export default function PollDisplay({ pollId, canClose = false, className = '' }: PollDisplayProps) {
  const [poll, setPoll] = useState<{
    id: string;
    question: string;
    pollType: 'single' | 'multiple';
    maxChoices: number;
    isClosed: boolean;
    closesAt: string | null;
    totalVotes: number;
    options: PollOption[];
    userVotes: string[];
    hasVoted: boolean;
    showResultsBeforeVote: boolean;
  } | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const { showSuccess, showError } = useToast();
  const { t } = useTranslations();

  // Cargar datos de la encuesta
  useEffect(() => {
    async function loadPoll() {
      const result = await getPollResults(pollId);
      if (result.success && result.data) {
        setPoll(result.data);
        setSelectedOptions(result.data.userVotes);
      }
      setLoading(false);
    }
    loadPoll();
  }, [pollId]);

  const handleOptionToggle = (optionId: string) => {
    if (poll?.isClosed || poll?.hasVoted) return;

    if (poll?.pollType === 'single') {
      setSelectedOptions([optionId]);
    } else {
      setSelectedOptions(prev => {
        if (prev.includes(optionId)) {
          return prev.filter(id => id !== optionId);
        }
        if (prev.length >= (poll?.maxChoices || 1)) {
          return prev;
        }
        return [...prev, optionId];
      });
    }
  };

  const handleVote = () => {
    if (selectedOptions.length === 0) {
      showError(t('polls.selectOption') || 'Selecciona una opción');
      return;
    }

    startTransition(async () => {
      const result = await votePoll(pollId, selectedOptions);
      if (result.success) {
        showSuccess(t('polls.voteRecorded') || '¡Voto registrado!');
        // Recargar resultados
        const pollResult = await getPollResults(pollId);
        if (pollResult.success && pollResult.data) {
          setPoll(pollResult.data);
        }
      } else {
        showError(result.error || t('polls.voteError'));
      }
    });
  };

  const handleClose = () => {
    startTransition(async () => {
      const result = await closePoll(pollId);
      if (result.success) {
        showSuccess(t('polls.pollClosed') || 'Encuesta cerrada');
        const pollResult = await getPollResults(pollId);
        if (pollResult.success && pollResult.data) {
          setPoll(pollResult.data);
        }
      } else {
        showError(result.error || t('polls.closeError'));
      }
    });
  };

  if (loading) {
    return (
      <div className={`card animate-pulse ${className}`}>
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!poll) {
    return null;
  }

  const showResults = poll.hasVoted || poll.isClosed || poll.showResultsBeforeVote;
  const canVote = !poll.hasVoted && !poll.isClosed;
  const timeLeft = poll.closesAt ? getTimeLeft(poll.closesAt) : null;

  return (
    <div className={`card border-l-4 border-l-[var(--brand)] ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📊</span>
          <h3 className="font-semibold text-lg" style={{ color: 'var(--foreground)' }}>
            {poll.question}
          </h3>
        </div>
        {poll.isClosed && (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
            {t('polls.closed') || 'Cerrada'}
          </span>
        )}
      </div>

      {/* Poll Type Info */}
      <div className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-4">
        <span>
          {poll.pollType === 'single' 
            ? (t('polls.singleChoice') || 'Elige una opción')
            : (t('polls.multipleChoice') || `Elige hasta ${poll.maxChoices} opciones`)
          }
        </span>
        <span>•</span>
        <span>{poll.totalVotes} {poll.totalVotes === 1 ? 'voto' : 'votos'}</span>
        {timeLeft && !poll.isClosed && (
          <>
            <span>•</span>
            <span className="text-amber-600 dark:text-amber-400">⏱️ {timeLeft}</span>
          </>
        )}
      </div>

      {/* Options */}
      <div className="space-y-3">
        {poll.options.map(option => {
          const isSelected = selectedOptions.includes(option.id);
          const isUserVote = poll.userVotes.includes(option.id);

          return (
            <div
              key={option.id}
              onClick={() => canVote && handleOptionToggle(option.id)}
              className={`
                relative rounded-lg border-2 overflow-hidden transition-all
                ${canVote ? 'cursor-pointer hover:border-[var(--brand)]' : ''}
                ${isSelected ? 'border-[var(--brand)] bg-[var(--brand)]/5' : 'border-gray-200 dark:border-gray-700'}
              `}
            >
              {/* Progress Bar (when showing results) */}
              {showResults && (
                <div
                  className="absolute inset-0 bg-[var(--brand)]/10 transition-all duration-500"
                  style={{ width: `${option.percentage}%` }}
                />
              )}

              <div className="relative flex items-center justify-between p-3 gap-3">
                <div className="flex items-center gap-3">
                  {/* Checkbox/Radio */}
                  {canVote && (
                    <div className={`
                      w-5 h-5 flex items-center justify-center rounded-${poll.pollType === 'single' ? 'full' : 'md'}
                      border-2 transition-colors
                      ${isSelected 
                        ? 'border-[var(--brand)] bg-[var(--brand)]' 
                        : 'border-gray-300 dark:border-gray-600'
                      }
                    `}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  )}

                  {/* User vote indicator */}
                  {showResults && isUserVote && (
                    <span className="text-[var(--brand)]">✓</span>
                  )}

                  {/* Option Text */}
                  <span className="font-medium" style={{ color: 'var(--foreground)' }}>
                    {option.option_text}
                  </span>
                </div>

                {/* Results */}
                {showResults && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-bold" style={{ color: 'var(--foreground)' }}>
                      {option.percentage}%
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      ({option.vote_count})
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        {canVote ? (
          <button
            onClick={handleVote}
            disabled={isPending || selectedOptions.length === 0}
            className="btn-primary"
          >
            {isPending ? (t('common.loading') || 'Votando...') : (t('polls.vote') || 'Votar')}
          </button>
        ) : poll.hasVoted ? (
          <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
            ✓ {t('polls.youVoted') || 'Ya votaste'}
          </span>
        ) : (
          <span></span>
        )}

        {canClose && !poll.isClosed && (
          <button
            onClick={handleClose}
            disabled={isPending}
            className="btn-secondary text-sm"
          >
            {t('polls.closePoll') || 'Cerrar encuesta'}
          </button>
        )}
      </div>
    </div>
  );
}

// Helper para calcular tiempo restante
function getTimeLeft(closesAt: string): string {
  const now = new Date();
  const closes = new Date(closesAt);
  const diff = closes.getTime() - now.getTime();

  if (diff <= 0) return 'Expirada';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
