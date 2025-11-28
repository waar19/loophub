'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from '@/components/TranslationsProvider';

interface JoinRequest {
  id: string;
  message: string | null;
  created_at: string;
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
    karma: number;
    level: number;
  };
}

interface JoinRequestsProps {
  communitySlug: string;
}

export default function JoinRequests({ communitySlug }: JoinRequestsProps) {
  const { t } = useTranslations();
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      const res = await fetch(`/api/communities/${communitySlug}/requests`);
      const data = await res.json();

      if (res.ok) {
        setRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [communitySlug]);

  const handleAction = async (requestId: string, action: 'approve' | 'reject') => {
    setActionLoading(requestId);
    try {
      const res = await fetch(`/api/communities/${communitySlug}/requests`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action }),
      });

      if (res.ok) {
        setRequests(prev => prev.filter(r => r.id !== requestId));
      }
    } catch (error) {
      console.error('Error processing request:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="card">
        <div className="loading-skeleton" style={{ height: '150px' }} />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="card">
        <h3 className="card-title">{t('communities.joinRequests')}</h3>
        <p className="text-secondary" style={{ marginTop: '0.5rem' }}>
          {t('communities.noRequests')}
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="card-title" style={{ marginBottom: '1rem' }}>
        {t('communities.joinRequests')} ({requests.length})
      </h3>

      <div className="requests-list">
        {requests.map(request => (
          <div key={request.id} className="request-item">
            <div className="request-header">
              <Link href={`/u/${request.user.username}`} className="request-user">
                <img
                  src={request.user.avatar_url || '/default-avatar.png'}
                  alt={request.user.username}
                  className="request-avatar"
                />
                <div className="request-user-info">
                  <span className="request-username">{request.user.username}</span>
                  <span className="request-meta">
                    Level {request.user.level} · {request.user.karma} karma · {formatDate(request.created_at)}
                  </span>
                </div>
              </Link>
            </div>

            {request.message && (
              <p className="request-message">{request.message}</p>
            )}

            <div className="request-actions">
              <button
                className="btn btn-primary btn-small"
                onClick={() => handleAction(request.id, 'approve')}
                disabled={actionLoading === request.id}
              >
                {t('communities.approve')}
              </button>
              <button
                className="btn btn-secondary btn-small"
                onClick={() => handleAction(request.id, 'reject')}
                disabled={actionLoading === request.id}
              >
                {t('communities.reject')}
              </button>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .requests-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .request-item {
          padding: 1rem;
          border-radius: 8px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
        }

        .request-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .request-user {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          text-decoration: none;
          color: inherit;
        }

        .request-user:hover .request-username {
          color: var(--primary);
        }

        .request-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          object-fit: cover;
        }

        .request-user-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .request-username {
          font-weight: 600;
          transition: color 0.2s;
        }

        .request-meta {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .request-message {
          margin: 0.75rem 0;
          padding: 0.75rem;
          background: var(--bg-tertiary);
          border-radius: 6px;
          font-size: 0.9rem;
          color: var(--text-secondary);
          font-style: italic;
        }

        .request-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.75rem;
        }

        .btn-small {
          padding: 0.4rem 0.8rem;
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
}
