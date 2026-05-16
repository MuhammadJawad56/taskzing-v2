"use client";

import React from "react";

export type ProposalSortKey = "newest" | "oldest" | "bid_asc" | "bid_desc";

type ProposalsListFilterSheetContentProps = {
  sort: ProposalSortKey;
  onChangeSort: (sort: ProposalSortKey) => void;
  onApply: () => void;
  onReset: () => void;
};

const SORT_OPTIONS: { value: ProposalSortKey; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "bid_asc", label: "Bid: Low to high" },
  { value: "bid_desc", label: "Bid: High to low" },
];

/** Same card + chip pattern as `AllJobsFilterWidget`; proposals list has no filter model in Flutter (stub only). */
export function ProposalsListFilterSheetContent({
  sort,
  onChangeSort,
  onApply,
  onReset,
}: ProposalsListFilterSheetContentProps) {
  return (
    <div className="border-b border-gray-200 px-4 pb-5 pt-4 dark:border-darkBlue-003 sm:px-6">
      <div className="mx-auto max-w-lg rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-sm dark:border-darkBlue-003 dark:bg-darkBlue-003 sm:p-5">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white sm:text-xl">Filters</h3>
        <p className="mt-1 text-xs text-gray-600 dark:text-white/60 sm:text-sm">
          Sort how proposals are listed (search still applies).
        </p>

        <div className="mt-5">
          <p className="text-base font-semibold text-gray-900 dark:text-white">Sort by</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SORT_OPTIONS.map(({ value, label }) => {
              const selected = sort === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onChangeSort(value)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors sm:text-sm ${
                    selected
                      ? "border-[#F21A1A] bg-[#F21A1A] font-semibold text-white"
                      : "border-gray-300/30 bg-[#D9D9D9] text-gray-900 dark:border-white/30 dark:bg-darkBlue-003 dark:text-white"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onApply}
            className="h-10 min-h-[40px] flex-1 rounded-lg bg-[#F21A1A] text-sm font-semibold text-white shadow-md transition-colors hover:opacity-95 sm:h-11"
          >
            Apply Filters
          </button>
          <button
            type="button"
            onClick={onReset}
            className="h-10 w-[100px] shrink-0 rounded-lg bg-[#D9D9D9] text-sm font-semibold text-gray-600 dark:bg-darkBlue-003 dark:text-white/80 sm:h-11"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

export function proposalSortSummary(sort: ProposalSortKey): string {
  const labels: Record<ProposalSortKey, string> = {
    newest: "Newest first",
    oldest: "Oldest first",
    bid_asc: "Bid: Low to high",
    bid_desc: "Bid: High to low",
  };
  return labels[sort];
}
