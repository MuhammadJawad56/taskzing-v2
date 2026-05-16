"use client";

import React from "react";
import { Filter } from "lucide-react";
import type { AllJobsAdvancedFilter } from "@/lib/jobs/allJobsAdvancedFilter";
import {
  allJobsAdvancedFilterSummary,
  hasActiveAllJobsAdvancedFilter,
} from "@/lib/jobs/allJobsAdvancedFilter";

type AllJobsFilterSummaryBarProps = {
  value: AllJobsAdvancedFilter;
  onClear: () => void;
};

/** Mirrors `FilterSummaryWidget` (filter_summary_widget.dart). */
export function AllJobsFilterSummaryBar({ value, onClear }: AllJobsFilterSummaryBarProps) {
  if (!hasActiveAllJobsAdvancedFilter(value)) return null;

  return (
    <div className="mb-4 flex w-full items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-3 sm:px-4">
      <Filter className="h-4 w-4 shrink-0 text-[#F21A1A]" strokeWidth={2} aria-hidden />
      <p className="min-w-0 flex-1 text-xs font-medium text-[#F21A1A] sm:text-sm">
        {allJobsAdvancedFilterSummary(value)}
      </p>
      <button
        type="button"
        onClick={onClear}
        className="flex shrink-0 items-center justify-center rounded bg-[#F21A1A] p-1 text-white hover:opacity-90"
        aria-label="Clear filters"
      >
        <span className="text-xs leading-none">×</span>
      </button>
    </div>
  );
}
