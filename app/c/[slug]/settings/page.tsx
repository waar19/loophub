'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useTranslations } from '@/components/TranslationsProvider';
import MemberList from '@/components/MemberList';
import JoinRequests from '@/components/JoinRequests';
import InviteManager from '@/components/InviteManager';

interface Community {
  id: string;
  name: string;
  slug: string;
  description: string;
  avatar_url: string | null;
  banner_url: string | null;
  visibility: 'public' | 'private' | 'invite_only';
  rules: string | null;
  max_members: number | null;
  category: string | null;
}

interface CommunitySettingsPageProps {
  params: Promise<{ slug: string }>;
}

type Tab = 'general' | 'members' | 'requests' | 'invites';

export default function CommunitySettingsPage({ params }: CommunitySettingsPageProps) {
  const { slug } = use(params);
  const { t } = useTranslations();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [community, setCommunity] = useState<Community | null>(null);
  const [userRole, setUserRole] = useState<'owner' | 'moderator' | 'member' | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private' | 'invite_only'>('public');
  const [maxMembers, setMaxMembers] = useState('');

  useEffect(() => {
    const fetchCommunity = async () => {
      try {
        const res = await fetch(`/api/communities/${slug}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Failed to load community');
          return;
        }

        setCommunity(data.community);
        setUserRole(data.membership?.role || null);

        // Populate form
        setName(data.community.name);
        setDescription(data.community.description || '');
        setRules(data.community.rules || '');
        setVisibility(data.community.visibility);
        setMaxMembers(data.community.max_members?.toString() || '');
      } catch (err) {
        setError('Failed to load community');
      } finally {
        setLoading(false);
      }
    };

    fetchCommunity();
  }, [slug]);

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const res = await fetch(`/api/communities/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          rules,
          visibility,
          maxMembers: maxMembers ? parseInt(maxMembers) : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to save');
        return;
      }

      setSuccess(t('common.saved'));
      setCommunity(data.community);

      // If slug changed, redirect
      if (data.community.slug !== slug) {
        router.push(`/c/${data.community.slug}/settings`);
      }
    } catch (err) {
      setError('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('communities.confirmDelete'))) return;

    try {
      const res = await fetch(`/api/communities/${slug}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        router.push('/communities');
      }
    } catch (err) {
      setError('Failed to delete');
    }
  };

  if (loading || authLoading) {
    return (
      <div className="settings-page">
        <div className="loading-skeleton" style={{ height: '400px' }} />
      </div>
    );
  }

  if (!community) {
    return (
      <div className="settings-page">
        <div className="card error-card">
          <h2>{t('communities.notFound')}</h2>
          <Link href="/communities" className="btn btn-primary">
            {t('communities.browseCommunities')}
          </Link>
        </div>
      </div>
    );
  }

  if (!userRole || !['owner', 'moderator'].includes(userRole)) {
    return (
      <div className="settings-page">
        <div className="card error-card">
          <h2>{t('common.accessDenied')}</h2>
          <p>{t('common.noPermission')}</p>
          <Link href={`/c/${slug}`} className="btn btn-primary">
            {t('common.goBack')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <Link href={`/c/${slug}`} className="back-link">
          ← {community.name}
        </Link>
        <h1>{t('common.settings')}</h1>
      </div>

      <div className="settings-tabs">
        <button
          className={`tab ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          {t('common.general')}
        </button>
        <button
          className={`tab ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          {t('communities.members')}
        </button>
        {community.visibility === 'private' && (
          <button
            className={`tab ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            {t('communities.joinRequests')}
          </button>
        )}
        {community.visibility === 'invite_only' && (
          <button
            className={`tab ${activeTab === 'invites' ? 'active' : ''}`}
            onClick={() => setActiveTab('invites')}
          >
            {t('communities.inviteLinks')}
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="settings-content">
        {activeTab === 'general' && (
          <div className="card">
            <div className="form-group">
              <label>{t('communities.name')}</label>
              <input
                type="text"
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={userRole !== 'owner'}
              />
            </div>

            <div className="form-group">
              <label>{t('communities.description')}</label>
              <textarea
                className="input textarea"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>{t('communities.rules')}</label>
              <textarea
                className="input textarea"
                value={rules}
                onChange={e => setRules(e.target.value)}
                rows={5}
                placeholder={t('communities.rulesPlaceholder')}
              />
            </div>

            {userRole === 'owner' && (
              <>
                <div className="form-group">
                  <label>{t('communities.visibility')}</label>
                  <select
                    className="input"
                    value={visibility}
                    onChange={e => setVisibility(e.target.value as 'public' | 'private' | 'invite_only')}
                  >
                    <option value="public">{t('communities.public')}</option>
                    <option value="private">{t('communities.private')}</option>
                    <option value="invite_only">{t('communities.inviteOnly')}</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>{t('communities.memberLimit')}</label>
                  <input
                    type="number"
                    className="input"
                    value={maxMembers}
                    onChange={e => setMaxMembers(e.target.value)}
                    placeholder={t('communities.memberLimitPlaceholder')}
                    min="1"
                  />
                  <span className="hint">{t('communities.memberLimitHint')}</span>
                </div>
              </>
            )}

            <div className="form-actions">
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>

            {userRole === 'owner' && (
              <div className="danger-zone">
                <h3>{t('common.dangerZone')}</h3>
                <p>{t('common.deleteWarning')}</p>
                <button className="btn btn-danger" onClick={handleDelete}>
                  {t('common.delete')}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'members' && (
          <MemberList communitySlug={slug} currentUserRole={userRole} />
        )}

        {activeTab === 'requests' && community.visibility === 'private' && (
          <JoinRequests communitySlug={slug} />
        )}

        {activeTab === 'invites' && community.visibility === 'invite_only' && (
          <InviteManager communitySlug={slug} />
        )}
      </div>

      <style jsx>{`
        .settings-page {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }

        .settings-header {
          margin-bottom: 2rem;
        }

        .back-link {
          font-size: 0.9rem;
          color: var(--text-secondary);
          text-decoration: none;
          display: inline-block;
          margin-bottom: 0.5rem;
        }

        .back-link:hover {
          color: var(--primary);
        }

        .settings-header h1 {
          font-size: 1.75rem;
        }

        .settings-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          overflow-x: auto;
          padding-bottom: 0.5rem;
        }

        .tab {
          padding: 0.5rem 1rem;
          border: none;
          background: var(--bg-secondary);
          color: var(--text-secondary);
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.9rem;
          white-space: nowrap;
          transition: all 0.2s;
        }

        .tab:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .tab.active {
          background: var(--primary);
          color: white;
        }

        .error-message {
          background: rgba(239, 68, 68, 0.1);
          color: var(--error);
          padding: 0.75rem 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
        }

        .success-message {
          background: rgba(34, 197, 94, 0.1);
          color: var(--success);
          padding: 0.75rem 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
        }

        .form-group {
          margin-bottom: 1.25rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }

        .textarea {
          resize: vertical;
          min-height: 100px;
        }

        .hint {
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin-top: 0.25rem;
          display: block;
        }

        .form-actions {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--border-color);
        }

        .danger-zone {
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--error);
        }

        .danger-zone h3 {
          color: var(--error);
          margin-bottom: 0.5rem;
        }

        .danger-zone p {
          color: var(--text-secondary);
          margin-bottom: 1rem;
          font-size: 0.9rem;
        }

        .btn-danger {
          background: var(--error);
          color: white;
        }

        .btn-danger:hover {
          background: #dc2626;
        }

        .error-card {
          text-align: center;
          padding: 3rem;
        }

        .error-card h2 {
          margin-bottom: 1rem;
        }

        .error-card p {
          color: var(--text-secondary);
          margin-bottom: 1.5rem;
        }

        @media (max-width: 640px) {
          .settings-page {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
