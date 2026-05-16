"use client";

import React from "react";
import { MapPin } from "lucide-react";

export function EnableLocationModal({
  open,
  loading,
  error,
  onEnable,
  onLater,
}: {
  open: boolean;
  loading?: boolean;
  error?: string;
  onEnable: () => void;
  onLater: () => void;
}) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[220] bg-black/45 backdrop-blur-sm" onClick={onLater} />
      <div className="fixed inset-0 z-[221] flex items-center justify-center p-4">
        <div className="w-full max-w-[26rem] rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-2xl dark:border-white/15 dark:bg-darkBlue-013">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/20">
            <MapPin className="h-8 w-8 text-[#F21A1A]" />
          </div>
          <p className="mx-auto mb-5 max-w-sm text-base font-semibold leading-snug text-gray-900 dark:text-white">
            To help you find the best local jobs and contractors, enable location access.
          </p>
          {error ? (
            <p className="mb-3 text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
          ) : null}
          <button
            type="button"
            onClick={onEnable}
            disabled={loading}
            className="mx-auto inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#F21A1A] px-6 py-2.5 text-base font-semibold text-white transition-colors hover:bg-[#d91515] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Enabling..." : "Enable Location"}
          </button>
          <button
            type="button"
            onClick={onLater}
            className="mt-3 block w-full text-center text-xl font-medium text-gray-500 transition-colors hover:text-gray-700 dark:text-white/70 dark:hover:text-white"
          >
            Later
          </button>
        </div>
      </div>
    </>
  );
}

