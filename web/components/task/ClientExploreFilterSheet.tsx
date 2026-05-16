"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, LocateFixed, Plus, Minus, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const RED = "#E53E3E";

export type ClientExploreFilters = {
  location: string;
  area: "" | "5km" | "25km" | "50km" | "100km";
  projectType: "all" | "hourly" | "fixed" | "both";
  postingType: string;
  rating: "" | "1" | "2" | "3" | "4" | "5";
  dayPosted: "any" | "24h" | "week" | "month" | "month+";
  priority: "all" | "low" | "normal" | "urgent";
};

export const clientExploreFiltersDefault = (): ClientExploreFilters => ({
  location: "",
  area: "",
  projectType: "all",
  postingType: "All",
  rating: "",
  dayPosted: "any",
  priority: "all",
});

const POSTING_OPTIONS = ["All", "Individual", "Company", "In Store"] as const;
const RATING_OPTIONS = ["5", "4", "3", "2", "1"] as const;
const DAY_POSTED_OPTIONS = ["any", "24h", "week", "month", "month+"] as const;

type SectionId = "location" | "area" | "projectType" | "posterType" | "rating" | "dayPosted" | "priority";

const SECTIONS: { id: SectionId; title: string }[] = [
  { id: "location", title: "Location" },
  { id: "area", title: "Area" },
  { id: "projectType", title: "Project Type" },
  { id: "posterType", title: "Poster Type" },
  { id: "rating", title: "Rating" },
  { id: "dayPosted", title: "Day Posted" },
  { id: "priority", title: "Priority" },
];

function OptionButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors",
        active
          ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-white"
          : "border-gray-300 bg-white text-gray-800 hover:bg-gray-50 dark:border-white/15 dark:bg-darkBlue-003/40 dark:text-white dark:hover:bg-white/10",
      )}
    >
      {label}
    </button>
  );
}

export interface ClientExploreFilterSheetProps {
  open: boolean;
  draft: ClientExploreFilters;
  setDraft: React.Dispatch<React.SetStateAction<ClientExploreFilters>>;
  onClose: () => void;
  onClearAll: () => void;
  onApply: () => void;
}

export function ClientExploreFilterSheet({
  open,
  draft,
  setDraft,
  onClose,
  onClearAll,
  onApply,
}: ClientExploreFilterSheetProps) {
  const [openSection, setOpenSection] = useState<SectionId | null>(null);
  const [drawerEntered, setDrawerEntered] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) setOpenSection(null);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setDrawerEntered(false);
      return;
    }
    const id = requestAnimationFrame(() => setDrawerEntered(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const toggle = (id: SectionId) => {
    setOpenSection((s) => (s === id ? null : id));
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
        {
          headers: {
            "User-Agent": "TaskZing/1.0 (client-explore filter location)",
          },
        },
      );
      if (!res.ok) return null;
      const data = await res.json();
      const addr = data?.address || {};
      const primary =
        addr.neighbourhood ||
        addr.suburb ||
        addr.city_district ||
        addr.city ||
        addr.town ||
        addr.village ||
        addr.county;
      const secondary = addr.city || addr.town || addr.village || addr.state;
      if (primary && secondary && primary !== secondary) return `${primary}, ${secondary}`;
      if (primary) return primary;
      if (data?.display_name) return String(data.display_name).split(",").slice(0, 2).join(",").trim();
      return null;
    } catch {
      return null;
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation || isFetchingLocation) {
      setLocationError("Location is unavailable on this device.");
      return;
    }

    setLocationError(null);
    setIsFetchingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const resolved = await reverseGeocode(latitude, longitude);
        setDraft((d) => ({
          ...d,
          location: resolved || "",
        }));
        if (!resolved) {
          setLocationError("Could not resolve a place name. Please refine manually.");
        }
        setIsFetchingLocation(false);
      },
      () => {
        setLocationError("Unable to fetch location. Please allow location permission.");
        setIsFetchingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  };

  if (!open || !mounted) return null;

  const drawer = (
    <div
      className="fixed inset-0 z-[100] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="client-explore-filter-sheet-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-black/45 backdrop-blur-[1px]"
        aria-label="Close"
        onClick={onClose}
      />

      <aside
        className={cn(
          "relative z-[101] flex h-full max-h-[100dvh] w-[82vw] max-w-[420px] flex-col overflow-hidden bg-[#004168] text-white shadow-[-8px_0_32px_rgba(0,0,0,0.35)] transition-transform duration-300 ease-out",
          drawerEntered ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/30 px-5 py-6">
          <h2 id="client-explore-filter-sheet-title" className="text-xl font-bold leading-none text-white">
            Filter your Choice
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-white transition-colors hover:bg-white/10"
            aria-label="Close filters"
          >
            <X className="h-7 w-7" strokeWidth={2.5} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {SECTIONS.map(({ id, title }) => {
            const expanded = openSection === id;
            return (
              <div key={id} className="overflow-hidden border-b border-white/30">
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  className="flex w-full items-center justify-between px-5 py-5 text-left"
                >
                  <span className="text-[20px] font-bold leading-none text-white">{title}</span>
                  {expanded ? (
                    <Minus className="h-6 w-6 shrink-0 text-white" aria-hidden strokeWidth={2.5} />
                  ) : (
                    <Plus className="h-6 w-6 shrink-0 text-white" aria-hidden strokeWidth={2.5} />
                  )}
                </button>

                {expanded ? (
                  <div className="space-y-3 border-t border-white/20 bg-[#003a5d] px-5 py-4">
                    {id === "location" && (
                      <div className="space-y-2">
                        <div className="relative">
                          <input
                            type="text"
                            value={draft.location}
                            onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
                            placeholder="Enter location..."
                            className="w-full rounded-lg border border-white bg-[#0a4c73] px-3 py-2.5 pr-11 text-sm text-white placeholder:text-white/70 focus:border-white focus:outline-none focus:ring-1 focus:ring-white"
                          />
                          <button
                            type="button"
                            onClick={handleUseCurrentLocation}
                            disabled={isFetchingLocation}
                            aria-label="Use current location"
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isFetchingLocation ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <LocateFixed className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        {locationError ? (
                          <p className="text-xs text-amber-600 dark:text-amber-300">{locationError}</p>
                        ) : null}
                      </div>
                    )}

                    {id === "area" && (
                      <div className="space-y-2">
                        {(
                          [
                            ["", "Any area"],
                            ["5km", "5km"],
                            ["25km", "25km"],
                            ["50km", "50km"],
                            ["100km", "100km"],
                          ] as const
                        ).map(([value, label]) => (
                          <OptionButton
                            key={label}
                            active={draft.area === value}
                            label={label}
                            onClick={() => setDraft((d) => ({ ...d, area: value }))}
                          />
                        ))}
                      </div>
                    )}

                    {id === "projectType" && (
                      <div className="space-y-2">
                        {(
                          [
                            ["all", "All types"],
                            ["hourly", "Hourly"],
                            ["fixed", "Fixed"],
                            ["both", "Both"],
                          ] as const
                        ).map(([value, label]) => (
                          <OptionButton
                            key={value}
                            active={draft.projectType === value}
                            label={label}
                            onClick={() => setDraft((d) => ({ ...d, projectType: value }))}
                          />
                        ))}
                      </div>
                    )}

                    {id === "posterType" && (
                      <div className="space-y-2">
                        {POSTING_OPTIONS.map((label) => (
                          <OptionButton
                            key={label}
                            active={draft.postingType === label}
                            label={label}
                            onClick={() => setDraft((d) => ({ ...d, postingType: label }))}
                          />
                        ))}
                      </div>
                    )}

                    {id === "rating" && (
                      <div className="space-y-2">
                        {RATING_OPTIONS.map((label) => (
                          <OptionButton
                            key={label}
                            active={draft.rating === label}
                            label={`${label} Stars`}
                            onClick={() =>
                              setDraft((d) => ({ ...d, rating: d.rating === label ? "" : label }))
                            }
                          />
                        ))}
                      </div>
                    )}

                    {id === "dayPosted" && (
                      <div className="space-y-2">
                        {DAY_POSTED_OPTIONS.map((label) => (
                          <OptionButton
                            key={label}
                            active={draft.dayPosted === label}
                            label={
                              label === "any"
                                ? "Any time"
                                : label === "24h"
                                  ? "Last 24 hours"
                                  : label === "week"
                                    ? "Last week"
                                    : label === "month"
                                      ? "Last month"
                                      : "More than 1 month"
                            }
                            onClick={() => setDraft((d) => ({ ...d, dayPosted: label }))}
                          />
                        ))}
                      </div>
                    )}

                    {id === "priority" && (
                      <div className="space-y-2">
                        {(
                          [
                            ["all", "All"],
                            ["low", "Low"],
                            ["normal", "Normal"],
                            ["urgent", "Urgent"],
                          ] as const
                        ).map(([value, label]) => (
                          <OptionButton
                            key={value}
                            active={draft.priority === value}
                            label={label}
                            onClick={() => setDraft((d) => ({ ...d, priority: value }))}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="shrink-0 space-y-3 border-t border-white/30 bg-[#004168] px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClearAll}
            className="w-full rounded-2xl border border-white bg-transparent py-3 text-center text-base font-semibold text-white transition-colors hover:bg-white/10"
          >
            Clear All
          </button>
          <button
            type="button"
            onClick={onApply}
            className="w-full rounded-2xl py-3 text-center text-base font-bold text-white shadow-sm transition-opacity hover:opacity-95"
            style={{ backgroundColor: RED }}
          >
            Apply Filter
          </button>
        </div>
      </aside>
    </div>
  );

  return createPortal(drawer, document.body);
}
