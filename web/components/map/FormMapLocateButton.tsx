"use client";

import { Locate } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type FormMapLocateButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  /** Defaults to Flutter explore map copy */
  ariaLabel?: string;
};

/**
 * Flutter `custom_google_map.dart`: top-right, white 40×40, rounded 10px, red #F21A1A icon.
 * Keep inside the map container with `z-[1001]` so it stays above tiles/markers.
 */
export function FormMapLocateButton({
  onClick,
  disabled = false,
  isLoading = false,
  className,
  ariaLabel = "Center on my location",
}: FormMapLocateButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        "pointer-events-auto flex h-10 w-10 items-center justify-center rounded-[10px] bg-white shadow-md transition hover:bg-gray-50 disabled:cursor-wait disabled:opacity-70",
        className
      )}
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
      aria-label={ariaLabel}
      aria-busy={isLoading}
    >
      <Locate
        className={cn("h-5 w-5", isLoading && "animate-pulse")}
        style={{ color: "#F21A1A" }}
      />
    </button>
  );
}
