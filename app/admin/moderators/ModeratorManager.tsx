'use client';

import { useState, useTransition } from 'react';
import { addForumModerator, removeForumModerator } from '@/lib/actions/moderation';
import { useToast } from '@/contexts/ToastContext';
import { useTranslations } from '@/components/TranslationsProvider';

interface Forum {
  id: string;
  name: string;
  slug: string;
}

interface User {
  id: string;
  username: string;
  avatar_url: string | null;
  is_admin: boolean;
}

interface Moderator {
  id: string;
  forum_id: string;
  user_id: string;
  permissions: Record<string, boolean>;
  created_at: string;
  forum: { name: string; slug: string } | null;
  profile: { username: string; avatar_url: string | null } | null;
  appointed_by_profile: { username: string } | null;
}

interface Props {
  forums: Forum[];
  moderators: Moderator[];
  users: User[];
}

const PERMISSION_LABELS: Record<string, string> = {
  can_delete_threads: '🗑️ Eliminar threads',
  can_delete_comments: '💬 Eliminar comentarios',
  can_hide_content: '🙈 Ocultar contenido',
  can_pin_threads: '📌 Anclar threads',
  can_lock_threads: '🔒 Bloquear threads',
  can_manage_reports: '🚨 Gestionar reportes',
};

export default function ModeratorManager({ forums, moderators, users }: Props) {
  const [selectedForum, setSelectedForum] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [permissions, setPermissions] = useState<Record<string, boolean>>({
    can_delete_threads: true,
    can_delete_comments: true,
    can_hide_content: true,
    can_pin_threads: true,
    can_lock_threads: true,
    can_manage_reports: true,
  });
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();
  const { t } = useTranslations();

  const handleAdd = () => {
    if (!selectedForum || !selectedUser) {
      showToast(t('admin.selectForum') + ' / ' + t('admin.selectUser'), 'error');
      return;
    }

    startTransition(async () => {
      const result = await addForumModerator(selectedForum, selectedUser, permissions);
      if (result.success) {
        showToast(t('admin.moderatorAdded'), 'success');
        setSelectedUser('');
        // Force page refresh to show new moderator
        window.location.reload();
      } else {
        showToast(result.error || t('common.error'), 'error');
      }
    });
  };

  const handleRemove = (forumId: string, userId: string) => {
    if (!confirm(t('admin.removeModerator') + '?')) return;

    startTransition(async () => {
      const result = await removeForumModerator(forumId, userId);
      if (result.success) {
        showToast(t('admin.moderatorRemoved'), 'success');
        window.location.reload();
      } else {
        showToast(result.error || t('common.error'), 'error');
      }
    });
  };

  // Filter users who are not already moderators of the selected forum
  const availableUsers = users.filter((user) => {
    if (!selectedForum) return true;
    return !moderators.some(
      (mod) => mod.forum_id === selectedForum && mod.user_id === user.id
    );
  });

  // Group moderators by forum
  const moderatorsByForum = forums.map((forum) => ({
    forum,
    mods: moderators.filter((mod) => mod.forum_id === forum.id),
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Add Moderator Form */}
      <div className="lg:col-span-1">
        <div className="card p-6 sticky top-4">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <span>➕</span> {t('admin.addModerator')}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('admin.selectForum')}</label>
              <select
                value={selectedForum}
                onChange={(e) => setSelectedForum(e.target.value)}
                className="input w-full"
              >
                <option value="">{t('admin.selectForum')}...</option>
                {forums.map((forum) => (
                  <option key={forum.id} value={forum.id}>
                    {forum.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{t('admin.selectUser')}</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="input w-full"
              >
                <option value="">{t('admin.selectUser')}...</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username} {user.is_admin && '(Admin)'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Permisos</label>
              <div className="space-y-2">
                {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={permissions[key] || false}
                      onChange={(e) =>
                        setPermissions((p) => ({ ...p, [key]: e.target.checked }))
                      }
                      className="rounded"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handleAdd}
              disabled={isPending || !selectedForum || !selectedUser}
              className="btn btn-primary w-full"
            >
              {isPending ? t('common.loading') : t('admin.addModerator')}
            </button>
          </div>
        </div>
      </div>

      {/* Moderators List */}
      <div className="lg:col-span-2 space-y-6">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <span>🛡️</span> {t('admin.moderators')}
        </h2>

        {moderatorsByForum.map(({ forum, mods }) => (
          <div key={forum.id} className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <span className="text-xl">📁</span>
                {forum.name}
              </h3>
              <span
                className="text-xs px-2 py-1 rounded-full"
                style={{ background: 'var(--primary)', color: 'white' }}
              >
                {mods.length} {mods.length !== 1 ? t('admin.moderators').toLowerCase() : t('admin.forumModerator').toLowerCase()}
              </span>
            </div>

            {mods.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                {t('admin.noModerators')}
              </p>
            ) : (
              <div className="space-y-3">
                {mods.map((mod) => (
                  <div
                    key={mod.id}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: 'var(--background)' }}
                  >
                    <div className="flex items-center gap-3">
                      {mod.profile?.avatar_url ? (
                        <img
                          src={mod.profile.avatar_url}
                          alt={mod.profile.username}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                          style={{ background: 'var(--primary)' }}
                        >
                          {mod.profile?.username?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{mod.profile?.username || 'Unknown'}</p>
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>
                          Asignado por {mod.appointed_by_profile?.username || 'Sistema'} •{' '}
                          {new Date(mod.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(mod.permissions || {})
                          .filter(([, value]) => value)
                          .slice(0, 3)
                          .map(([key]) => (
                            <span
                              key={key}
                              className="text-xs px-1.5 py-0.5 rounded"
                              style={{ background: 'var(--card-bg)' }}
                              title={PERMISSION_LABELS[key]}
                            >
                              {PERMISSION_LABELS[key]?.split(' ')[0]}
                            </span>
                          ))}
                        {Object.values(mod.permissions || {}).filter(Boolean).length > 3 && (
                          <span className="text-xs" style={{ color: 'var(--muted)' }}>
                            +{Object.values(mod.permissions || {}).filter(Boolean).length - 3}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemove(mod.forum_id, mod.user_id)}
                        disabled={isPending}
                        className="btn btn-sm"
                        style={{ background: '#ef4444', color: 'white' }}
                        title="Remover moderador"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {forums.length === 0 && (
          <div className="card text-center py-8">
            <p style={{ color: 'var(--muted)' }}>{t('common.noForumsAvailable')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
