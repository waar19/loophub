'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from '@/components/TranslationsProvider';

interface Invite {
  id: string;
  code: string;
  max_uses: number | null;
  uses: number;
  expires_at: string | null;
  created_at: string;
  creator: {
    username: string;
  } | null;
}

interface InviteManagerProps {
  communitySlug: string;
}

export default function InviteManager({ communitySlug }: InviteManagerProps) {
  const { t } = useTranslations();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [maxUses, setMaxUses] = useState<string>('');
  const [expiresIn, setExpiresIn] = useState<string>('24'); // hours

  const fetchInvites = async () => {
    try {
      const res = await fetch(`/api/communities/${communitySlug}/invite`);
      const data = await res.json();

      if (res.ok) {
        setInvites(data.invites || []);
      }
    } catch (error) {
      console.error('Error fetching invites:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvites();
  }, [communitySlug]);

  const createInvite = async () => {
    setCreating(true);
    try {
      const res = await fetch(`/api/communities/${communitySlug}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxUses: maxUses ? parseInt(maxUses) : null,
          expiresIn: expiresIn ? parseInt(expiresIn) : null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setInvites(prev => [data.invite, ...prev]);
        setShowCreateForm(false);
        setMaxUses('');
        setExpiresIn('24');
      }
    } catch (error) {
      console.error('Error creating invite:', error);
    } finally {
      setCreating(false);
    }
  };

  const deleteInvite = async (inviteId: string) => {
    try {
      const res = await fetch(`/api/communities/${communitySlug}/invite?id=${inviteId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setInvites(prev => prev.filter(i => i.id !== inviteId));
      }
    } catch (error) {
      console.error('Error deleting invite:', error);
    }
  };

  const copyInviteLink = (code: string, id: string) => {
    const link = `${window.location.origin}/invite/${code}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <div className="card">
        <div className="loading-skeleton" style={{ height: '150px' }} />
      </div>
    );
  }

  return (
    <div className="card">
      <div className="invite-header">
        <h3 className="card-title">{t('communities.inviteLinks')}</h3>
        {!showCreateForm && (
          <button
            className="btn btn-primary btn-small"
            onClick={() => setShowCreateForm(true)}
          >
            {t('communities.createInvite')}
          </button>
        )}
      </div>

      {showCreateForm && (
        <div className="create-form">
          <div className="form-row">
            <div className="form-group">
              <label>{t('communities.maxUses')}</label>
              <input
                type="number"
                className="input"
                placeholder={t('communities.unlimited')}
                value={maxUses}
                onChange={e => setMaxUses(e.target.value)}
                min="1"
              />
            </div>
            <div className="form-group">
              <label>{t('communities.expiresIn')}</label>
              <select
                className="input"
                value={expiresIn}
                onChange={e => setExpiresIn(e.target.value)}
              >
                <option value="">{t('communities.never')}</option>
                <option value="1">1 {t('communities.hour')}</option>
                <option value="6">6 {t('communities.hours')}</option>
                <option value="24">24 {t('communities.hours')}</option>
                <option value="168">7 {t('communities.days')}</option>
                <option value="720">30 {t('communities.days')}</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button
              className="btn btn-secondary"
              onClick={() => setShowCreateForm(false)}
              disabled={creating}
            >
              {t('common.cancel')}
            </button>
            <button
              className="btn btn-primary"
              onClick={createInvite}
              disabled={creating}
            >
              {creating ? t('common.loading') : t('communities.createInvite')}
            </button>
          </div>
        </div>
      )}

      {invites.length === 0 ? (
        <p className="text-secondary" style={{ marginTop: '1rem' }}>
          {t('communities.noInvites')}
        </p>
      ) : (
        <div className="invites-list">
          {invites.map(invite => (
            <div
              key={invite.id}
              className={`invite-item ${isExpired(invite.expires_at) ? 'expired' : ''}`}
            >
              <div className="invite-info">
                <code className="invite-code">{invite.code}</code>
                <div className="invite-meta">
                  <span>
                    {invite.uses}
                    {invite.max_uses ? `/${invite.max_uses}` : ''} {t('communities.uses')}
                  </span>
                  {invite.expires_at && (
                    <span>
                      {isExpired(invite.expires_at)
                        ? t('communities.expired')
                        : `${t('communities.expires')} ${formatDate(invite.expires_at)}`}
                    </span>
                  )}
                </div>
              </div>
              <div className="invite-actions">
                <button
                  className="btn btn-secondary btn-small"
                  onClick={() => copyInviteLink(invite.code, invite.id)}
                  disabled={isExpired(invite.expires_at)}
                >
                  {copiedId === invite.id ? t('communities.copied') : t('communities.copy')}
                </button>
                <button
                  className="btn btn-danger btn-small"
                  onClick={() => deleteInvite(invite.id)}
                >
                  {t('communities.revoke')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .invite-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .create-form {
          background: var(--bg-secondary);
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
        }

        .invites-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-top: 1rem;
        }

        .invite-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: var(--bg-secondary);
          border-radius: 8px;
        }

        .invite-item.expired {
          opacity: 0.6;
        }

        .invite-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .invite-code {
          font-family: monospace;
          background: var(--bg-tertiary);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.9rem;
        }

        .invite-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .invite-actions {
          display: flex;
          gap: 0.5rem;
        }

        .btn-small {
          padding: 0.35rem 0.6rem;
          font-size: 0.8rem;
        }

        .btn-danger {
          background: var(--error);
          color: white;
        }

        .btn-danger:hover {
          background: #dc2626;
        }

        @media (max-width: 640px) {
          .form-row {
            grid-template-columns: 1fr;
          }

          .invite-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }

          .invite-actions {
            width: 100%;
          }

          .invite-actions .btn {
            flex: 1;
          }
        }
      `}</style>
    </div>
  );
}
