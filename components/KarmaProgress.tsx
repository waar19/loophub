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
    <div className="card space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 
            className="text-lg sm:text-xl lg:text-2xl font-bold"
            style={{ 
              background: `linear-gradient(135deg, var(--foreground) 0%, ${levelColor} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            {t('gamification.karmaProgress')}
          </h2>
          <div
            className="px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5"
            style={{ 
              background: `linear-gradient(135deg, ${levelColor} 0%, ${levelColor}dd 100%)`,
              color: 'white',
              boxShadow: `0 2px 8px ${levelColor}40`
            }}
          >
            <span>⭐</span>
            {formatKarma(permissions.karma)}
          </div>
        </div>
      </div>

      {/* Nivel actual y progreso */}
      <div className="space-y-3">
        <div className="flex justify-between items-center gap-2">
          <div>
            <div className="text-xs sm:text-sm" style={{ color: 'var(--muted)' }}>{t('gamification.currentLevel')}</div>
            <div className="text-base sm:text-lg lg:text-xl font-bold" style={{ color: levelColor }}>
              {permissions.levelName}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs sm:text-sm" style={{ color: 'var(--muted)' }}>{t('gamification.nextLevel')}</div>
            <div className="text-base sm:text-lg lg:text-xl font-bold" style={{ color: 'var(--foreground)' }}>{nextLevelName}</div>
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
            <div className="flex flex-wrap justify-between gap-2 text-xs sm:text-sm" style={{ color: 'var(--muted)' }}>
              <span className="whitespace-nowrap">{formatKarma(permissions.karma)} actual</span>
              <span className="font-semibold whitespace-nowrap">
                {permissions.karmaToNextLevel} {t('gamification.karmaRemaining')}
              </span>
              <span className="hidden sm:inline whitespace-nowrap">{formatKarma(permissions.karma + permissions.karmaToNextLevel)} necesario</span>
            </div>
          </div>
        )}
      </div>

      {/* Desglose de karma */}
      {breakdown && (
        <div className="space-y-3">
          <h3 className="font-semibold text-base sm:text-lg" style={{ color: 'var(--foreground)' }}>{t('gamification.karmaBreakdown')}</h3>
          
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
      <div 
        className="p-3 sm:p-4 rounded-xl"
        style={{ 
          background: 'linear-gradient(135deg, var(--accent-light) 0%, transparent 100%)',
          borderColor: 'var(--accent)',
          borderWidth: '1px',
          borderStyle: 'solid'
        }}
      >
        <h4 className="font-semibold mb-2 text-sm sm:text-base flex items-center gap-2" style={{ color: 'var(--brand)' }}>
          💡 {t('gamification.howToEarn')}
        </h4>
        <ul className="text-xs sm:text-sm space-y-1.5" style={{ color: 'var(--foreground)' }}>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 font-bold">•</span>
            <span>{t('gamification.earnThreads')} <strong className="text-blue-500">({t('gamification.earnThreadsDetail')})</strong></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 font-bold">•</span>
            <span>{t('gamification.earnComments')} <strong className="text-green-500">({t('gamification.earnCommentsDetail')})</strong></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-orange-500 font-bold">•</span>
            <span>{t('gamification.earnLikes')} <strong className="text-orange-500">({t('gamification.earnLikesDetail')})</strong></span>
          </li>
          {permissions.level >= 2 && (
            <li className="flex items-start gap-2">
              <span className="text-cyan-500 font-bold">•</span>
              <span>Marca threads útiles como recursos <strong className="text-cyan-500">(+10 karma)</strong></span>
            </li>
          )}
          {permissions.level >= 3 && (
            <li className="flex items-start gap-2">
              <span className="text-purple-500 font-bold">•</span>
              <span>Da superlikes a contenido excepcional <strong className="text-purple-500">(+2 karma)</strong></span>
            </li>
          )}
        </ul>
      </div>

      {/* Siguiente milestone */}
      {permissions.level < 5 && (
        <div 
          className="p-3 sm:p-4 rounded-xl relative overflow-hidden"
          style={{ 
            background: `linear-gradient(135deg, ${levelColor}15 0%, ${levelColor}05 100%)`,
            borderColor: levelColor,
            borderWidth: '2px',
            borderStyle: 'solid'
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl sm:text-2xl">🎯</span>
            <h4 className="font-semibold text-sm sm:text-base" style={{ color: levelColor }}>{t('gamification.nextGoal')}</h4>
          </div>
          <p className="text-xs sm:text-sm" style={{ color: 'var(--foreground)' }}>
            <strong style={{ color: levelColor }}>{formatKarma(permissions.karma + permissions.karmaToNextLevel)}</strong> {t('profile.karma').toLowerCase()} para
            desbloquear <strong>{permissions.levelName.replace('Nivel', t('gamification.level'))} {permissions.level + 1}</strong>
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
