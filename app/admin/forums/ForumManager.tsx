'use client';

import { useState, useTransition } from 'react';
import { useToast } from '@/contexts/ToastContext';

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

const FORUM_ICONS = ['📁', '💬', '🎮', '💻', '📱', '🎨', '📚', '🎵', '🎬', '⚽', '🍔', '✈️', '🔧', '💡', '🎯', '🌟'];
const FORUM_COLORS = [
  '#8B5CF6', // purple
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#EC4899', // pink
  '#6366F1', // indigo
  '#14B8A6', // teal
];

export default function ForumManager({ forums }: Props) {
  const [editingForum, setEditingForum] = useState<Forum | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    icon: '📁',
    color: '#8B5CF6',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      icon: '📁',
      color: '#8B5CF6',
    });
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
      description: forum.description || '',
      icon: forum.icon || '📁',
      color: forum.color || '#8B5CF6',
    });
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingForum(null);
    resetForm();
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.slug.trim()) {
      showToast('Nombre y slug son requeridos', 'error');
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
          throw new Error(error.error || 'Error al guardar foro');
        }

        showToast(
          editingForum ? 'Foro actualizado correctamente' : 'Foro creado correctamente',
          'success'
        );
        resetForm();
        window.location.reload();
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : 'Error al guardar foro',
          'error'
        );
      }
    });
  };

  const handleDelete = async (forum: Forum) => {
    if (forum.thread_count > 0) {
      showToast(
        `No puedes eliminar este foro porque tiene ${forum.thread_count} threads`,
        'error'
      );
      return;
    }

    if (!confirm(`¿Estás seguro de eliminar el foro "${forum.name}"?`)) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/forums/${forum.id}`, {
          method: 'DELETE',
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Error al eliminar foro');
        }

        showToast('Foro eliminado correctamente', 'success');
        window.location.reload();
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : 'Error al eliminar foro',
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
            {editingForum ? 'Editar Foro' : isCreating ? 'Nuevo Foro' : 'Gestionar Foros'}
          </h2>

          {(isCreating || editingForum) ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="input w-full"
                  placeholder="Nombre del foro"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Slug *</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))}
                  className="input w-full"
                  placeholder="slug-del-foro"
                />
                <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                  URL: /forum/{formData.slug || 'slug'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  className="input w-full"
                  rows={3}
                  placeholder="Descripción del foro..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Icono</label>
                <div className="flex flex-wrap gap-2">
                  {FORUM_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, icon }))}
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all"
                      style={{
                        background: formData.icon === icon ? 'var(--brand)' : 'var(--card-bg)',
                        border: `2px solid ${formData.icon === icon ? 'var(--brand)' : 'var(--border)'}`,
                      }}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {FORUM_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, color }))}
                      className="w-10 h-10 rounded-lg transition-all"
                      style={{
                        background: color,
                        border: `3px solid ${formData.color === color ? 'white' : 'transparent'}`,
                        boxShadow: formData.color === color ? '0 0 0 2px var(--brand)' : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSave}
                  disabled={isPending}
                  className="btn btn-primary flex-1"
                >
                  {isPending ? 'Guardando...' : editingForum ? 'Guardar Cambios' : 'Crear Foro'}
                </button>
                <button
                  onClick={resetForm}
                  className="btn"
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                Selecciona un foro para editar o crea uno nuevo
              </p>
              <button onClick={handleCreate} className="btn btn-primary">
                ➕ Crear Nuevo Foro
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Forums List */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <span>📁</span> Foros ({forums.length})
          </h2>
        </div>

        {forums.length === 0 ? (
          <div className="card p-6 text-center">
            <p style={{ color: 'var(--muted)' }}>No hay foros creados</p>
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
                  {forum.description && (
                    <p className="text-xs mt-1 truncate" style={{ color: 'var(--muted)' }}>
                      {forum.description}
                    </p>
                  )}
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
                    ✏️ Editar
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
                    title={forum.thread_count > 0 ? 'No puedes eliminar foros con threads' : 'Eliminar foro'}
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
