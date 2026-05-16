import type { KeyboardEvent, PointerEvent } from "react";
import type { GhostSuggestionResult } from "@/lib/utils/ghostSuggestion";
import { shouldGhostAcceptOnTabKey } from "@/lib/utils/ghostSuggestion";

/** Tab accepts ghost on touch-primary devices only; see `shouldGhostAcceptOnTabKey`. */
export function acceptGhostOnTab<T extends HTMLInputElement | HTMLTextAreaElement>(
  e: KeyboardEvent<T>,
  ghost: GhostSuggestionResult | null,
  apply: (full: string) => void
) {
  if (e.key !== "Tab" || e.shiftKey) return;
  if (!ghost) return;
  if (!shouldGhostAcceptOnTabKey()) return;
  e.preventDefault();
  const target = e.currentTarget;
  apply(ghost.full);
  requestAnimationFrame(() => {
    try {
      target.focus();
      target.setSelectionRange(ghost.full.length, ghost.full.length);
    } catch {
      // Ignore if the element has been unmounted.
    }
  });
}

/** Touch / pen: tapping the field accepts the ghost (mouse excluded). */
export function acceptGhostOnTouchTap<T extends HTMLInputElement | HTMLTextAreaElement>(
  e: PointerEvent<T>,
  ghost: GhostSuggestionResult | null,
  apply: (full: string) => void
) {
  if (!ghost) return;
  if (e.pointerType === "mouse") return;
  e.preventDefault();
  const target = e.currentTarget;
  apply(ghost.full);
  requestAnimationFrame(() => {
    try {
      target.focus();
      target.setSelectionRange(ghost.full.length, ghost.full.length);
    } catch {
      // Ignore if the field is temporarily unavailable.
    }
  });
}
