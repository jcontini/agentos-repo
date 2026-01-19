/**
 * Credential List Component
 * 
 * Displays configured credential accounts in a compact table.
 * Shows plugin name, account name, and masked key preview.
 * 
 * @example
 * ```yaml
 * - component: credential-list
 * ```
 */

import React, { useState, useEffect, useRef } from 'react';

// =============================================================================
// Types
// =============================================================================

interface Credential {
  account: string;
  plugin: string;
  key_preview?: string; // e.g., "sk-ab••••xyz9"
}

interface CredentialListProps {
  /** Additional CSS class */
  className?: string;
}

// =============================================================================
// API Helpers
// =============================================================================

async function fetchCredentials(): Promise<Credential[]> {
  const response = await fetch('/api/tools/call', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tool: 'Settings',
      arguments: { action: 'list_credentials' }
    })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch credentials: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.result?.credentials || [];
}

// =============================================================================
// Component
// =============================================================================

export function CredentialList({ className = '' }: CredentialListProps) {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const tableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    let cancelled = false;
    
    fetchCredentials()
      .then(creds => {
        if (!cancelled) {
          // Sort by plugin name, then account name
          creds.sort((a, b) => {
            const pluginCmp = a.plugin.localeCompare(b.plugin);
            return pluginCmp !== 0 ? pluginCmp : a.account.localeCompare(b.account);
          });
          setCredentials(creds);
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
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (credentials.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, credentials.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Home':
        e.preventDefault();
        setSelectedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setSelectedIndex(credentials.length - 1);
        break;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={`credential-list credential-list--loading ${className}`}>
        <div className="credential-list-loading">
          <div className="progress-bar" role="progressbar" aria-label="Loading accounts..." />
          <span className="credential-list-loading-text">Loading accounts...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`credential-list credential-list--error ${className}`}>
        <div className="credential-list-error">
          <span className="credential-list-error-icon">⚠</span>
          <span className="credential-list-error-text">{error}</span>
        </div>
      </div>
    );
  }

  // Empty state
  if (credentials.length === 0) {
    return (
      <div className={`credential-list credential-list--empty ${className}`}>
        <div className="credential-list-empty">
          <span className="credential-list-empty-icon">🔑</span>
          <span className="credential-list-empty-text">No accounts configured</span>
          <span className="credential-list-empty-hint">
            Add credentials to ~/.agentos/credentials.json
          </span>
        </div>
      </div>
    );
  }

  // Compact table view
  return (
    <div className={`credential-list ${className}`}>
      <table
        ref={tableRef}
        className="detailed"
        role="grid"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        aria-label="Configured accounts"
      >
        <thead>
          <tr>
            <th>Plugin</th>
            <th>Account</th>
            <th>Key</th>
          </tr>
        </thead>
        <tbody>
          {credentials.map((cred, index) => (
            <tr
              key={`${cred.plugin}-${cred.account}`}
              className={index === selectedIndex ? 'selected' : ''}
              onClick={() => setSelectedIndex(index)}
              aria-selected={index === selectedIndex}
            >
              <td className="credential-plugin">{cred.plugin}</td>
              <td className="credential-account">{cred.account}</td>
              <td className="credential-key-preview">
                {cred.key_preview || '••••••••'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default CredentialList;
