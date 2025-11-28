'use client';

import { useState, useEffect, useTransition } from 'react';
import { useTranslations } from '@/components/TranslationsProvider';
import { useToast } from '@/contexts/ToastContext';
import MotionWrapper from './MotionWrapper';

interface PollOption {
  option_id: string;
  option_text: string;
  vote_count: number;
  percentage: number;
}

interface PollData {
  id: string;
  question: string;
  pollType: string;
  allowMultiple: boolean;
  maxChoices: number;
  isClosed: boolean;
  closesAt: string | null;
  showResultsBeforeVote: boolean;
}

interface PollProps {
  pollId: string;
  onVote?: () => void;
}

export default function Poll({ pollId, onVote }: PollProps) {
  const { t } = useTranslations();
  const { showSuccess, showError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [poll, setPoll] = useState<PollData | null>(null);
  const [options, setOptions] = useState<PollOption[]>([]);
  const [totalVoters, setTotalVoters] = useState(0);
  const [userVoted, setUserVoted] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isExpired = poll?.closesAt ? new Date(poll.closesAt) <= new Date() : false;
  const isEnded = poll?.isClosed || isExpired;

  const fetchPollResults = async () => {
    try {
      const res = await fetch(`/api/polls/${pollId}`);
      const data = await res.json();

      if (!res.ok) {
        console.error('Error fetching poll:', data.error);
        return;
      }

      setPoll(data.poll);
      setOptions(data.options || []);
      setTotalVoters(data.totalVoters || 0);
      setUserVoted(data.hasVoted || false);
    } catch (error) {
      console.error('Error fetching poll:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPollResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollId]);

  const handleOptionToggle = (optionId: string) => {
    if (userVoted || isEnded) return;

    if (poll?.allowMultiple) {
      setSelectedOptions(prev =>
        prev.includes(optionId)
          ? prev.filter(id => id !== optionId)
          : prev.length < (poll.maxChoices || 1) 
            ? [...prev, optionId]
            : prev
      );
    } else {
      setSelectedOptions([optionId]);
    }
  };

  const handleVote = () => {
    if (selectedOptions.length === 0) {
      showError(t('polls.selectOption'));
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/polls/${pollId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ optionIds: selectedOptions }),
        });

        const data = await res.json();

        if (data.success) {
          showSuccess(t('polls.voteRecorded'));
          setUserVoted(true);
          fetchPollResults();
          onVote?.();
        } else {
          showError(data.error || t('polls.voteError'));
        }
      } catch (error) {
        console.error('Error voting:', error);
        showError(t('polls.voteError'));
      }
    });
  };

  if (isLoading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!poll) return null;

  const showResults = userVoted || isEnded || poll.showResultsBeforeVote;

  return (
    <MotionWrapper>
      <div
        className="card p-6"
        style={{
          borderLeft: '4px solid var(--brand)',
          background: 'linear-gradient(135deg, var(--card-bg) 0%, rgba(59, 130, 246, 0.05) 100%)',
        }}
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <span className="text-2xl">📊</span>
          <div className="flex-1">
            <h3 className="font-semibold text-lg" style={{ color: 'var(--foreground)' }}>
              {poll.question}
            </h3>
            <div className="flex items-center gap-3 mt-1 text-sm flex-wrap" style={{ color: 'var(--muted)' }}>
              <span>
                {totalVoters} {totalVoters === 1 ? t('polls.vote') : t('polls.votes')}
              </span>
              {poll.allowMultiple && (
                <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs">
                  {t('polls.multipleChoice')} ({poll.maxChoices})
                </span>
              )}
              {poll.closesAt && !isEnded && (
                <span className="px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 text-xs">
                  ⏰ {new Date(poll.closesAt).toLocaleDateString()}
                </span>
              )}
              {isEnded && (
                <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs">
                  {t('polls.ended')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {options.map(option => (
            <button
              key={option.option_id}
              onClick={() => handleOptionToggle(option.option_id)}
              disabled={showResults || isPending}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all relative overflow-hidden ${
                selectedOptions.includes(option.option_id)
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
              } ${showResults ? 'cursor-default' : 'cursor-pointer'}`}
              style={{
                background: showResults
                  ? `linear-gradient(to right, rgba(59, 130, 246, 0.15) ${option.percentage}%, transparent ${option.percentage}%)`
                  : undefined,
              }}
            >
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  {!showResults && (
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        selectedOptions.includes(option.option_id)
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-400 dark:border-gray-500'
                      }`}
                    >
                      {selectedOptions.includes(option.option_id) && (
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
                  <span className="font-medium" style={{ color: 'var(--foreground)' }}>
                    {option.option_text}
                  </span>
                </div>
                {showResults && (
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {option.percentage}%
                    </span>
                    <span className="text-sm" style={{ color: 'var(--muted)' }}>
                      ({option.vote_count})
                    </span>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Vote Button */}
        {!showResults && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleVote}
              disabled={isPending || selectedOptions.length === 0}
              className="btn btn-primary flex items-center gap-2"
            >
              {isPending ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {t('common.loading')}
                </>
              ) : (
                <>
                  🗳️ {t('polls.submitVote')}
                </>
              )}
            </button>
          </div>
        )}

        {/* Already voted message */}
        {userVoted && !isEnded && (
          <p className="mt-4 text-center text-sm" style={{ color: 'var(--muted)' }}>
            ✅ {t('polls.alreadyVoted')}
          </p>
        )}
      </div>
    </MotionWrapper>
  );
}
