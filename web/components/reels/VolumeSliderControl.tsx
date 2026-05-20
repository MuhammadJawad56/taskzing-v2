"use client";

import React, { useRef } from "react";
import { Volume1, Volume2, VolumeX } from "lucide-react";

function volumeIcon(volume: number, className: string) {
  if (volume === 0) return <VolumeX className={className} />;
  if (volume < 0.34) return <Volume1 className={className} />;
  return <Volume2 className={className} />;
}

/** Mute / unmute toggle for reels (no volume slider). */
export function VolumeSliderControl({
  variant,
  volume,
  onVolumeChange,
  t,
  className = "",
}: {
  variant: "chrome" | "rail";
  volume: number;
  onVolumeChange: (level: number) => void;
  t: (key: string) => string;
  className?: string;
  /** @deprecated Popover removed; kept for call-site compatibility. */
  popoverSide?: "auto" | "left" | "below";
}) {
  const lastNonZeroRef = useRef(volume > 0 ? volume : 1);
  const muted = volume === 0;

  if (volume > 0) lastNonZeroRef.current = volume;

  const chromeBtn =
    "flex h-[38px] w-[38px] items-center justify-center rounded-full border border-white/20 bg-black/30";
  const railBtn =
    "flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/30";
  const btnClass = variant === "chrome" ? chromeBtn : railBtn;
  const iconClass = variant === "chrome" ? "h-5 w-5 text-white" : "h-6 w-6 text-white";

  const toggleMute = () => {
    if (muted) {
      onVolumeChange(lastNonZeroRef.current > 0 ? lastNonZeroRef.current : 1);
    } else {
      onVolumeChange(0);
    }
  };

  const label = muted ? t("reels.unmute") : t("reels.mute");

  return (
    <button
      type="button"
      onClick={toggleMute}
      className={`pointer-events-auto ${btnClass} ${className}`}
      aria-label={label}
      title={label}
    >
      {volumeIcon(volume, iconClass)}
    </button>
  );
}
