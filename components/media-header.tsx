/**
 * Media Header Component
 * 
 * Displays a media header with thumbnail, title, creator, and duration.
 * Used for videos, podcasts, and other media entities.
 * 
 * Layout: Horizontal on wide screens, stacks on narrow.
 * - Thumbnail on left (16:9 aspect, max ~200px wide)
 * - Metadata on right (title, creator, duration)
 * 
 * @example
 * ```yaml
 * - component: media-header
 *   props:
 *     thumbnail: "{{activity.response.thumbnail}}"
 *     title: "{{activity.response.title}}"
 *     creator: "{{activity.response.creator_name}}"
 *     creatorUrl: "{{activity.response.creator_url}}"
 *     duration: "{{activity.response.duration_ms}}"
 * ```
 * 
 * Theme CSS example:
 * ```css
 * .media-header { display: flex; gap: 16px; padding: 16px; }
 * .media-header__thumbnail { aspect-ratio: 16/9; max-width: 200px; border-radius: 4px; }
 * .media-header__meta { display: flex; flex-direction: column; gap: 4px; }
 * .media-header__title { font-size: 1.25rem; font-weight: 600; }
 * .media-header__creator { color: var(--color-text-secondary); }
 * .media-header__duration { color: var(--color-text-tertiary); font-size: 0.875rem; }
 * ```
 */

import React from 'react';

export interface MediaHeaderProps {
  /** Thumbnail image URL */
  thumbnail?: string;
  /** Media title */
  title: string;
  /** Creator/channel name */
  creator?: string;
  /** Creator profile URL (makes name clickable) */
  creatorUrl?: string;
  /** Duration in milliseconds */
  duration?: number;
  /** Additional CSS class */
  className?: string;
}

/**
 * Format milliseconds to human-readable duration
 * - Under 1 hour: "MM:SS" (e.g., "5:23")
 * - 1 hour+: "H:MM:SS" (e.g., "1:05:23")
 */
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${minutes}:${pad(seconds)}`;
}

export function MediaHeader({
  thumbnail,
  title,
  creator,
  creatorUrl,
  duration,
  className = '',
}: MediaHeaderProps) {
  return (
    <div className={`media-header ${className}`.trim()}>
      {thumbnail && (
        <img 
          src={thumbnail} 
          alt={title}
          className="media-header__thumbnail"
        />
      )}
      <div className="media-header__meta">
        <span className="media-header__title">{title}</span>
        {creator && (
          creatorUrl ? (
            <a 
              href={creatorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="media-header__creator"
            >
              {creator}
            </a>
          ) : (
            <span className="media-header__creator">{creator}</span>
          )
        )}
        {duration !== undefined && duration > 0 && (
          <span className="media-header__duration">
            {formatDuration(duration)}
          </span>
        )}
      </div>
    </div>
  );
}

export default MediaHeader;
