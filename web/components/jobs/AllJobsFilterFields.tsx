"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";
import type { AllJobsAdvancedFilter } from "@/lib/jobs/allJobsAdvancedFilter";

type AllJobsFilterFieldsProps = {
  value: AllJobsAdvancedFilter;
  onChange: (next: AllJobsAdvancedFilter) => void;
  layout?: "sheet" | "desktop";
};

function FilterSection({
  title,
  current,
  values,
  labels,
  onPick,
  layout,
}: {
  title: string;
  current: string | null;
  values: string[];
  labels: string[];
  onPick: (v: string) => void;
  layout: "sheet" | "desktop";
}) {
  return (
    <div className={layout === "desktop" ? "min-w-0" : undefined}>
      <p
        className={cn(
          "font-semibold text-gray-900 dark:text-white",
          layout === "desktop"
            ? "text-xs uppercase tracking-wider text-gray-500 dark:text-white/55"
            : "text-base",
        )}
      >
        {title}
      </p>
      <div className={cn("flex flex-wrap gap-2", layout === "desktop" ? "mt-2.5" : "mt-3")}>
        {values.map((v, i) => {
          const selected = current === v || (current == null && v === "all");
          return (
            <button
              key={v}
              type="button"
              onClick={() => onPick(v)}
              className={cn(
                "font-medium transition-all duration-150",
                layout === "desktop"
                  ? "rounded-full px-3.5 py-1.5 text-sm"
                  : "rounded-lg border px-3 py-2 text-xs sm:text-sm",
                selected
                  ? layout === "desktop"
                    ? "bg-red-600 text-white shadow-sm shadow-red-600/30 ring-2 ring-red-600/20"
                    : "border-[#F21A1A] bg-[#F21A1A] font-semibold text-white"
                  : layout === "desktop"
                    ? "border border-gray-200/90 bg-white text-gray-700 hover:border-red-300 hover:bg-red-50/80 dark:border-white/12 dark:bg-darkBlue-203/80 dark:text-white/90 dark:hover:border-red-400/40"
                    : "border-gray-300/30 bg-[#D9D9D9] text-gray-900 dark:border-white/30 dark:bg-darkBlue-003 dark:text-white",
              )}
            >
              {labels[i]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Shared filter groups for mobile sheet and desktop panel. */
export function AllJobsFilterFields({
  value,
  onChange,
  layout = "sheet",
}: AllJobsFilterFieldsProps) {
  const set = (patch: Partial<AllJobsAdvancedFilter>) => {
    onChange({ ...value, ...patch });
  };

  const sections = (
    <>
      <FilterSection
        title="Proposal Acceptance"
        current={value.proposalAcceptance}
        values={["all", "open", "closed"]}
        labels={["All", "Open", "Closed"]}
        onPick={(v) => set({ proposalAcceptance: v === "all" ? null : v })}
        layout={layout}
      />
      <FilterSection
        title="Job Type"
        current={value.jobType}
        values={["all", "fixed", "hourly"]}
        labels={["All", "Fixed Price", "Hourly"]}
        onPick={(v) => set({ jobType: v === "all" ? null : v })}
        layout={layout}
      />
      <FilterSection
        title="Urgency"
        current={value.urgency}
        values={["all", "normal", "urgent"]}
        labels={["All", "Normal", "Urgent"]}
        onPick={(v) => set({ urgency: v === "all" ? null : v })}
        layout={layout}
      />
      <FilterSection
        title="Completion Status"
        current={value.completionStatus}
        values={["all", "open", "in_progress", "completed"]}
        labels={["All", "Open", "In Progress", "Completed"]}
        onPick={(v) => set({ completionStatus: v === "all" ? null : v })}
        layout={layout}
      />
    </>
  );

  if (layout === "desktop") {
    return (
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4 xl:gap-8">{sections}</div>
    );
  }

  return <div className="space-y-5">{sections}</div>;
}
