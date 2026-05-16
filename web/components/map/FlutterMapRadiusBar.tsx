"use client";

import {
  FLUTTER_MAP_COLORS,
} from "@/lib/map/flutterMapTheme";

type FlutterMapRadiusBarProps = {
  radiusKm: number;
  radiusOptions: readonly number[];
  onRadiusChange: (radiusKm: number) => void;
};

/** Flutter explore map bottom radius chip row. */
export function FlutterMapRadiusBar({
  radiusKm,
  radiusOptions,
  onRadiusChange,
}: FlutterMapRadiusBarProps) {
  return (
    <div className="pointer-events-auto absolute bottom-6 left-1/2 z-[1001] w-[calc(100%-2.5rem)] max-w-[360px] -translate-x-1/2 rounded-2xl bg-white/95 px-3 py-2 shadow-[0_8px_20px_rgba(0,0,0,0.2)] backdrop-blur-sm dark:bg-darkBlue-203/95">
      <div className="flex items-center gap-2">
        <span className="shrink-0 pl-1 text-sm font-semibold text-[#1A202C] dark:text-white">
          Radius
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {radiusOptions.map((optionKm) => {
            const active = optionKm === radiusKm;
            return (
              <button
                key={optionKm}
                type="button"
                onClick={() => onRadiusChange(optionKm)}
                className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition"
                style={
                  active
                    ? {
                        backgroundColor: FLUTTER_MAP_COLORS.radiusActiveBg,
                        color: FLUTTER_MAP_COLORS.radiusActiveText,
                      }
                    : {
                        backgroundColor: FLUTTER_MAP_COLORS.radiusIdleBg,
                        color: FLUTTER_MAP_COLORS.radiusIdleText,
                      }
                }
              >
                {optionKm} km
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
