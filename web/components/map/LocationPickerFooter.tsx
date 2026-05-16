"use client";

import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type LocationPickerFooterProps = {
  addressLine: string;
  isResolving?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  confirmDisabled?: boolean;
  /** Shown when selection is outside allowed radius (Flutter showcase picker). */
  radiusWarning?: string;
  /** Showcase picker uses larger address typography (Flutter parity). */
  size?: "md" | "lg";
};

/** Bottom sheet for showcase / post-job location pickers (Flutter map picker sheet). */
export function LocationPickerFooter({
  addressLine,
  isResolving = false,
  onCancel,
  onConfirm,
  confirmLabel = "Use this location",
  confirmDisabled = false,
  radiusWarning,
  size = "md",
}: LocationPickerFooterProps) {
  const display =
    isResolving ? "Getting address..." : addressLine || "Pick a location on map";

  return (
    <div className="border-t border-gray-200 bg-white px-4 pb-5 pt-3 dark:border-white/10 dark:bg-darkBlue-013">
      <p
        className={cn(
          "mb-3 flex items-center gap-2 font-medium text-gray-800 dark:text-white/90",
          size === "lg" ? "text-[28px]" : "text-base"
        )}
      >
        <MapPin className={cn("shrink-0", size === "lg" ? "h-5 w-5" : "h-5 w-5")} />
        <span className={cn("truncate", size === "lg" && "text-2xl")}>{display}</span>
      </p>
      {radiusWarning ? (
        <p className="mb-3 text-sm font-medium text-[#E53E3E]">{radiusWarning}</p>
      ) : null}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-2 py-2 text-lg font-semibold text-[#1D9AD6]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={confirmDisabled}
          className="rounded-2xl bg-[#F21A1A] px-6 py-2.5 text-lg font-semibold text-white shadow-[0_4px_8px_rgba(0,0,0,0.18)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
