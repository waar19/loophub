'use client';

import { useState, useTransition } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { useTranslations } from '@/components/TranslationsProvider';

interface Forum {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  created_at: string;
  thread_count: number;
}

interface Props {
  forums: Forum[];
}

export default function ForumManager({ forums }: Props) {
  const [editingForum, setEditingForum] = useState<Forum | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();
  const { t } = useTranslations();

  // Form state - only name and slug (table doesn't have other columns)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
  });

  const resetForm = () => {
    setFormData({ name: '', slug: '' });
    setEditingForum(null);
    setIsCreating(false);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: editingForum ? prev.slug : generateSlug(name),
    }));
  };

  const handleEdit = (forum: Forum) => {
    setEditingForum(forum);
    setIsCreating(false);
    setFormData({
      name: forum.name,
      slug: forum.slug,
    });
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingForum(null);
    setFormData({ name: '', slug: '' });
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.slug.trim()) {
      showToast(t('admin.forumName') + ' ' + t('admin.forumSlug') + ' ' + t('common.error'), 'error');
      return;
    }

    startTransition(async () => {
      try {
        const endpoint = editingForum 
          ? `/api/admin/forums/${editingForum.id}`
          : '/api/admin/forums';
        
        const res = await fetch(endpoint, {
          method: editingForum ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || t('admin.errorCreatingForum'));
        }

        showToast(
          editingForum ? t('admin.forumUpdated') : t('admin.forumCreated'),
          'success'
        );
        resetForm();
        window.location.reload();
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : t('admin.errorCreatingForum'),
          'error'
        );
      }
    });
  };

  const handleDelete = async (forum: Forum) => {
    if (forum.thread_count > 0) {
      showToast(
        t('admin.cannotDeleteForumWithThreads'),
        'error'
      );
      return;
    }

    if (!confirm(t('admin.deleteForumConfirm'))) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/forums/${forum.id}`, {
          method: 'DELETE',
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || t('admin.errorDeletingForum'));
        }

        showToast(t('admin.forumDeleted'), 'success');
        window.location.reload();
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : t('admin.errorDeletingForum'),
          'error'
        );
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Form Panel */}
      <div className="lg:col-span-1">
        <div className="card p-6 sticky top-4">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <span>{editingForum ? '✏️' : '➕'}</span>
            {editingForum ? t('admin.editForum') : isCreating ? t('admin.createNewForum') : t('admin.manageForums')}
          </h2>

          {(isCreating || editingForum) ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('admin.forumName')} *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="input w-full"
                  placeholder={t('admin.forumNamePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t('admin.forumSlug')} *</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))}
                  className="input w-full"
                  placeholder={t('admin.forumSlugPlaceholder')}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                  URL: /forum/{formData.slug || 'slug'}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSave}
                  disabled={isPending}
                  className="btn btn-primary flex-1"
                >
                  {isPending ? t('common.saving') : editingForum ? t('admin.updateForum') : t('admin.createForum')}
                </button>
                <button
                  onClick={resetForm}
                  className="btn"
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                {t('admin.selectForumOrCreate')}
              </p>
              <button onClick={handleCreate} className="btn btn-primary">
                ➕ {t('admin.createNewForum')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Forums List */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <span>📁</span> {t('forums.forums')} ({forums.length})
          </h2>
        </div>

        {forums.length === 0 ? (
          <div className="card p-6 text-center">
            <p style={{ color: 'var(--muted)' }}>{t('common.noForumsAvailable')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {forums.map((forum) => (
              <div
                key={forum.id}
                className="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow"
              >
                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl shrink-0"
                  style={{ background: forum.color || 'var(--brand)' }}
                >
                  {forum.icon || '📁'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{forum.name}</h3>
                  <p className="text-sm truncate" style={{ color: 'var(--muted)' }}>
                    /forum/{forum.slug}
                  </p>
                </div>

                {/* Stats */}
                <div className="text-center shrink-0">
                  <p className="font-bold">{forum.thread_count}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>threads</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleEdit(forum)}
                    className="btn text-sm"
                    style={{
                      background: 'var(--brand)',
                      color: 'white',
                      padding: '0.5rem 1rem',
                    }}
                  >
                    ✏️ {t('common.edit')}
                  </button>
                  <button
                    onClick={() => handleDelete(forum)}
                    disabled={forum.thread_count > 0 || isPending}
                    className="btn text-sm"
                    style={{
                      background: forum.thread_count > 0 ? 'var(--muted)' : 'rgba(239, 68, 68, 0.1)',
                      color: forum.thread_count > 0 ? 'var(--card-bg)' : '#ef4444',
                      padding: '0.5rem 1rem',
                      cursor: forum.thread_count > 0 ? 'not-allowed' : 'pointer',
                    }}
                    title={forum.thread_count > 0 ? t('admin.cannotDeleteForumWithThreads') : t('admin.deleteForum')}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
