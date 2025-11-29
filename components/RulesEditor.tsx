'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from '@/components/TranslationsProvider';
import { useToast } from '@/contexts/ToastContext';

interface Rule {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
}

interface RulesEditorProps {
  communitySlug: string;
}

export default function RulesEditor({ communitySlug }: RulesEditorProps) {
  const { t } = useTranslations();
  const { showToast } = useToast();
  
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchRules();
  }, [communitySlug]);

  const fetchRules = async () => {
    try {
      const res = await fetch(`/api/communities/${communitySlug}/rules`);
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules || []);
      }
    } catch (err) {
      console.error('Error fetching rules:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = async () => {
    if (!newTitle.trim()) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/communities/${communitySlug}/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim() || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setRules([...rules, data.rule]);
        setNewTitle('');
        setNewDescription('');
        showToast(t('communities.ruleAdded'), 'success');
      } else {
        const data = await res.json();
        showToast(data.error || 'Error', 'error');
      }
    } catch (err) {
      showToast('Error adding rule', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRule = async (rule: Rule) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/communities/${communitySlug}/rules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: rules.map(r => 
          r.id === rule.id ? rule : r
        )}),
      });

      if (res.ok) {
        setEditingId(null);
        showToast(t('common.saved'), 'success');
      }
    } catch (err) {
      showToast('Error updating rule', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm(t('communities.confirmDeleteRule'))) return;

    try {
      const res = await fetch(`/api/communities/${communitySlug}/rules?ruleId=${ruleId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setRules(rules.filter(r => r.id !== ruleId));
        showToast(t('communities.ruleDeleted'), 'success');
      }
    } catch (err) {
      showToast('Error deleting rule', 'error');
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newRules = [...rules];
    const draggedRule = newRules[draggedIndex];
    newRules.splice(draggedIndex, 1);
    newRules.splice(index, 0, draggedRule);
    setRules(newRules);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    setDraggedIndex(null);
    // Save new order
    try {
      await fetch(`/api/communities/${communitySlug}/rules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules }),
      });
    } catch (err) {
      console.error('Error saving order:', err);
    }
  };

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>;
  }

  return (
    <div className="rules-editor">
      <h3>{t('communities.communityRules')}</h3>
      <p className="description">{t('communities.rulesDescription')}</p>

      {/* Existing Rules */}
      <div className="rules-list">
        {rules.map((rule, index) => (
          <div
            key={rule.id}
            className={`rule-item ${draggedIndex === index ? 'dragging' : ''}`}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
          >
            <div className="rule-handle">⠿</div>
            <div className="rule-number">{index + 1}</div>
            
            {editingId === rule.id ? (
              <div className="rule-edit">
                <input
                  type="text"
                  className="input"
                  value={rule.title}
                  onChange={(e) => setRules(rules.map(r =>
                    r.id === rule.id ? { ...r, title: e.target.value } : r
                  ))}
                  placeholder={t('communities.ruleTitle')}
                />
                <textarea
                  className="input textarea"
                  value={rule.description || ''}
                  onChange={(e) => setRules(rules.map(r =>
                    r.id === rule.id ? { ...r, description: e.target.value } : r
                  ))}
                  placeholder={t('communities.ruleDescription')}
                  rows={2}
                />
                <div className="rule-edit-actions">
                  <button
                    className="btn btn-primary btn-small"
                    onClick={() => handleUpdateRule(rule)}
                    disabled={saving}
                  >
                    {t('common.save')}
                  </button>
                  <button
                    className="btn btn-secondary btn-small"
                    onClick={() => setEditingId(null)}
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rule-content">
                <div className="rule-title">{rule.title}</div>
                {rule.description && (
                  <div className="rule-description">{rule.description}</div>
                )}
              </div>
            )}

            <div className="rule-actions">
              {editingId !== rule.id && (
                <>
                  <button
                    className="btn-icon"
                    onClick={() => setEditingId(rule.id)}
                    title={t('common.edit')}
                  >
                    ✏️
                  </button>
                  <button
                    className="btn-icon danger"
                    onClick={() => handleDeleteRule(rule.id)}
                    title={t('common.delete')}
                  >
                    🗑️
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {rules.length === 0 && (
          <div className="empty-state">
            <p>{t('communities.noRulesYet')}</p>
          </div>
        )}
      </div>

      {/* Add New Rule */}
      <div className="add-rule">
        <h4>{t('communities.addRule')}</h4>
        <div className="form-group">
          <input
            type="text"
            className="input"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={t('communities.ruleTitle')}
            maxLength={100}
          />
        </div>
        <div className="form-group">
          <textarea
            className="input textarea"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder={t('communities.ruleDescriptionOptional')}
            rows={2}
          />
        </div>
        <button
          className="btn btn-primary"
          onClick={handleAddRule}
          disabled={!newTitle.trim() || saving}
        >
          {saving ? t('common.saving') : t('communities.addRule')}
        </button>
      </div>

      <style jsx>{`
        .rules-editor {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .rules-editor h3 {
          margin: 0;
          font-size: 1.125rem;
        }

        .description {
          color: var(--muted);
          font-size: 0.875rem;
          margin: 0;
        }

        .rules-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .rule-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem;
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: 8px;
          cursor: grab;
          transition: all 0.2s;
        }

        .rule-item:hover {
          border-color: var(--brand);
        }

        .rule-item.dragging {
          opacity: 0.5;
          border-style: dashed;
        }

        .rule-handle {
          color: var(--muted);
          cursor: grab;
          user-select: none;
        }

        .rule-number {
          width: 24px;
          height: 24px;
          background: var(--brand);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: bold;
          flex-shrink: 0;
        }

        .rule-content {
          flex: 1;
          min-width: 0;
        }

        .rule-title {
          font-weight: 500;
          color: var(--foreground);
        }

        .rule-description {
          font-size: 0.875rem;
          color: var(--muted);
          margin-top: 0.25rem;
        }

        .rule-edit {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .rule-edit-actions {
          display: flex;
          gap: 0.5rem;
        }

        .rule-actions {
          display: flex;
          gap: 0.25rem;
          flex-shrink: 0;
        }

        .btn-icon {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.25rem;
          font-size: 1rem;
          opacity: 0.6;
          transition: opacity 0.2s;
        }

        .btn-icon:hover {
          opacity: 1;
        }

        .btn-icon.danger:hover {
          filter: brightness(1.2);
        }

        .empty-state {
          text-align: center;
          padding: 2rem;
          color: var(--muted);
        }

        .add-rule {
          padding: 1rem;
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .add-rule h4 {
          margin: 0;
          font-size: 1rem;
        }

        .textarea {
          resize: vertical;
          min-height: 60px;
        }
      `}</style>
    </div>
  );
}
