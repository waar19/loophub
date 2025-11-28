'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useTranslations } from '@/components/TranslationsProvider';

interface InviteData {
  id: string;
  code: string;
  community: {
    id: string;
    name: string;
    slug: string;
    description: string;
    avatar_url: string | null;
    visibility: string;
  };
}

interface InvitePageProps {
  params: Promise<{ code: string }>;
}

export default function InvitePage({ params }: InvitePageProps) {
  const { code } = use(params);
  const { t } = useTranslations();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const res = await fetch(`/api/communities/invite/${code}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Invalid invite');
        } else {
          setInvite(data.invite);
        }
      } catch (err) {
        setError('Failed to load invite');
      } finally {
        setLoading(false);
      }
    };

    fetchInvite();
  }, [code]);

  const handleJoin = async () => {
    if (!user) {
      // Redirect to login with return URL
      router.push(`/login?redirect=/invite/${code}`);
      return;
    }

    setJoining(true);
    setError(null);

    try {
      const res = await fetch(`/api/communities/invite/${code}`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'Already a member' && data.community?.slug) {
          router.push(`/c/${data.community.slug}`);
          return;
        }
        setError(data.error || 'Failed to join');
      } else {
        router.push(`/c/${data.community.slug}`);
      }
    } catch (err) {
      setError('Failed to join community');
    } finally {
      setJoining(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="invite-page">
        <div className="invite-card">
          <div className="loading-skeleton" style={{ height: '200px', borderRadius: '12px' }} />
        </div>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="invite-page">
        <div className="invite-card error-card">
          <div className="error-icon">⚠️</div>
          <h1>{t('communities.invalidInvite')}</h1>
          <p>{error}</p>
          <Link href="/communities" className="btn btn-primary">
            {t('communities.browseCommunities')}
          </Link>
        </div>

        <style jsx>{`
          .invite-page {
            min-height: 80vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
          }

          .invite-card {
            max-width: 450px;
            width: 100%;
            background: var(--bg-card);
            border-radius: 16px;
            padding: 2rem;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          }

          .error-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
          }

          .error-card h1 {
            margin-bottom: 0.5rem;
          }

          .error-card p {
            color: var(--text-secondary);
            margin-bottom: 1.5rem;
          }
        `}</style>
      </div>
    );
  }

  if (!invite) return null;

  const community = invite.community;

  return (
    <div className="invite-page">
      <div className="invite-card">
        <div className="invite-header">
          <p className="invite-label">{t('communities.youveBeenInvited')}</p>
        </div>

        <div className="community-preview">
          <img
            src={community.avatar_url || '/default-community.png'}
            alt={community.name}
            className="community-avatar"
          />
          <h1 className="community-name">{community.name}</h1>
          {community.description && (
            <p className="community-description">{community.description}</p>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="invite-actions">
          <button
            className="btn btn-primary btn-large"
            onClick={handleJoin}
            disabled={joining}
          >
            {joining ? t('common.loading') : user ? t('communities.acceptInvite') : t('communities.loginToJoin')}
          </button>
        </div>

        {user && (
          <p className="signed-in-as">
            {t('communities.signedInAs')} <strong>{user.email}</strong>
          </p>
        )}
      </div>

      <style jsx>{`
        .invite-page {
          min-height: 80vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
        }

        .invite-card {
          max-width: 450px;
          width: 100%;
          background: var(--bg-card);
          border-radius: 16px;
          padding: 2.5rem;
          text-align: center;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
        }

        .invite-header {
          margin-bottom: 1.5rem;
        }

        .invite-label {
          font-size: 0.9rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .community-preview {
          margin-bottom: 2rem;
        }

        .community-avatar {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          object-fit: cover;
          margin-bottom: 1rem;
          border: 4px solid var(--primary);
        }

        .community-name {
          font-size: 1.75rem;
          margin-bottom: 0.5rem;
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .community-description {
          color: var(--text-secondary);
          font-size: 0.95rem;
          line-height: 1.5;
        }

        .error-message {
          background: rgba(239, 68, 68, 0.1);
          color: var(--error);
          padding: 0.75rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          font-size: 0.9rem;
        }

        .invite-actions {
          margin-bottom: 1rem;
        }

        .btn-large {
          width: 100%;
          padding: 1rem;
          font-size: 1.1rem;
          font-weight: 600;
        }

        .signed-in-as {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .signed-in-as strong {
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
}
