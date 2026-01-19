/**
 * List Primitive Component
 * 
 * A pure container component that wraps children with list behavior:
 * - Keyboard navigation (arrow keys, Enter)
 * - Selection state and visual feedback
 * - Click and double-click handling
 * - Loading and error states
 * - Full accessibility (ARIA roles, focus management)
 * 
 * Uses Zod for runtime prop validation — catches YAML typos and wrong types.
 * 
 * @example
 * ```yaml
 * - component: list
 *   data:
 *     capability: web_search
 *   item_component: items/search-result
 *   item_props:
 *     title: "{{title}}"
 *     url: "{{url}}"
 * ```
 */

import { useState, useRef, useEffect, Children, ReactNode, KeyboardEvent, useCallback } from 'react';
import { z } from 'zod';

// =============================================================================
// Prop Schema (Zod)
// =============================================================================

/**
 * Schema for List props — validates at runtime, applies defaults.
 * Components can export their schema for documentation and tooling.
 */
export const ListPropsSchema = z.object({
  /** Original data items (used for callbacks) */
  items: z.array(z.object({ id: z.string().optional() }).passthrough()).default([]),
  /** Pre-rendered item components */
  children: z.any().optional(),
  /** Layout direction */
  layout: z.enum(['vertical', 'horizontal']).default('vertical'),
  /** Visual variant */
  variant: z.enum(['default', 'chat', 'cards']).default('default'),
  /** Show loading state */
  loading: z.boolean().default(false),
  /** Error message */
  error: z.string().optional(),
  /** Empty state message */
  emptyMessage: z.string().default('No items'),
  /** Select handler */
  onSelect: z.function().args(z.any(), z.number()).returns(z.void()).optional(),
  /** Double-click handler */
  onDoubleClick: z.function().args(z.any(), z.number()).returns(z.void()).optional(),
  /** Accessibility label */
  'aria-label': z.string().default('List'),
});

/** Inferred TypeScript type from schema */
export type ListProps = z.infer<typeof ListPropsSchema>;

// =============================================================================
// Component
// =============================================================================

export function List(rawProps: unknown) {
  // Validate props and apply defaults
  const parseResult = ListPropsSchema.safeParse(rawProps);
  
  if (!parseResult.success) {
    // Log validation errors for debugging
    console.error('[List] Invalid props:', parseResult.error.format());
    // Render error state instead of crashing
    return (
      <div className="list list--error" role="alert">
        <div className="list-error">
          <span className="list-error-icon" aria-hidden="true">⚠</span>
          <span className="list-error-text">Invalid list configuration</span>
        </div>
      </div>
    );
  }

  const {
    items,
    children,
    layout,
    variant,
    loading,
    error,
    emptyMessage,
    onSelect,
    onDoubleClick,
    'aria-label': ariaLabel,
  } = parseResult.data;

  const [selectedIndex, setSelectedIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);
  const childArray = Children.toArray(children);

  // Reset selection when items change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [items.length]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selectedElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    const itemCount = childArray.length;
    if (itemCount === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => prev < itemCount - 1 ? prev + 1 : prev);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Home':
        e.preventDefault();
        setSelectedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setSelectedIndex(itemCount - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < items.length) {
          onSelect?.(items[selectedIndex], selectedIndex);
        }
        break;
    }
  }, [childArray.length, items, selectedIndex, onSelect]);

  // Handle item click
  const handleItemClick = useCallback((index: number) => {
    setSelectedIndex(index);
    if (index < items.length) {
      onSelect?.(items[index], index);
    }
  }, [items, onSelect]);

  // Handle item double-click
  const handleItemDoubleClick = useCallback((index: number) => {
    if (index < items.length) {
      onDoubleClick?.(items[index], index);
    }
  }, [items, onDoubleClick]);

  // Loading state
  if (loading) {
    return (
      <div 
        className="list list--loading" 
        role="list" 
        aria-label={ariaLabel}
        aria-busy="true"
      >
        <div className="list-loading">
          <span className="list-loading-spinner" aria-hidden="true" />
          <span className="list-loading-text">Loading...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div 
        className="list list--error" 
        role="alert" 
        aria-label={ariaLabel}
      >
        <div className="list-error">
          <span className="list-error-icon" aria-hidden="true">⚠</span>
          <span className="list-error-text">{error}</span>
        </div>
      </div>
    );
  }

  // Empty state
  if (childArray.length === 0) {
    return (
      <div 
        className="list list--empty" 
        role="list" 
        aria-label={ariaLabel}
      >
        <div className="list-empty">
          <span className="list-empty-text">{emptyMessage}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      className="list"
      role="listbox"
      aria-label={ariaLabel}
      aria-activedescendant={selectedIndex >= 0 ? `list-item-${selectedIndex}` : undefined}
      data-layout={layout}
      data-variant={variant}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {childArray.map((child, index) => (
        <div
          key={items[index]?.id ?? index}
          id={`list-item-${index}`}
          className="list-item"
          role="option"
          aria-selected={index === selectedIndex}
          data-index={index}
          data-selected={index === selectedIndex}
          tabIndex={-1}
          onClick={() => handleItemClick(index)}
          onDoubleClick={() => handleItemDoubleClick(index)}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

export default List;
