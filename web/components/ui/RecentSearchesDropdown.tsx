"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, History, Search, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface RecentSearchesDropdownProps {
  open: boolean;
  query: string;
  searches: string[];
  onSelect: (query: string) => void;
  onRemove: (query: string) => void;
  onNavigate?: () => void;
  className?: string;
}

/**
 * Floating "Recent Searches" panel shown below a search input.
 * The parent is responsible for opening/closing it (focus + click-outside).
 */
export function RecentSearchesDropdown({
  open,
  query,
  searches,
  onSelect,
  onRemove,
  onNavigate,
  className,
}: RecentSearchesDropdownProps) {
  const router = useRouter();

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const filtered = q ? searches.filter((s) => s.toLowerCase().includes(q)) : searches;

  const handleRecentlyViewedClick = () => {
    onNavigate?.();
    router.push("/recently-viewed");
  };

  return (
    <div
      role="listbox"
      aria-label="Recent searches"
      className={cn(
        "absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white p-3 shadow-xl dark:border-white/10 dark:bg-darkBlue-203",
        className,
      )}
      // Prevent input blur from firing before an item click is registered
      onMouseDown={(e) => e.preventDefault()}
    >
      <h3 className="px-1 pb-2 text-[15px] font-bold text-darkBlue-003 dark:text-white">
        Recent Searches
      </h3>

      {filtered.length > 0 && (
        <ul className="mb-2 space-y-0.5">
          {filtered.map((entry) => (
            <li
              key={entry}
              className="group flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-gray-50 dark:hover:bg-white/5"
            >
              <button
                type="button"
                onClick={() => onSelect(entry)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <Search
                  className="h-4 w-4 shrink-0 text-gray-500 dark:text-white/70"
                  aria-hidden
                />
                <span className="min-w-0 truncate text-sm text-darkBlue-003 dark:text-white">
                  {entry}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onRemove(entry)}
                aria-label={`Remove "${entry}" from recent searches`}
                className="flex size-7 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={handleRecentlyViewedClick}
        className="flex w-full items-center justify-between gap-3 rounded-xl bg-rose-50 px-3 py-3 text-left transition-colors hover:bg-rose-100 dark:bg-red-500/10 dark:hover:bg-red-500/20"
      >
        <span className="flex min-w-0 items-center gap-3">
          <History
            className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400"
            aria-hidden
          />
          <span className="truncate text-sm font-semibold text-red-600 dark:text-red-400">
            Recently Viewed Listings
          </span>
        </span>
        <ChevronRight
          className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400"
          aria-hidden
        />
      </button>
    </div>
  );
}
