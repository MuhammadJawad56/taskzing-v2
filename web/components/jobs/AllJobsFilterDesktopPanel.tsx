"use client";

import React from "react";
import { X } from "lucide-react";
import type { AllJobsAdvancedFilter } from "@/lib/jobs/allJobsAdvancedFilter";
import {
  emptyAllJobsAdvancedFilter,
  hasActiveAllJobsAdvancedFilter,
} from "@/lib/jobs/allJobsAdvancedFilter";
import { AllJobsFilterFields } from "@/components/jobs/AllJobsFilterFields";

type AllJobsFilterDesktopPanelProps = {
  value: AllJobsAdvancedFilter;
  onChange: (next: AllJobsAdvancedFilter) => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
};

export function AllJobsFilterDesktopPanel({
  value,
  onChange,
  onApply,
  onReset,
  onClose,
}: AllJobsFilterDesktopPanelProps) {
  return (
    <div
      className="mb-6 overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-lg ring-1 ring-black/[0.04] dark:border-white/10 dark:bg-darkBlue-003 dark:ring-white/5"
      role="region"
      aria-label="Job filters"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-white/10 sm:px-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h3>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-white/55">
            Narrow your jobs and proposals list
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveAllJobsAdvancedFilter(value) ? (
            <button
              type="button"
              onClick={() => onChange(emptyAllJobsAdvancedFilter())}
              className="text-sm font-medium text-red-500 transition-colors hover:text-red-600 hover:underline"
            >
              Clear all
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Close filters"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <AllJobsFilterFields value={value} onChange={onChange} layout="desktop" />
      </div>

      <div className="flex flex-col-reverse items-stretch justify-end gap-3 border-t border-gray-100 bg-gray-50/80 px-5 py-4 dark:border-white/10 dark:bg-darkBlue-013/50 sm:flex-row sm:items-center sm:px-6">
        <button
          type="button"
          onClick={onReset}
          className="h-11 rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/15 dark:bg-darkBlue-203 dark:text-white/90 dark:hover:bg-darkBlue-343 sm:min-w-[120px]"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={onApply}
          className="h-11 flex-1 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white shadow-md shadow-red-600/25 transition-colors hover:bg-red-700 sm:max-w-xs sm:ml-auto"
        >
          Apply filters
        </button>
      </div>
    </div>
  );
}
