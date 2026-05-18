"use client";

import React, { useEffect, useRef, useState } from "react";
import { Volume1, Volume2, VolumeX } from "lucide-react";

function volumeIcon(volume: number, className: string) {
  if (volume === 0) return <VolumeX className={className} />;
  if (volume < 0.34) return <Volume1 className={className} />;
  return <Volume2 className={className} />;
}

export function VolumeSliderControl({
  variant,
  volume,
  onVolumeChange,
  t,
  className = "",
  popoverSide = "auto",
}: {
  variant: "chrome" | "rail";
  volume: number;
  onVolumeChange: (level: number) => void;
  t: (key: string) => string;
  className?: string;
  popoverSide?: "auto" | "left" | "below";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const lastNonZeroRef = useRef(volume > 0 ? volume : 1);
  const volumePct = Math.round(volume * 100);
  const muted = volume === 0;

  if (volume > 0) lastNonZeroRef.current = volume;

  const chromeBtn =
    "flex h-[38px] w-[38px] items-center justify-center rounded-full border border-white/20 bg-black/30";
  const railBtn =
    "flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/30";
  const btnClass = variant === "chrome" ? chromeBtn : railBtn;
  const iconClass = variant === "chrome" ? "h-5 w-5 text-white" : "h-6 w-6 text-white";

  const side =
    popoverSide === "auto" ? (variant === "rail" ? "left" : "below") : popoverSide;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const popoverPosition =
    side === "left"
      ? "absolute right-full top-1/2 z-30 mr-2 -translate-y-1/2"
      : "absolute right-0 top-full z-30 mt-2";

  const toggleMute = () => {
    if (muted) {
      onVolumeChange(lastNonZeroRef.current > 0 ? lastNonZeroRef.current : 0.8);
    } else {
      onVolumeChange(0);
    }
  };

  return (
    <div ref={rootRef} className={`relative pointer-events-auto ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${btnClass} ${open ? "border-white/50 bg-white/15" : ""}`}
        aria-label={t("reels.volumeControls")}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={`${muted ? t("reels.unmute") : t("reels.mute")} (${volumePct}%)`}
      >
        {volumeIcon(volume, iconClass)}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={t("reels.volumeSlider")}
          className={`${popoverPosition} w-[min(200px,calc(100vw-2rem))] rounded-2xl border border-white/20 bg-black/90 px-3.5 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.55)] backdrop-blur-md`}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-white">{t("reels.volume")}</span>
            <span className="text-xs tabular-nums text-white/70">{volumePct}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={volumePct}
            onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
            className="mb-2.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/25 accent-white [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={volumePct}
            aria-label={t("reels.volumeSlider")}
          />
          <button
            type="button"
            onClick={toggleMute}
            className="w-full text-left text-xs font-medium text-white/80 transition hover:text-white"
          >
            {muted ? t("reels.unmute") : t("reels.mute")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

