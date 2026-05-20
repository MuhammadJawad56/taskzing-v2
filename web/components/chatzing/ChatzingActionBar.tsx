"use client";

import React from "react";
import {
  CHATZING_QUICK_ACTIONS,
  getQuickActionLabel,
  type ChatzingQuickActionId,
} from "@/lib/chatzing/quickActions";
import { cn } from "@/lib/utils/cn";

type Props = {
  locale: "en" | "fr";
  disabled?: boolean;
  onAction: (id: ChatzingQuickActionId) => void;
  className?: string;
};

export function ChatzingActionBar({
  locale,
  disabled,
  onAction,
  className,
}: Props) {
  return (
    <div
      className={cn("flex gap-2 overflow-x-auto pb-1", className)}
      role="toolbar"
      aria-label={locale === "fr" ? "Actions ChatZing" : "ChatZing actions"}
    >
      {CHATZING_QUICK_ACTIONS.map(({ id, icon: Icon }) => (
          <button
            key={id}
            type="button"
            disabled={disabled}
            onClick={() => onAction(id)}
            className={cn(
              "flex flex-shrink-0 flex-col items-center gap-1 rounded-xl border px-3 py-2 min-w-[4.5rem] transition-colors",
              "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-darkBlue-203/40 dark:text-gray-100 dark:hover:bg-darkBlue-203",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            aria-label={getQuickActionLabel(id, locale)}
          >
            <Icon className="h-5 w-5" strokeWidth={2} />
            <span className="text-[10px] font-medium leading-tight text-center max-w-[4.5rem]">
              {getQuickActionLabel(id, locale)}
            </span>
          </button>
      ))}
    </div>
  );
}
