"use client";

import { Satellite, Sun } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  FLUTTER_MAP_COLORS,
  FLUTTER_MAP_CONTROL_CLASS,
  FLUTTER_MAP_CONTROL_SHADOW,
  type FlutterMapStyle,
} from "@/lib/map/flutterMapTheme";
import { FormMapLocateButton } from "@/components/map/FormMapLocateButton";

type FlutterMapControlsProps = {
  mapStyle: FlutterMapStyle;
  onLocate: () => void;
  onCycleStyle: () => void;
  isLocating?: boolean;
  className?: string;
};

/**
 * Flutter `custom_google_map.dart` overlay: top-right column — locate + map style.
 * Use on every map surface (explore, showcase picker, post job picker).
 */
export function FlutterMapControls({
  mapStyle,
  onLocate,
  onCycleStyle,
  isLocating = false,
  className,
}: FlutterMapControlsProps) {
  const isSatellite = mapStyle === "satellite";
  const StyleIcon = isSatellite ? Sun : Satellite;

  return (
    <div
      className={cn(
        "pointer-events-auto absolute right-4 top-4 z-[1001] flex flex-col gap-3",
        className
      )}
    >
      <FormMapLocateButton onClick={onLocate} isLoading={isLocating} />
      <button
        type="button"
        onClick={onCycleStyle}
        className={FLUTTER_MAP_CONTROL_CLASS}
        style={{ boxShadow: FLUTTER_MAP_CONTROL_SHADOW }}
        aria-label={isSatellite ? "Switch to map view" : "Switch to satellite view"}
      >
        <StyleIcon className="h-5 w-5" style={{ color: FLUTTER_MAP_COLORS.controlIcon }} />
      </button>
    </div>
  );
}
