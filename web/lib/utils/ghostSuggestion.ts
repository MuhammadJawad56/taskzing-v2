/**
 * Inline ("ghost text") autocomplete helper used by job, showcase, and profile forms.
 *
 * Matching runs in layers so typing can continue after spaces and across words
 * (word-token pools and multi-word phrases), not only the very first prefix.
 */

export type GhostMatchMode = "full" | "lastSegment";

export interface GhostSuggestionResult {
  /** The portion shown in muted color after the user's existing value. */
  tail: string;
  /** The full string the field should hold once the user accepts it. */
  full: string;
}

const SEGMENT_BREAK_RE = /[\n.!?]/g;

function findLastSegmentStart(value: string): number {
  let lastBreak = -1;
  let m: RegExpExecArray | null;
  SEGMENT_BREAK_RE.lastIndex = 0;
  while ((m = SEGMENT_BREAK_RE.exec(value)) !== null) {
    lastBreak = m.index;
  }
  return lastBreak + 1;
}

/** First suggestion that strictly extends `needle` as a prefix (case-insensitive). */
function pickExtendingPrefix(needle: string, suggestions: readonly string[]): string | null {
  if (!needle) return null;
  const low = needle.toLowerCase();
  for (const c of suggestions) {
    if (c.length <= needle.length) continue;
    if (c.toLowerCase().startsWith(low)) return c;
  }
  return null;
}

/**
 * Complete the last typed token (after the last whitespace) using pool entries
 * that extend that token — e.g. "I need pl" → "I need plumber".
 */
function pickLastTokenCompletion(core: string, suggestions: readonly string[]): string | null {
  const rt = core.trimEnd();
  if (!rt) return null;
  const idx = Math.max(rt.lastIndexOf(" "), rt.lastIndexOf("\n"), rt.lastIndexOf("\t"));
  const prefix = idx === -1 ? "" : rt.slice(0, idx + 1);
  const token = idx === -1 ? rt : rt.slice(idx + 1);
  if (!token) return null;
  const lowTok = token.toLowerCase();
  for (const s of suggestions) {
    if (s.length <= token.length) continue;
    if (!s.toLowerCase().startsWith(lowTok)) continue;
    const combined = prefix + s;
    if (!combined.toLowerCase().startsWith(rt.toLowerCase())) continue;
    if (combined.length <= rt.length) continue;
    return combined;
  }
  return null;
}

/**
 * When `core` ends with whitespace, suggest the next word from the pool
 * (e.g. "I need " → "I need professional" if that string extends the typed prefix).
 */
function pickNextWordAfterSpace(core: string, suggestions: readonly string[]): string | null {
  if (!/\s$/.test(core)) return null;
  const rt = core.trimEnd();
  if (!rt) return null;
  const coreNorm = core.replace(/\s+$/, " ");
  const cLow = coreNorm.toLowerCase();
  for (const s of suggestions) {
    const t = s.trim();
    if (!t) continue;
    const cand = `${rt} ${s}`;
    if (cand.length <= coreNorm.length) continue;
    if (!cand.toLowerCase().startsWith(cLow)) continue;
    return cand;
  }
  return null;
}

function resolveChosenInCore(core: string, suggestions: readonly string[]): string | null {
  let chosen = pickExtendingPrefix(core, suggestions);
  if (!chosen && /\s$/.test(core)) {
    chosen = pickExtendingPrefix(`${core.trimEnd()} `, suggestions);
  }
  if (!chosen) {
    chosen = pickLastTokenCompletion(core, suggestions);
  }
  if (!chosen) {
    chosen = pickNextWordAfterSpace(core, suggestions);
  }
  return chosen;
}

export function findGhostSuggestion(
  value: string,
  suggestions: readonly string[],
  mode: GhostMatchMode = "full"
): GhostSuggestionResult | null {
  if (!value || suggestions.length === 0) return null;

  const segmentStart = mode === "lastSegment" ? findLastSegmentStart(value) : 0;
  const segment = value.substring(segmentStart);

  const leadingMatch = segment.match(/^\s*/);
  const leading = leadingMatch ? leadingMatch[0] : "";
  const core = segment.substring(leading.length);

  if (!core.trim().length) return null;

  const chosen = resolveChosenInCore(core, suggestions);
  if (!chosen) return null;

  if (!chosen.toLowerCase().startsWith(core.toLowerCase())) {
    return null;
  }

  const tail = chosen.substring(core.length);
  const full = value.substring(0, segmentStart) + leading + chosen;

  return { tail, full };
}

export function shouldGhostAcceptOnTabKey(): boolean {
  return true;
}
