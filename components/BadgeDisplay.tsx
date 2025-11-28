'use client';

import { useState } from 'react';

interface Badge {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  category: string;
}

interface UserBadge {
  id: string;
  earned_at: string;
  badge: Badge;
}

interface BadgeDisplayProps {
  badges: UserBadge[];
  allBadges?: Badge[];
  showAll?: boolean;
  size?: 'sm' | 'md' | 'lg';
  maxDisplay?: number;
}

export default function BadgeDisplay({
  badges,
  allBadges,
  showAll = false,
  size = 'md',
  maxDisplay = 5,
}: BadgeDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const sizeClasses = {
    sm: 'w-6 h-6 text-sm',
    md: 'w-8 h-8 text-lg',
    lg: 'w-12 h-12 text-2xl',
  };

  const earnedSlugs = new Set(badges.map((b) => b.badge.slug));
  const displayBadges = isExpanded ? badges : badges.slice(0, maxDisplay);
  const hasMore = badges.length > maxDisplay;

  if (showAll && allBadges) {
    // Show all badges with earned/unearned state
    const groupedBadges = allBadges.reduce((acc, badge) => {
      const category = badge.category;
      if (!acc[category]) acc[category] = [];
      acc[category].push(badge);
      return acc;
    }, {} as Record<string, Badge[]>);

    const categoryLabels: Record<string, string> = {
      milestone: '🎯 Milestones',
      achievement: '🏆 Achievements',
      special: '⭐ Special',
    };

    return (
      <div className="space-y-6">
        {Object.entries(groupedBadges).map(([category, categoryBadges]) => (
          <div key={category}>
            <h4 className="text-sm font-bold mb-3" style={{ color: 'var(--muted)' }}>
              {categoryLabels[category] || category}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {categoryBadges.map((badge) => {
                const isEarned = earnedSlugs.has(badge.slug);
                const earnedBadge = badges.find((b) => b.badge.slug === badge.slug);

                return (
                  <div
                    key={badge.id}
                    className={`p-3 rounded-lg border transition-all ${
                      isEarned
                        ? 'border-transparent'
                        : 'border-dashed opacity-50 grayscale'
                    }`}
                    style={{
                      background: isEarned ? `${badge.color}15` : 'var(--hover-bg)',
                      borderColor: isEarned ? badge.color : 'var(--border)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{badge.icon}</span>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-sm truncate">{badge.name}</h5>
                        {isEarned && earnedBadge && (
                          <p className="text-xs" style={{ color: 'var(--muted)' }}>
                            {new Date(earnedBadge.earned_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      {badge.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Compact badge display
  if (badges.length === 0) {
    return (
      <p className="text-sm" style={{ color: 'var(--muted)' }}>
        No badges earned yet
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {displayBadges.map((userBadge) => (
        <BadgeIcon key={userBadge.id} badge={userBadge.badge} size={size} />
      ))}
      {hasMore && !isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className={`${sizeClasses[size]} flex items-center justify-center rounded-full font-medium`}
          style={{
            background: 'var(--hover-bg)',
            color: 'var(--muted)',
          }}
        >
          +{badges.length - maxDisplay}
        </button>
      )}
    </div>
  );
}

function BadgeIcon({ badge, size }: { badge: Badge; size: 'sm' | 'md' | 'lg' }) {
  const [showTooltip, setShowTooltip] = useState(false);

  const sizeClasses = {
    sm: 'w-6 h-6 text-sm',
    md: 'w-8 h-8 text-lg',
    lg: 'w-12 h-12 text-2xl',
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className={`${sizeClasses[size]} flex items-center justify-center rounded-full cursor-help transition-transform hover:scale-110`}
        style={{ background: `${badge.color}30` }}
        title={badge.name}
      >
        {badge.icon}
      </div>
      
      {showTooltip && (
        <div
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 rounded-lg shadow-lg z-50 whitespace-nowrap"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{badge.icon}</span>
            <div>
              <p className="font-medium text-sm">{badge.name}</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                {badge.description}
              </p>
            </div>
          </div>
          <div
            className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 rotate-45"
            style={{
              background: 'var(--card-bg)',
              borderRight: '1px solid var(--border)',
              borderBottom: '1px solid var(--border)',
              marginTop: '-4px',
            }}
          />
        </div>
      )}
    </div>
  );
}

// Badge notification popup for newly earned badges
export function BadgeNotification({
  badges,
  onClose,
}: {
  badges: { badge_name: string; badge_slug: string }[];
  onClose: () => void;
}) {
  if (badges.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div
        className="card max-w-md w-full text-center animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold mb-2">
          {badges.length === 1 ? 'Badge Earned!' : `${badges.length} Badges Earned!`}
        </h2>
        <div className="space-y-2 mb-4">
          {badges.map((badge, i) => (
            <div
              key={i}
              className="p-3 rounded-lg"
              style={{ background: 'var(--hover-bg)' }}
            >
              <span className="font-medium">{badge.badge_name}</span>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="btn btn-primary w-full">
          Awesome! 🚀
        </button>
      </div>
    </div>
  );
}
