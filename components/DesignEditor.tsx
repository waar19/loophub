'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from '@/components/TranslationsProvider';
import { useToast } from '@/contexts/ToastContext';

interface DesignEditorProps {
  communitySlug: string;
  initialDesign?: {
    theme_color: string | null;
    accent_color: string | null;
    text_color: string | null;
    custom_css: string | null;
    banner_url: string | null;
    image_url: string | null;
  };
}

export default function DesignEditor({ communitySlug, initialDesign }: DesignEditorProps) {
  const { t } = useTranslations();
  const { showToast } = useToast();
  
  const [themeColor, setThemeColor] = useState(initialDesign?.theme_color || '#6366f1');
  const [accentColor, setAccentColor] = useState(initialDesign?.accent_color || '#8b5cf6');
  const [textColor, setTextColor] = useState(initialDesign?.text_color || '');
  const [bannerUrl, setBannerUrl] = useState(initialDesign?.banner_url || '');
  const [imageUrl, setImageUrl] = useState(initialDesign?.image_url || '');
  const [customCss, setCustomCss] = useState(initialDesign?.custom_css || '');
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const presetThemes = [
    { name: 'Indigo', theme: '#6366f1', accent: '#8b5cf6' },
    { name: 'Blue', theme: '#3b82f6', accent: '#60a5fa' },
    { name: 'Green', theme: '#22c55e', accent: '#4ade80' },
    { name: 'Red', theme: '#ef4444', accent: '#f87171' },
    { name: 'Orange', theme: '#f97316', accent: '#fb923c' },
    { name: 'Pink', theme: '#ec4899', accent: '#f472b6' },
    { name: 'Purple', theme: '#a855f7', accent: '#c084fc' },
    { name: 'Teal', theme: '#14b8a6', accent: '#2dd4bf' },
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/communities/${communitySlug}/design`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme_color: themeColor || null,
          accent_color: accentColor || null,
          text_color: textColor || null,
          banner_url: bannerUrl || null,
          image_url: imageUrl || null,
          custom_css: customCss || null,
        }),
      });

      if (res.ok) {
        showToast(t('common.saved'), 'success');
      } else {
        const data = await res.json();
        showToast(data.error || 'Error saving', 'error');
      }
    } catch (err) {
      showToast('Error saving', 'error');
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (preset: typeof presetThemes[0]) => {
    setThemeColor(preset.theme);
    setAccentColor(preset.accent);
  };

  return (
    <div className="design-editor">
      <h3>{t('communities.designSettings')}</h3>

      {/* Preview */}
      <div 
        className="design-preview"
        style={{
          '--preview-theme': themeColor,
          '--preview-accent': accentColor,
          '--preview-text': textColor || 'inherit',
        } as React.CSSProperties}
      >
        {bannerUrl && (
          <div 
            className="preview-banner"
            style={{ backgroundImage: `url(${bannerUrl})` }}
          />
        )}
        <div className="preview-content">
          <div className="preview-avatar" style={{ background: themeColor }}>
            {imageUrl ? (
              <img src={imageUrl} alt="Logo" />
            ) : (
              <span>C</span>
            )}
          </div>
          <div className="preview-info">
            <h4 style={{ color: textColor || 'var(--foreground)' }}>Community Name</h4>
            <button className="preview-btn" style={{ background: themeColor }}>
              {t('communities.join')}
            </button>
            <button className="preview-btn-secondary" style={{ borderColor: accentColor, color: accentColor }}>
              {t('common.settings')}
            </button>
          </div>
        </div>
      </div>

      {/* Preset Themes */}
      <div className="form-group">
        <label>{t('communities.presetThemes')}</label>
        <div className="preset-grid">
          {presetThemes.map((preset) => (
            <button
              key={preset.name}
              className={`preset-item ${themeColor === preset.theme ? 'active' : ''}`}
              onClick={() => applyPreset(preset)}
              style={{
                background: `linear-gradient(135deg, ${preset.theme} 50%, ${preset.accent} 50%)`,
              }}
              title={preset.name}
            />
          ))}
        </div>
      </div>

      {/* Color Pickers */}
      <div className="color-pickers">
        <div className="form-group">
          <label>{t('communities.themeColor')}</label>
          <div className="color-input-wrapper">
            <input
              type="color"
              value={themeColor}
              onChange={(e) => setThemeColor(e.target.value)}
              className="color-input"
            />
            <input
              type="text"
              value={themeColor}
              onChange={(e) => setThemeColor(e.target.value)}
              className="input color-text"
              placeholder="#6366f1"
            />
          </div>
        </div>

        <div className="form-group">
          <label>{t('communities.accentColor')}</label>
          <div className="color-input-wrapper">
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="color-input"
            />
            <input
              type="text"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="input color-text"
              placeholder="#8b5cf6"
            />
          </div>
        </div>
      </div>

      {/* Images */}
      <div className="form-group">
        <label>{t('communities.bannerUrl')}</label>
        <input
          type="url"
          className="input"
          value={bannerUrl}
          onChange={(e) => setBannerUrl(e.target.value)}
          placeholder="https://example.com/banner.jpg"
        />
        <span className="hint">{t('communities.bannerHint')}</span>
      </div>

      <div className="form-group">
        <label>{t('communities.logoUrl')}</label>
        <input
          type="url"
          className="input"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://example.com/logo.png"
        />
      </div>

      {/* Advanced Options */}
      <button 
        className="btn btn-link"
        onClick={() => setShowAdvanced(!showAdvanced)}
      >
        {showAdvanced ? '▼' : '▶'} {t('communities.advancedOptions')}
      </button>

      {showAdvanced && (
        <div className="advanced-options">
          <div className="form-group">
            <label>{t('communities.textColor')}</label>
            <div className="color-input-wrapper">
              <input
                type="color"
                value={textColor || '#000000'}
                onChange={(e) => setTextColor(e.target.value)}
                className="color-input"
              />
              <input
                type="text"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="input color-text"
                placeholder={t('communities.autoDetect')}
              />
            </div>
          </div>

          <div className="form-group">
            <label>{t('communities.customCss')}</label>
            <textarea
              className="input textarea code"
              value={customCss}
              onChange={(e) => setCustomCss(e.target.value)}
              rows={6}
              placeholder={`.community-page {\n  /* Your custom styles */\n}`}
            />
            <span className="hint">{t('communities.customCssHint')}</span>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="form-actions">
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? t('common.saving') : t('common.save')}
        </button>
      </div>

      <style jsx>{`
        .design-editor {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .design-editor h3 {
          margin: 0;
          font-size: 1.125rem;
        }

        .design-preview {
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
          background: var(--card-bg);
        }

        .preview-banner {
          height: 100px;
          background-size: cover;
          background-position: center;
          background-color: var(--preview-theme);
        }

        .preview-content {
          padding: 1rem;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .preview-avatar {
          width: 60px;
          height: 60px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.5rem;
          font-weight: bold;
          overflow: hidden;
          flex-shrink: 0;
          margin-top: -30px;
          border: 3px solid var(--card-bg);
        }

        .preview-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .preview-info {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.5rem;
        }

        .preview-info h4 {
          margin: 0;
          width: 100%;
        }

        .preview-btn {
          padding: 0.5rem 1rem;
          border-radius: 6px;
          border: none;
          color: white;
          font-size: 0.875rem;
          cursor: pointer;
        }

        .preview-btn-secondary {
          padding: 0.5rem 1rem;
          border-radius: 6px;
          border: 2px solid;
          background: transparent;
          font-size: 0.875rem;
          cursor: pointer;
        }

        .preset-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .preset-item {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          border: 2px solid transparent;
          cursor: pointer;
          transition: all 0.2s;
        }

        .preset-item:hover {
          transform: scale(1.1);
        }

        .preset-item.active {
          border-color: var(--foreground);
          box-shadow: 0 0 0 2px var(--background);
        }

        .color-pickers {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        @media (max-width: 500px) {
          .color-pickers {
            grid-template-columns: 1fr;
          }
        }

        .color-input-wrapper {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .color-input {
          width: 50px;
          height: 40px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          padding: 0;
        }

        .color-text {
          flex: 1;
          font-family: monospace;
        }

        .btn-link {
          background: none;
          border: none;
          color: var(--muted);
          cursor: pointer;
          padding: 0.5rem 0;
          font-size: 0.875rem;
          text-align: left;
        }

        .btn-link:hover {
          color: var(--foreground);
        }

        .advanced-options {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 1rem;
          background: var(--background);
          border-radius: 8px;
        }

        .textarea.code {
          font-family: monospace;
          font-size: 0.875rem;
        }

        .hint {
          font-size: 0.75rem;
          color: var(--muted);
          margin-top: 0.25rem;
        }

        .form-actions {
          padding-top: 1rem;
          border-top: 1px solid var(--border);
        }
      `}</style>
    </div>
  );
}
