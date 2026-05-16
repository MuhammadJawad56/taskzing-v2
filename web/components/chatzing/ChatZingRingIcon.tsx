"use client";

import { useId } from "react";

/**
 * Gradient ring used for ChatZing in the dashboard header — shared so the
 * chat page and nav use the same mark.
 */
export function ChatZingRingIcon({
  className = "h-8 w-8",
  strokeWidth = 12,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const gradId = `chatzing-ring-grad-${uid}`;

  return (
    <div className={`relative shrink-0 ${className}`}>
      <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="25%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="75%" stopColor="#d946ef" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
        />
      </svg>
    </div>
  );
}
