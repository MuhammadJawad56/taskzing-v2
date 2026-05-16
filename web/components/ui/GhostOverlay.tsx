"use client";

import React from "react";

/**
 * Renders a Google-Docs-style "ghost text" overlay on top of an input or
 * textarea. The overlay is absolutely positioned to sit on top of the
 * field, with `pointer-events: none` so that clicks fall through to the
 * underlying input. The user's already-typed value is rendered with
 * `visibility: hidden` so it reserves the same horizontal space as the
 * real text inside the input – this makes the muted "tail" appear
 * exactly at the spot where the caret currently sits.
 *
 * The overlay must use the same padding, border radius, font-size and
 * line-height as the underlying input so that the tail aligns exactly
 * with the input's text. The defaults (`px-4 py-3`, `rounded-[16px]`)
 * match the styling used by the Post a Job form fields.
 *
 * The default key hint badge shows “Tab” everywhere.
 */

interface GhostOverlayProps {
  /** Current value of the underlying input/textarea. */
  value: string;
  /** Suggestion text to display after the value, in muted color. */
  tail: string;
  /** Padding classes that match the underlying input's padding. */
  paddingClassName?: string;
  /** Border-radius class that matches the underlying input. */
  radiusClassName?: string;
  /** Optional extra classes (e.g. font-size overrides). */
  className?: string;
  /** When true, the overlay text wraps like a textarea would. */
  multiline?: boolean;
  /**
   * Hint badge after the tail (e.g. "Tab"). Omit for automatic: "Tab".
   */
  hintLabel?: string;
}

export function GhostOverlay({
  value,
  tail,
  paddingClassName = "px-4 py-3",
  radiusClassName = "rounded-[16px]",
  className = "",
  multiline = false,
  hintLabel,
}: GhostOverlayProps) {
  const resolvedHint = hintLabel !== undefined ? hintLabel : "Tab";

  if (!tail) return null;

  return (
    <div
      aria-hidden="true"
      className={[
        "pointer-events-none absolute inset-0 z-10 select-none",
        paddingClassName,
        radiusClassName,
        "leading-normal",
        "text-gray-400/80 dark:text-white/35",
        multiline
          ? "whitespace-pre-wrap break-words"
          : "whitespace-pre overflow-hidden",
        className,
      ].join(" ")}
    >
      <span className="invisible">{value}</span>
      <span className="font-normal">{tail}</span>
      {resolvedHint ? (
        <span className="ml-1 inline-flex items-center align-middle rounded border border-gray-300/70 bg-gray-100/70 px-1 py-px text-[10px] font-medium text-gray-500 dark:border-white/20 dark:bg-white/10 dark:text-white/60">
          {resolvedHint}
        </span>
      ) : null}
    </div>
  );
}
