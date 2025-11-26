/**
 * KarmaProgress Component
 * Muestra el progreso de karma del usuario con desglose visual
 */

'use client';

import { useUserPermissions, getLevelColor, formatKarma } from '@/hooks/useGamification';
import { useTranslations } from '@/components/TranslationsProvider';

export default function KarmaProgress() {
  const { permissions, loading } = useUserPermissions();
  const { t } = useTranslations();

  // Calcular breakdown directamente sin useState
  const breakdown = permissions ? {
    threads: Math.floor(permissions.karma * 0.3),
    comments: Math.floor(permissions.karma * 0.15),
    likes: Math.floor(permissions.karma * 0.35),
    superlikes: Math.floor(permissions.karma * 0.1),
    resources: Math.floor(permissions.karma * 0.05),
    milestones: Math.floor(permissions.karma * 0.03),
    other: permissions.karma - Math.floor(permissions.karma * 0.98),
  } : null;

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 rounded w-1/2" style={{ background: 'var(--border)' }}></div>
        <div className="h-32 rounded" style={{ background: 'var(--border)' }}></div>
      </div>
    );
  }

  if (!permissions) {
    return null;
  }

  const levelColor = getLevelColor(permissions.level);
  const nextLevelName = permissions.level < 5 ? `${t('gamification.level')} ${permissions.level + 1}` : t('gamification.maxLevel');

  return (
    <div className="card space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{t('gamification.karmaProgress')}</h2>
        <div
          className="px-4 py-2 rounded-full text-white font-bold"
          style={{ backgroundColor: levelColor }}
        >
          {formatKarma(permissions.karma)} {t('profile.karma').toLowerCase()}
        </div>
      </div>

      {/* Nivel actual y progreso */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm" style={{ color: 'var(--muted)' }}>{t('gamification.currentLevel')}</div>
            <div className="text-xl font-bold" style={{ color: levelColor }}>
              {permissions.levelName}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm" style={{ color: 'var(--muted)' }}>{t('gamification.nextLevel')}</div>
            <div className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>{nextLevelName}</div>
          </div>
        </div>

        {/* Barra de progreso grande */}
        {permissions.level < 5 && (
          <div className="space-y-2">
            <div className="relative h-6 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
              <div
                className="absolute inset-y-0 left-0 transition-all duration-500 flex items-center justify-center text-white text-xs font-bold"
                style={{
                  width: `${permissions.progressToNextLevel}%`,
                  backgroundColor: levelColor,
                  minWidth: permissions.progressToNextLevel > 10 ? 'auto' : '40px',
                }}
              >
                {permissions.progressToNextLevel.toFixed(1)}%
              </div>
            </div>
            <div className="flex justify-between text-sm" style={{ color: 'var(--muted)' }}>
              <span>{formatKarma(permissions.karma)} {t('gamification.currentLevel').toLowerCase()}</span>
              <span className="font-semibold">
                {permissions.karmaToNextLevel} {t('gamification.karmaRemaining')}
              </span>
              <span>{formatKarma(permissions.karma + permissions.karmaToNextLevel)} necesario</span>
            </div>
          </div>
        )}
      </div>

      {/* Desglose de karma */}
      {breakdown && (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg" style={{ color: 'var(--foreground)' }}>{t('gamification.karmaBreakdown')}</h3>
          
          <div className="space-y-2">
            <KarmaSource
              label={t('gamification.threads')}
              value={breakdown.threads}
              color="#3B82F6"
              icon="📝"
            />
            <KarmaSource
              label={t('gamification.comments')}
              value={breakdown.comments}
              color="#10B981"
              icon="💬"
            />
            <KarmaSource
              label={t('gamification.likes')}
              value={breakdown.likes}
              color="#F59E0B"
              icon="❤️"
            />
            <KarmaSource
              label={t('gamification.superlikes')}
              value={breakdown.superlikes}
              color="#8B5CF6"
              icon="⭐"
            />
            <KarmaSource
              label={t('gamification.resources')}
              value={breakdown.resources}
              color="#06B6D4"
              icon="📚"
            />
            <KarmaSource
              label={t('gamification.milestones')}
              value={breakdown.milestones}
              color="#EC4899"
              icon="🏆"
            />
          </div>
        </div>
      )}

      {/* Tips para ganar karma */}
      <div className="p-4 rounded-lg" style={{ background: 'var(--accent-light)', borderColor: 'var(--accent)', border: '1px solid' }}>
        <h4 className="font-semibold mb-2" style={{ color: 'var(--brand)' }}>💡 {t('gamification.howToEarn')}</h4>
        <ul className="text-sm space-y-1" style={{ color: 'var(--foreground)' }}>
          <li>• {t('gamification.earnThreads')} ({t('gamification.earnThreadsDetail')})</li>
          <li>• {t('gamification.earnComments')} ({t('gamification.earnCommentsDetail')})</li>
          <li>• {t('gamification.earnLikes')} ({t('gamification.earnLikesDetail')})</li>
          {permissions.level >= 2 && <li>• Marca threads útiles como recursos (+10 karma al autor)</li>}
          {permissions.level >= 3 && <li>• Da superlikes a contenido excepcional (+2 karma al autor)</li>}
        </ul>
      </div>

      {/* Siguiente milestone */}
      {permissions.level < 5 && (
        <div className="p-4 rounded-lg" style={{ background: 'var(--card-bg)', borderColor: 'var(--brand)', border: '1px solid' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🎯</span>
            <h4 className="font-semibold" style={{ color: 'var(--brand)' }}>Próximo objetivo</h4>
          </div>
          <p className="text-sm" style={{ color: 'var(--foreground)' }}>
            {t('gamification.unlockFeatures')}: <strong>{formatKarma(permissions.karma + permissions.karmaToNextLevel)} karma</strong> para
            desbloquear el {t('gamification.level').toLowerCase()} <strong>{permissions.level + 1}</strong>.
          </p>
        </div>
      )}
    </div>
  );
}

interface KarmaSourceProps {
  label: string;
  value: number;
  color: string;
  icon: string;
}

function KarmaSource({ label, value, color, icon }: KarmaSourceProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xl">{icon}</span>
      <div className="flex-1">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{label}</span>
          <span className="text-sm font-bold" style={{ color }}>
            +{value}
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${Math.min(100, (value / 100) * 100)}%`,
              backgroundColor: color,
            }}
          />
        </div>
      </div>
    </div>
  );
}
