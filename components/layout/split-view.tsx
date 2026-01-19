/**
 * Split View Layout Primitive
 * 
 * Divides space between two panes (horizontal or vertical split).
 * Uses CSS classes and custom properties so themes can style dividers.
 * 
 * Accepts exactly 2 children - first pane and second pane.
 * 
 * @example
 * ```yaml
 * - component: layout/split-view
 *   props:
 *     direction: horizontal
 *     splitAt: "300px"
 *     showDivider: true
 *   children:
 *     - component: list
 *       data:
 *         capability: message_list_conversations
 *     - component: markdown
 *       props:
 *         content: "Select a conversation"
 * ```
 * 
 * Theme CSS example:
 * ```css
 * .split-view { display: flex; height: 100%; }
 * .split-view[data-direction="horizontal"] { flex-direction: row; }
 * .split-view[data-direction="vertical"] { flex-direction: column; }
 * .split-view-first { flex-basis: var(--split-at, 50%); flex-shrink: 0; }
 * .split-view-second { flex: 1; min-width: 0; min-height: 0; }
 * .split-view-divider { 
 *   background: var(--color-border); 
 *   flex-shrink: 0;
 * }
 * .split-view[data-direction="horizontal"] .split-view-divider { width: 1px; }
 * .split-view[data-direction="vertical"] .split-view-divider { height: 1px; }
 * ```
 */

import { ReactNode, CSSProperties, Children } from 'react';

interface SplitViewProps {
  /** Split direction: horizontal (side-by-side) or vertical (stacked) */
  direction?: 'horizontal' | 'vertical';
  /** Size of first pane (CSS value: px, %, etc.) */
  splitAt?: string;
  /** Gap between panes (CSS value) */
  gap?: string;
  /** Whether to show a divider between panes */
  showDivider?: boolean;
  /** Exactly 2 children: first pane and second pane */
  children?: ReactNode;
  /** Additional CSS class */
  className?: string;
}

export function SplitView({
  direction = 'horizontal',
  splitAt,
  gap,
  showDivider = false,
  children,
  className = '',
}: SplitViewProps) {
  // Extract first two children
  const childArray = Children.toArray(children);
  const firstPane = childArray[0] ?? null;
  const secondPane = childArray[1] ?? null;

  // Pass layout values as CSS custom properties for theme control
  const style: CSSProperties = {
    ...(splitAt && { '--split-at': splitAt }),
    ...(gap && { '--split-gap': gap }),
  } as CSSProperties;

  return (
    <div 
      className={`split-view ${className}`}
      data-direction={direction}
      data-divider={showDivider || undefined}
      style={Object.keys(style).length > 0 ? style : undefined}
    >
      <div className="split-view-pane split-view-first">
        {firstPane}
      </div>
      
      {showDivider && (
        <div className="split-view-divider" aria-hidden="true" />
      )}
      
      <div className="split-view-pane split-view-second">
        {secondPane}
      </div>
    </div>
  );
}

export default SplitView;
