"use client";

import React from "react";
import type { AllJobsAdvancedFilter } from "@/lib/jobs/allJobsAdvancedFilter";
import { emptyAllJobsAdvancedFilter, hasActiveAllJobsAdvancedFilter } from "@/lib/jobs/allJobsAdvancedFilter";
import { AllJobsFilterFields } from "@/components/jobs/AllJobsFilterFields";

type AllJobsFilterSheetContentProps = {
  value: AllJobsAdvancedFilter;
  onChange: (next: AllJobsAdvancedFilter) => void;
  onApply: () => void;
  onReset: () => void;
};

/** Mobile bottom sheet body — mirrors `AllJobsFilterWidget` (all_jobs_filter_widget.dart). */
export function AllJobsFilterSheetContent({
  value,
  onChange,
  onApply,
  onReset,
}: AllJobsFilterSheetContentProps) {
  return (
    <div className="border-b border-gray-200 px-4 pb-5 pt-4 dark:border-darkBlue-003 sm:px-6">
      <div className="mx-auto max-w-lg rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-sm dark:border-darkBlue-003 dark:bg-darkBlue-003 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white sm:text-xl">Filters</h3>
          {hasActiveAllJobsAdvancedFilter(value) ? (
            <button
              type="button"
              onClick={() => onChange(emptyAllJobsAdvancedFilter())}
              className="shrink-0 text-sm font-medium text-red-500 hover:underline"
            >
              Clear All
            </button>
          ) : null}
        </div>

        <div className="mt-5">
          <AllJobsFilterFields value={value} onChange={onChange} layout="sheet" />
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
