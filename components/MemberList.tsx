'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useTranslations } from '@/components/TranslationsProvider';

interface Member {
  id: string;
  role: 'owner' | 'moderator' | 'member';
  joined_at: string;
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
    karma: number;
    level: number;
  };
}

interface MemberListProps {
  communitySlug: string;
  currentUserRole?: 'owner' | 'moderator' | 'member' | null;
}

export default function MemberList({ communitySlug, currentUserRole }: MemberListProps) {
  const { t } = useTranslations();
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'moderator';
  const isOwner = currentUserRole === 'owner';

  const fetchMembers = async (pageNum: number, append = false) => {
    try {
      const res = await fetch(`/api/communities/${communitySlug}/members?page=${pageNum}`);
      const data = await res.json();

      if (res.ok) {
        if (append) {
          setMembers(prev => [...prev, ...data.members]);
        } else {
          setMembers(data.members || []);
        }
        setHasMore(data.members?.length === 10);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers(1);
  }, [communitySlug]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchMembers(nextPage, true);
  };

  const handleRoleChange = async (memberId: string, newRole: 'moderator' | 'member') => {
    setActionLoading(memberId);
    try {
      const res = await fetch(`/api/communities/${communitySlug}/members`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, role: newRole }),
      });

      if (res.ok) {
        setMembers(prev =>
          prev.map(m => (m.id === memberId ? { ...m, role: newRole } : m))
        );
      }
    } catch (error) {
      console.error('Error changing role:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleKick = async (memberId: string, username: string) => {
    if (!confirm(t('communities.confirmKick', { username }))) return;

    setActionLoading(memberId);
    try {
      const res = await fetch(`/api/communities/${communitySlug}/members?memberId=${memberId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setMembers(prev => prev.filter(m => m.id !== memberId));
      }
    } catch (error) {
      console.error('Error kicking member:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'owner':
        return 'badge-gold';
      case 'moderator':
        return 'badge-purple';
      default:
        return 'badge-gray';
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="loading-skeleton" style={{ height: '200px' }} />
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="card-title" style={{ marginBottom: '1rem' }}>
        {t('communities.members')} ({members.length})
      </h3>

      <div className="member-list">
        {members.map(member => (
          <div key={member.id} className="member-item">
            <Link href={`/u/${member.user.username}`} className="member-info">
              <img
                src={member.user.avatar_url || '/default-avatar.png'}
                alt={member.user.username}
                className="member-avatar"
              />
              <div className="member-details">
                <span className="member-username">{member.user.username}</span>
                <span className={`role-badge ${getRoleBadgeClass(member.role)}`}>
                  {t(`communities.role.${member.role}`)}
                </span>
              </div>
            </Link>

            {canManageMembers && member.role !== 'owner' && member.user.id !== user?.id && (
              <div className="member-actions">
                {isOwner && (
                  <button
                    className="btn btn-small btn-secondary"
                    onClick={() =>
                      handleRoleChange(
                        member.id,
                        member.role === 'moderator' ? 'member' : 'moderator'
                      )
                    }
                    disabled={actionLoading === member.id}
                  >
                    {member.role === 'moderator'
                      ? t('communities.demote')
                      : t('communities.promote')}
                  </button>
                )}
                <button
                  className="btn btn-small btn-danger"
                  onClick={() => handleKick(member.id, member.user.username)}
                  disabled={actionLoading === member.id}
                >
                  {t('communities.kick')}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {hasMore && (
        <button className="btn btn-secondary btn-full" onClick={loadMore} style={{ marginTop: '1rem' }}>
          {t('common.loadMore')}
        </button>
      )}

      <style jsx>{`
        .member-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .member-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.5rem;
          border-radius: 8px;
          background: var(--bg-secondary);
        }

        .member-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          text-decoration: none;
          color: inherit;
        }

        .member-info:hover .member-username {
          color: var(--primary);
        }

        .member-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
        }

        .member-details {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .member-username {
          font-weight: 500;
          transition: color 0.2s;
        }

        .role-badge {
          font-size: 0.7rem;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          font-weight: 500;
          width: fit-content;
        }

        .badge-gold {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
        }

        .badge-purple {
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
        }

        .badge-gray {
          background: var(--bg-tertiary);
          color: var(--text-secondary);
        }

        .member-actions {
          display: flex;
          gap: 0.5rem;
        }

        .btn-small {
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
        }

        .btn-danger {
          background: var(--error);
          color: white;
        }

        .btn-danger:hover {
          background: #dc2626;
        }

        @media (max-width: 640px) {
          .member-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .member-actions {
            width: 100%;
            justify-content: flex-end;
          }
        }
      `}</style>
    </div>
  );
}
