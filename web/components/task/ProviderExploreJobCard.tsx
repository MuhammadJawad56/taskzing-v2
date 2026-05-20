"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Bookmark, Heart, Loader2, MapPin } from "lucide-react";
import { Task } from "@/lib/types/task";
import { cn } from "@/lib/utils/cn";

const PLACEHOLDER = "/images/placeholder_image.png";
const RED = "#E53E3E";

export interface ProviderExploreJobCardProps {
  task: Task;
  saved: boolean;
  onToggleSave: (e: React.MouseEvent) => void;
  onApply?: (task: Task, e: React.MouseEvent) => void;
  liked?: boolean;
  likesCount?: number;
  likePending?: boolean;
  onToggleLike?: (e: React.MouseEvent) => void;
}

export function ProviderExploreJobCard({
  task,
  saved,
  onToggleSave,
  onApply,
  liked = false,
  likesCount = 0,
  likePending = false,
  onToggleLike,
}: ProviderExploreJobCardProps) {
  const [imgLoading, setImgLoading] = useState(true);
  const imageSrc = task.photos?.[0] || PLACEHOLDER;

  const showProfessional =
    task.posterType === "company" ||
    task.posterType === "instore" ||
    (task.tags || []).some((t) => /professional/i.test(t)) ||
    (task.skills || []).some((s) => /professional/i.test(s));
  const showUrgent = task.urgency === "urgent" || task.urgency === "high";

  const priceLine =
    task.jobType === "hourly"
      ? `$${task.price.toFixed(1)}/hr HOURLY`
      : `$${task.price.toFixed(1)} FIXED Rate`;

  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.08)] dark:border-transparent dark:bg-darkBlue-013 dark:shadow-[0_4px_4px_rgba(0,0,0,0.25)]">
      <Link href={`/job-details/${task.jobId}`} className="min-w-0 flex-1">
        <div className="relative aspect-[5/3] w-full bg-gray-100 dark:bg-gray-800">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleLike?.(e);
            }}
            disabled={likePending}
            aria-label={liked ? "Unlike job" : "Like job"}
            className="absolute right-2 top-2 z-10 inline-flex h-8 min-w-[2.4rem] items-center justify-center gap-1 rounded-full bg-black/35 px-2 text-white backdrop-blur-sm transition hover:bg-black/50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Heart className={cn("h-4 w-4", liked ? "fill-[#FF2D2D] text-[#FF2D2D]" : "text-white")} />
            <span className="text-[10px] font-semibold leading-none text-white">{Math.max(0, likesCount)}</span>
          </button>
          {imgLoading ? (
            <div className="absolute inset-0 z-[1] flex items-center justify-center bg-gray-100/90 dark:bg-gray-800/90">
              <Loader2 className="h-8 w-8 animate-spin text-sky-500" aria-hidden />
            </div>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt=""
            className="h-full w-full object-cover"
            onLoad={() => setImgLoading(false)}
            onError={(e) => {
              (e.target as HTMLImageElement).src = PLACEHOLDER;
              setImgLoading(false);
            }}
          />
        </div>

        <div className="min-w-0 space-y-1.5 px-2 pb-1.5 pt-2">
          {(showProfessional || showUrgent) && (
            <div className="flex flex-wrap gap-1">
              {showProfessional ? (
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-[#1A202C] dark:bg-sky-900/40 dark:text-sky-100">
                  Professional
                </span>
              ) : null}
              {showUrgent ? (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ backgroundColor: "rgba(229, 62, 62, 0.12)", color: RED }}
                >
                  Urgent
                </span>
              ) : null}
            </div>
          )}

          <h3 className="line-clamp-2 text-left text-sm font-bold leading-snug text-[#1A202C] dark:text-white">
            {task.title}
          </h3>

          <div className="flex min-w-0 items-start gap-1 text-left">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
            <p className="min-w-0 truncate text-[11px] leading-snug text-gray-500 dark:text-white/55">
              {task.address || "Location not specified"}
            </p>
          </div>

          <p className="text-left text-sm font-bold" style={{ color: RED }}>
            {priceLine}
          </p>
        </div>
      </Link>

      <div className="mt-auto flex gap-1.5 border-t border-gray-100 px-2 pb-2 pt-1.5 dark:border-white/10">
        <button
          type="button"
          onClick={onToggleSave}
          className={cn(
            "flex min-h-[38px] flex-1 items-center justify-center gap-1 rounded-lg border text-xs font-semibold transition",
            saved
              ? "border-[#1A202C] bg-sky-50 text-[#1A202C] dark:border-blue-400/70 dark:bg-darkBlue-203 dark:text-blue-300"
              : "border-gray-200 bg-slate-50 text-[#1A202C] hover:bg-slate-100 dark:border-transparent dark:bg-darkBlue-203 dark:text-white dark:hover:bg-darkBlue-343",
          )}
        >
          <Bookmark className={cn("h-4 w-4", saved && "fill-current")} strokeWidth={2} />
          Save
        </button>
        {onApply ? (
          <button
            type="button"
            onClick={(e) => onApply(task, e)}
            className="flex min-h-[38px] flex-1 items-center justify-center rounded-lg text-center text-xs font-bold text-white transition hover:opacity-95"
            style={{ backgroundColor: RED }}
          >
            Apply
          </button>
        ) : null}
      </div>
    </article>
  );
}
