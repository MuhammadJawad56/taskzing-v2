"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "taskzing:recentSearches";
const MAX_ENTRIES = 10;
const CHANGE_EVENT = "taskzing:recent-searches-change";

function safeParse(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((v): v is string => typeof v === "string")
      .map((v) => v.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function readRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
}

function writeRecentSearches(next: string[]): void {
  if (typeof window === "undefined") return;
  const capped = next.slice(0, MAX_ENTRIES);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(capped));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function addRecentSearch(query: string): void {
  const q = query.trim();
  if (!q) return;
  const current = readRecentSearches();
  const deduped = current.filter((entry) => entry.toLowerCase() !== q.toLowerCase());
  writeRecentSearches([q, ...deduped]);
}

export function removeRecentSearch(query: string): void {
  const q = query.trim().toLowerCase();
  if (!q) return;
  const current = readRecentSearches();
  writeRecentSearches(current.filter((entry) => entry.toLowerCase() !== q));
}

export function clearRecentSearches(): void {
  writeRecentSearches([]);
}

/** React hook that stays in sync with recent searches across tabs/components. */
export function useRecentSearches(): {
  searches: string[];
  add: (query: string) => void;
  remove: (query: string) => void;
  clear: () => void;
} {
  const [searches, setSearches] = useState<string[]>([]);

  useEffect(() => {
    setSearches(readRecentSearches());
    const sync = () => setSearches(readRecentSearches());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY) sync();
    });
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
    };
  }, []);

  const add = useCallback((query: string) => addRecentSearch(query), []);
  const remove = useCallback((query: string) => removeRecentSearch(query), []);
  const clear = useCallback(() => clearRecentSearches(), []);

  return { searches, add, remove, clear };
}
