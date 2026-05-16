"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { History, MapPin, Trash2, X } from "lucide-react";
import { TaskCard } from "@/components/task/TaskCard";
import { Card, CardContent } from "@/components/ui/Card";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Task } from "@/lib/types/task";
import { ShowcaseItem, getShowcaseItem } from "@/lib/api/showcase";
import { getJobById } from "@/lib/api/jobs";
import {
  RecentlyViewedEntry,
  clearRecentlyViewed,
  removeRecentlyViewed,
  useRecentlyViewed,
} from "@/lib/utils/recentlyViewed";

type LoadedItem =
  | { entry: RecentlyViewedEntry; kind: "job"; data: Task }
  | { entry: RecentlyViewedEntry; kind: "showcase"; data: ShowcaseItem };

const fallbackImage = "/images/placeholder_image.png";
const RED = "#E53E3E";

function ShowcaseCard({
  item,
  providerHint,
  onRemove,
}: {
  item: ShowcaseItem;
  providerHint?: string;
  onRemove: () => void;
}) {
  const href = `/work-details/${item.id}${
    providerHint ? `?provider=${encodeURIComponent(providerHint)}` : ""
  }`;
  const cover = item.imageUrls?.[0] || fallbackImage;
  const skills = item.skills
    ? item.skills.split(",").map((s) => s.trim()).filter(Boolean)
    : item.tags || [];

  return (
    <div className="group relative">
      <Link href={href}>
        <Card className="h-full cursor-pointer transition-shadow hover:shadow-lg">
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-t-xl bg-gray-100 dark:bg-gray-800">
            <img
              src={cover}
              alt={item.title || "Showcase"}
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = fallbackImage;
              }}
            />
          </div>
          <CardContent className="p-4">
            <h3 className="mb-2 line-clamp-2 pr-11 text-base font-semibold text-theme-primaryText dark:text-white">
              {item.title || "Untitled"}
            </h3>
            {skills.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1">
                {skills.slice(0, 3).map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700 dark:bg-white/10 dark:text-white/80"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-start gap-1 text-sm text-theme-accent4">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span className="line-clamp-1">
                {item.location || "Remote / Unspecified"}
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove from recently viewed"
        className="absolute right-2 top-2 z-10 flex size-8 items-center justify-center rounded-full bg-white/90 text-gray-600 shadow-sm transition-colors hover:bg-white hover:text-red-600 dark:bg-black/60 dark:text-white dark:hover:text-red-400"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function JobCardWithRemove({ task, onRemove }: { task: Task; onRemove: () => void }) {
  return (
    <div className="group relative">
      <TaskCard task={task} reserveCloseSpace />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove from recently viewed"
        className="absolute right-2 top-2 z-10 flex size-8 items-center justify-center rounded-full bg-white/90 text-gray-600 shadow-sm transition-colors hover:bg-white hover:text-red-600 dark:bg-black/60 dark:text-white dark:hover:text-red-400"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function RecentlyViewedPage() {
  const { entries } = useRecentlyViewed();
  const [items, setItems] = useState<LoadedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);
      const results = await Promise.all(
        entries.map(async (entry): Promise<LoadedItem | null> => {
          try {
            if (entry.type === "job") {
              const data = await getJobById(entry.id);
              return data ? { entry, kind: "job", data } : null;
            }
            const data = await getShowcaseItem(entry.id, entry.providerHint);
            return data ? { entry, kind: "showcase", data } : null;
          } catch (err) {
            console.warn(
              `Failed to load recently-viewed ${entry.type} ${entry.id}`,
              err,
            );
            return null;
          }
        }),
      );
      if (!alive) return;
      setItems(results.filter((r): r is LoadedItem => r !== null));
      setLoading(false);
    };

    if (entries.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    void load();
    return () => {
      alive = false;
    };
  }, [entries]);

  const handleRemove = (entry: RecentlyViewedEntry) => {
    removeRecentlyViewed(entry.id, entry.type);
  };

  const handleClearAll = () => {
    if (items.length === 0) return;
    setIsClearModalOpen(true);
  };

  const handleConfirmClearAll = () => {
    clearRecentlyViewed();
    setIsClearModalOpen(false);
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-theme-primaryText dark:text-white sm:text-3xl">
            Recently Viewed
          </h1>
          {items.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            >
              <Trash2 className="h-4 w-4" />
              Clear all
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="h-64 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-4 p-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5">
                <History className="h-8 w-8 text-gray-400 dark:text-white/60" aria-hidden />
              </div>
              <p className="text-base font-semibold text-theme-primaryText dark:text-white">
                No recently viewed listings
              </p>
              <p className="max-w-sm text-sm text-theme-accent4">
                Listings you open from the home or explore pages will show up here so you can find them again quickly.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) =>
              item.kind === "job" ? (
                <JobCardWithRemove
                  key={`job-${item.data.jobId}`}
                  task={item.data}
                  onRemove={() => handleRemove(item.entry)}
                />
              ) : (
                <ShowcaseCard
                  key={`showcase-${item.data.id}`}
                  item={item.data}
                  providerHint={item.entry.providerHint}
                  onRemove={() => handleRemove(item.entry)}
                />
              ),
            )}
          </div>
        )}
      </div>
      {isClearModalOpen ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-recently-viewed-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
            aria-label="Close"
            onClick={() => setIsClearModalOpen(false)}
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:border dark:border-white/10 dark:bg-darkBlue-003">
            <div className="border-b border-gray-100 px-5 pb-4 pt-5 dark:border-white/10">
              <div className="flex items-center gap-3">
                <Trash2 className="h-6 w-6 shrink-0 fill-red-500 text-red-500" aria-hidden />
                <h2 id="clear-recently-viewed-title" className="text-lg font-bold leading-snug text-gray-900 dark:text-white">
                  Clear recently viewed
                </h2>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-gray-900 dark:text-gray-100">
                Are you sure you want to clear all recently viewed listings?
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-5 py-4 dark:border-white/10">
              <button
                type="button"
                onClick={() => setIsClearModalOpen(false)}
                className="px-2 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold lowercase text-white shadow-sm transition-opacity hover:opacity-95"
                style={{ backgroundColor: RED }}
              >
                clear all
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
