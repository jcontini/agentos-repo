/**
 * Settings Panel Component
 * 
 * Dynamically renders settings controls based on schema metadata.
 * Fetches settings for a category and renders appropriate controls per type.
 * 
 * @example
 * ```yaml
 * - component: settings-panel
 *   props:
 *     category: features  # features, privacy, paths, handlers, security, advanced
 * ```
 */

import React, { useState, useEffect, useCallback } from 'react';

// =============================================================================
// Types
// =============================================================================

interface SettingMeta {
  key: string;
  value: unknown;
  type: 'bool' | 'string' | 'number' | 'string_list' | 'string_map' | 'url_handlers' | 'file_handlers';
  label: string;
  description?: string;
  preview?: string;
}

interface CategoryData {
  id: string;
  label: string;
  description: string;
  settings: SettingMeta[];
}

interface SettingsPanelProps {
  /** Category to display (features, privacy, paths, handlers, security, advanced) */
  category: string;
  /** Additional CSS class */
  className?: string;
}

// =============================================================================
// API Helpers
// =============================================================================

async function fetchSettings(category: string): Promise<CategoryData> {
  const response = await fetch(`/api/settings?category=${category}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch settings: ${response.statusText}`);
  }
  
  return response.json();
}

async function updateSetting(key: string, value: unknown): Promise<void> {
  const response = await fetch('/api/tools/call', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tool: 'Settings',
      arguments: { action: 'set', key, value }
    })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update setting: ${response.statusText}`);
  }
}

// =============================================================================
// Setting Controls
// =============================================================================

interface SettingControlProps {
  setting: SettingMeta;
  onUpdate: (key: string, value: unknown) => void;
  updating: boolean;
}

function BoolControl({ setting, onUpdate, updating }: SettingControlProps) {
  // Settings with previews use fieldset-style layout
  if (setting.preview) {
    return (
      <fieldset className="setting-fieldset">
        <legend>
          <label className="setting-toggle">
            <input
              type="checkbox"
              checked={setting.value as boolean}
              disabled={updating}
              onChange={(e) => onUpdate(setting.key, e.target.checked)}
            />
            <span className="setting-label">{setting.label}</span>
          </label>
        </legend>
        <div className="setting-preview">{setting.preview}</div>
      </fieldset>
    );
  }
  
  // Simple checkbox for settings without preview
  return (
    <div className="setting-item">
      <label className="setting-toggle">
        <input
          type="checkbox"
          checked={setting.value as boolean}
          disabled={updating}
          onChange={(e) => onUpdate(setting.key, e.target.checked)}
        />
        <span className="setting-label">{setting.label}</span>
      </label>
      {setting.description && (
        <div className="setting-description">{setting.description}</div>
      )}
    </div>
  );
}

function StringControl({ setting, onUpdate, updating }: SettingControlProps) {
  const [localValue, setLocalValue] = useState(setting.value as string || '');
  const [isEditing, setIsEditing] = useState(false);
  const isPathSetting = setting.preview && (
    setting.key.includes('location') || 
    setting.key.includes('path') || 
    setting.key.includes('directory')
  );
  
  const handleSave = () => {
    if (localValue !== setting.value) {
      onUpdate(setting.key, localValue || null);
    }
    setIsEditing(false);
  };
  
  const handleReset = () => {
    setLocalValue('');
    onUpdate(setting.key, null);
    setIsEditing(false);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setLocalValue(setting.value as string || '');
      setIsEditing(false);
    }
  };
  
  // Path settings with preview get special treatment
  if (isPathSetting) {
    return (
      <div className="setting-item setting-path">
        <span className="setting-label">{setting.label}</span>
        {setting.description && (
          <div className="setting-description">{setting.description}</div>
        )}
        <div className="setting-path-display">
          <span className="setting-path-value">{setting.preview}</span>
          {setting.value && (
            <span className="setting-path-custom">(custom)</span>
          )}
        </div>
        {isEditing ? (
          <div className="setting-path-edit">
            <input
              type="text"
              value={localValue}
              disabled={updating}
              onChange={(e) => setLocalValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter path..."
              autoFocus
            />
            <button onClick={handleSave} disabled={updating}>Save</button>
            <button onClick={() => { setLocalValue(setting.value as string || ''); setIsEditing(false); }}>Cancel</button>
          </div>
        ) : (
          <div className="setting-path-actions">
            <button onClick={() => setIsEditing(true)} disabled={updating}>
              Browse...
            </button>
            {setting.value && (
              <button onClick={handleReset} disabled={updating}>
                Reset to Default
              </button>
            )}
          </div>
        )}
      </div>
    );
  }
  
  // Standard string input
  return (
    <div className="setting-item">
      <label className="setting-field">
        <span className="setting-label">{setting.label}</span>
        <input
          type="text"
          value={localValue}
          disabled={updating}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleSave}
          placeholder="Not set"
        />
      </label>
      {setting.description && (
        <div className="setting-description">{setting.description}</div>
      )}
    </div>
  );
}

function NumberControl({ setting, onUpdate, updating }: SettingControlProps) {
  const [localValue, setLocalValue] = useState(
    setting.value !== null ? String(setting.value) : ''
  );
  
  const handleBlur = () => {
    const numValue = localValue ? Number(localValue) : null;
    if (numValue !== setting.value) {
      onUpdate(setting.key, numValue);
    }
  };
  
  return (
    <div className="setting-item">
      <label className="setting-field">
        <span className="setting-label">{setting.label}</span>
        <input
          type="number"
          value={localValue}
          disabled={updating}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          placeholder="Not set"
        />
      </label>
      {setting.description && (
        <div className="setting-description">{setting.description}</div>
      )}
    </div>
  );
}

function StringListControl({ setting, onUpdate, updating }: SettingControlProps) {
  const items = (setting.value as string[]) || [];
  const [isAdding, setIsAdding] = useState(false);
  const [newValue, setNewValue] = useState('');
  
  const handleAdd = () => {
    if (newValue.trim()) {
      onUpdate(setting.key, [...items, newValue.trim()]);
      setNewValue('');
      setIsAdding(false);
    }
  };
  
  const handleRemove = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onUpdate(setting.key, newItems);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewValue('');
    }
  };
  
  return (
    <div className="setting-item">
      <span className="setting-label">{setting.label}</span>
      {setting.description && (
        <div className="setting-description">{setting.description}</div>
      )}
      <div className="setting-list">
        {items.length === 0 && !isAdding ? (
          <div className="setting-list-empty">No items</div>
        ) : (
          items.map((item, i) => (
            <div key={i} className="setting-list-item">
              <span className="setting-list-item-text">{item}</span>
              <button
                className="setting-list-remove"
                onClick={() => handleRemove(i)}
                disabled={updating}
                title="Remove"
              >
                ×
              </button>
            </div>
          ))
        )}
        {isAdding ? (
          <div className="setting-list-add-form">
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter file path..."
              autoFocus
              disabled={updating}
            />
            <button onClick={handleAdd} disabled={updating || !newValue.trim()}>Add</button>
            <button onClick={() => { setIsAdding(false); setNewValue(''); }}>Cancel</button>
          </div>
        ) : (
          <button 
            className="setting-list-add-btn"
            onClick={() => setIsAdding(true)}
            disabled={updating}
          >
            + Add
          </button>
        )}
      </div>
    </div>
  );
}

function StringMapControl({ setting, onUpdate, updating }: SettingControlProps) {
  const map = (setting.value as Record<string, string>) || {};
  const entries = Object.entries(map);
  
  return (
    <div className="setting-item">
      <span className="setting-label">{setting.label}</span>
      {setting.description && (
        <div className="setting-description">{setting.description}</div>
      )}
      <div className="setting-map">
        {entries.length === 0 ? (
          <div className="setting-map-empty">No entries</div>
        ) : (
          entries.map(([key, value]) => (
            <div key={key} className="setting-map-entry">
              <span className="setting-map-key">{key}</span>
              <span className="setting-map-arrow">→</span>
              <span className="setting-map-value">{value}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function HandlersControl({ setting, onUpdate, updating }: SettingControlProps) {
  const handlers = (setting.value as Array<{ pattern: string; plugin: string }>) || [];
  
  // Group handlers by plugin
  const grouped = new Map<string, string[]>();
  for (const handler of handlers) {
    const patterns = grouped.get(handler.plugin) || [];
    patterns.push(handler.pattern);
    grouped.set(handler.plugin, patterns);
  }
  
  // Sort plugins alphabetically, but keep "*" fallback at the end
  const sortedPlugins = Array.from(grouped.entries()).sort(([a], [b]) => {
    const aPatterns = grouped.get(a) || [];
    const bPatterns = grouped.get(b) || [];
    const aIsFallback = aPatterns.some(p => p === '*');
    const bIsFallback = bPatterns.some(p => p === '*');
    if (aIsFallback && !bIsFallback) return 1;
    if (!aIsFallback && bIsFallback) return -1;
    return a.localeCompare(b);
  });
  
  return (
    <div className="setting-item">
      <span className="setting-label">{setting.label}</span>
      {setting.description && (
        <div className="setting-description">{setting.description}</div>
      )}
      <div className="setting-handlers">
        {handlers.length === 0 ? (
          <div className="setting-handlers-empty">No handlers configured</div>
        ) : (
          sortedPlugins.map(([plugin, patterns]) => (
            <div key={plugin} className="setting-handler-entry">
              <span className="setting-handler-plugin">{plugin}</span>
              <div className="setting-handler-patterns">
                {patterns.map((pattern, i) => (
                  <span key={i} className="setting-handler-pattern">{pattern}</span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SettingControl({ setting, onUpdate, updating }: SettingControlProps) {
  switch (setting.type) {
    case 'bool':
      return <BoolControl setting={setting} onUpdate={onUpdate} updating={updating} />;
    case 'string':
      return <StringControl setting={setting} onUpdate={onUpdate} updating={updating} />;
    case 'number':
      return <NumberControl setting={setting} onUpdate={onUpdate} updating={updating} />;
    case 'string_list':
      return <StringListControl setting={setting} onUpdate={onUpdate} updating={updating} />;
    case 'string_map':
      return <StringMapControl setting={setting} onUpdate={onUpdate} updating={updating} />;
    case 'url_handlers':
    case 'file_handlers':
      return <HandlersControl setting={setting} onUpdate={onUpdate} updating={updating} />;
    default:
      return (
        <div className="setting-item setting-item--unknown">
          <span className="setting-label">{setting.label}</span>
          <span className="setting-type">Type: {setting.type}</span>
        </div>
      );
  }
}

// =============================================================================
// Main Component
// =============================================================================

export function SettingsPanel({ category, className = '' }: SettingsPanelProps) {
  const [data, setData] = useState<CategoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  // Fetch settings on mount and when category changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    
    fetchSettings(category)
      .then(categoryData => {
        if (!cancelled) {
          setData(categoryData);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });
    
    return () => { cancelled = true; };
  }, [category]);

  // Handle setting update
  const handleUpdate = useCallback(async (key: string, value: unknown) => {
    setUpdating(key);
    
    try {
      await updateSetting(key, value);
      // Update local state
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          settings: prev.settings.map(s => 
            s.key === key ? { ...s, value } : s
          )
        };
      });
    } catch (err) {
      console.error('Failed to update setting:', err);
    } finally {
      setUpdating(null);
    }
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className={`settings-panel settings-panel--loading ${className}`}>
        <div className="settings-panel-loading">
          <div className="progress-bar" role="progressbar" aria-label="Loading settings..." />
          <span className="settings-panel-loading-text">Loading settings...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`settings-panel settings-panel--error ${className}`}>
        <div className="settings-panel-error">
          <span className="settings-panel-error-icon">⚠</span>
          <span className="settings-panel-error-text">{error}</span>
        </div>
      </div>
    );
  }

  // No data
  if (!data || data.settings.length === 0) {
    return (
      <div className={`settings-panel settings-panel--empty ${className}`}>
        <div className="settings-panel-empty">
          <span className="settings-panel-empty-text">No settings in this category</span>
        </div>
      </div>
    );
  }

  // Render settings
  return (
    <div className={`settings-panel ${className}`}>
      {data.settings.map(setting => (
        <SettingControl
          key={setting.key}
          setting={setting}
          onUpdate={handleUpdate}
          updating={updating === setting.key}
        />
      ))}
    </div>
  );
}

export default SettingsPanel;
