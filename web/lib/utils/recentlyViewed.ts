"use client";

import { useCallback, useEffect, useState } from "react";
import { AUTH_CHANGED_EVENT } from "@/lib/api/http";

const STORAGE_KEY = "taskzing:recentlyViewed";
const MAX_ENTRIES = 20;
const CHANGE_EVENT = "taskzing:recently-viewed-change";

export type RecentlyViewedType = "job" | "showcase";

export interface RecentlyViewedEntry {
  id: string;
  type: RecentlyViewedType;
  viewedAt: number;
  providerHint?: string;
}

function safeParse(raw: string | null): RecentlyViewedEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v): v is RecentlyViewedEntry =>
        v &&
        typeof v === "object" &&
        typeof v.id === "string" &&
        (v.type === "job" || v.type === "showcase") &&
        typeof v.viewedAt === "number",
    );
  } catch {
    return [];
  }
}

export function readRecentlyViewed(): RecentlyViewedEntry[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
}

function writeRecentlyViewed(next: RecentlyViewedEntry[]): void {
  if (typeof window === "undefined") return;
  const capped = next.slice(0, MAX_ENTRIES);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(capped));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function addRecentlyViewed(entry: Omit<RecentlyViewedEntry, "viewedAt">): void {
  if (!entry.id) return;
  const current = readRecentlyViewed();
  const deduped = current.filter((e) => !(e.id === entry.id && e.type === entry.type));
  const nextEntry: RecentlyViewedEntry = { ...entry, viewedAt: Date.now() };
  writeRecentlyViewed([nextEntry, ...deduped]);
}

export function removeRecentlyViewed(id: string, type: RecentlyViewedType): void {
  const current = readRecentlyViewed();
  writeRecentlyViewed(current.filter((e) => !(e.id === id && e.type === type)));
}

export function clearRecentlyViewed(): void {
  writeRecentlyViewed([]);
}

export function useRecentlyViewed(): {
  entries: RecentlyViewedEntry[];
  remove: (id: string, type: RecentlyViewedType) => void;
  clear: () => void;
} {
  const [entries, setEntries] = useState<RecentlyViewedEntry[]>([]);

  useEffect(() => {
    let alive = true;

    const syncLocal = () => {
      if (!alive) return;
      setEntries(readRecentlyViewed());
    };

    syncLocal();

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) syncLocal();
    };

    window.addEventListener(CHANGE_EVENT, syncLocal);
    window.addEventListener("storage", onStorage);
    window.addEventListener(AUTH_CHANGED_EVENT, syncLocal);

    return () => {
      alive = false;
      window.removeEventListener(CHANGE_EVENT, syncLocal);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(AUTH_CHANGED_EVENT, syncLocal);
    };
  }, []);

  const remove = useCallback(
    (id: string, type: RecentlyViewedType) => removeRecentlyViewed(id, type),
    [],
  );
  const clear = useCallback(() => clearRecentlyViewed(), []);

  return { entries, remove, clear };
}
