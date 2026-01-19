/**
 * Toggle Component
 * 
 * A checkbox toggle with label using OS 9 styling.
 * Presentational component — receives checked state and fires onChange.
 * 
 * @example
 * ```yaml
 * - component: toggle
 *   props:
 *     label: Enable activity logging
 *     checked: "{{settings.logging_enabled}}"
 *   on_change:
 *     action: settings.set
 *     params:
 *       key: logging_enabled
 * ```
 * 
 * Theme CSS:
 * ```css
 * input[type=checkbox] { ... OS 9 checkbox styling ... }
 * ```
 */

import React from 'react';

interface ToggleProps {
  /** Label text displayed next to the checkbox */
  label: string;
  /** Whether the toggle is checked */
  checked?: boolean;
  /** Disable the toggle */
  disabled?: boolean;
  /** Fired when toggle state changes (receives new checked value) */
  onChange?: (checked: boolean) => void;
  /** Additional CSS class */
  className?: string;
}

export function Toggle({
  label,
  checked = false,
  disabled = false,
  onChange,
  className = '',
}: ToggleProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.checked);
  };

  return (
    <label className={`toggle ${className}`} data-disabled={disabled || undefined}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={handleChange}
      />
      <span className="toggle-label">{label}</span>
    </label>
  );
}

export default Toggle;
