/**
 * Tabs Component
 * 
 * A tabbed panel container using OS 9 styling.
 * Manages active tab state and renders panel content based on selection.
 * 
 * @example
 * ```yaml
 * - component: tabs
 *   props:
 *     tabs:
 *       - id: general
 *         label: General
 *       - id: plugins
 *         label: Plugins
 *     default: general
 *   slots:
 *     general:
 *       component: layout/stack
 *       children:
 *         - component: text
 *           props:
 *             content: General settings
 *     plugins:
 *       component: layout/stack
 *       children:
 *         - component: text
 *           props:
 *             content: Plugin settings
 * ```
 * 
 * Theme CSS structure:
 * ```css
 * .tabs > menu { display: flex; }
 * .tabs > menu > button { ... tab styling ... }
 * .tabs > menu > button[aria-selected=true] { ... active tab ... }
 * .tabs > [role=tabpanel] { ... panel styling ... }
 * ```
 */

import React, { useState, useEffect, ReactNode } from 'react';

interface TabDefinition {
  /** Unique identifier for the tab (matches slot name) */
  id: string;
  /** Display label for the tab button */
  label: string;
}

interface TabsProps {
  /** Array of tab definitions */
  tabs: TabDefinition[];
  /** ID of the initially selected tab (defaults to first tab) */
  default?: string;
  /** Controlled active tab (overrides internal state when changed) */
  activeTab?: string;
  /** Pre-rendered slot content keyed by tab ID */
  slots?: Record<string, ReactNode>;
  /** Additional CSS class */
  className?: string;
}

export function Tabs({
  tabs,
  default: defaultTab,
  activeTab: controlledTab,
  slots = {},
  className = '',
}: TabsProps) {
  // Handle missing or invalid tabs prop gracefully
  const tabsArray = Array.isArray(tabs) ? tabs : [];
  
  // Initialize to controlled value, default, or first tab
  const [activeTab, setActiveTab] = useState(
    controlledTab || defaultTab || tabsArray[0]?.id || ''
  );
  
  // Update when controlled tab changes
  useEffect(() => {
    if (controlledTab && controlledTab !== activeTab) {
      setActiveTab(controlledTab);
    }
  }, [controlledTab]);

  // Get panel content for active tab
  const activePanel = slots[activeTab];

  return (
    <div className={`tabs ${className}`}>
      <menu role="tablist">
        {tabsArray.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </menu>
      <div
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={activeTab}
      >
        {activePanel}
      </div>
    </div>
  );
}

export default Tabs;
