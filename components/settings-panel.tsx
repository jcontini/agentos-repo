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
  
  const handleBlur = () => {
    if (localValue !== setting.value) {
      onUpdate(setting.key, localValue || null);
    }
  };
  
  return (
    <div className="setting-item">
      <label className="setting-field">
        <span className="setting-label">{setting.label}</span>
        <input
          type="text"
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
  
  return (
    <div className="setting-item">
      <span className="setting-label">{setting.label}</span>
      {setting.description && (
        <div className="setting-description">{setting.description}</div>
      )}
      <div className="setting-list">
        {items.length === 0 ? (
          <div className="setting-list-empty">No items</div>
        ) : (
          items.map((item, i) => (
            <div key={i} className="setting-list-item">
              <span>{item}</span>
            </div>
          ))
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
          handlers.map((handler, i) => (
            <div key={i} className="setting-handler-entry">
              <span className="setting-handler-pattern">{handler.pattern}</span>
              <span className="setting-handler-arrow">→</span>
              <span className="setting-handler-plugin">{handler.plugin}</span>
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
