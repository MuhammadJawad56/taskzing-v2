"use client";

import React from "react";
import { MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type ProfileMoreOptionsButtonProps = {
  compact?: boolean;
  onClick: () => void;
  className?: string;
};

/** Flutter `_buildProfileMoreOptionsButton` — secondary bg + border. */
export function ProfileMoreOptionsButton({
  compact = true,
  onClick,
  className,
}: ProfileMoreOptionsButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="More options"
      className={cn(
        "inline-flex items-center justify-center border border-gray-300 bg-gray-100 text-gray-900 transition-colors hover:bg-gray-200 dark:border-gray-600 dark:bg-darkBlue-203 dark:text-white dark:hover:bg-darkBlue-343",
        compact ? "rounded-lg p-2" : "rounded-xl p-3",
        className,
      )}
    >
      <MoreVertical className={compact ? "h-[18px] w-[18px]" : "h-6 w-6"} />
    </button>
  );
}
