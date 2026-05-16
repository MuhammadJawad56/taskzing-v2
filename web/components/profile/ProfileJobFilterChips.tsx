"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";
import type { ProfileJobFilter } from "@/lib/profile/profileHelpers";

export type ProfileJobFilterOption = {
  id: ProfileJobFilter;
  label: string;
};

type ProfileJobFilterChipsProps = {
  value: ProfileJobFilter;
  options: ProfileJobFilterOption[];
  onChange: (value: ProfileJobFilter) => void;
  className?: string;
};

/** Flutter profile jobs filter chips — pill shape, red selected, navy unselected. */
export function ProfileJobFilterChips({
  value,
  options,
  onChange,
  className,
}: ProfileJobFilterChipsProps) {
  return (
    <div
      className={cn(
        "flex gap-2.5 overflow-x-auto px-4 py-3 [-ms-overflow-style:none] [scrollbar-width:none] lg:px-0 [&::-webkit-scrollbar]:hidden",
        className,
      )}
      role="tablist"
      aria-label="Job filters"
    >
      {options.map((opt) => {
        const selected = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(opt.id)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-xs font-semibold text-white transition-colors sm:text-sm",
              selected
                ? "bg-[#F21A1A] text-white shadow-sm"
                : "bg-[#E7E9EE] text-darkBlue-203 hover:bg-paleBlue-2 dark:bg-darkBlue-343 dark:text-white dark:hover:bg-darkBlue-203",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
