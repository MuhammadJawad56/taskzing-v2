"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Bookmark, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Task } from "@/lib/types/task";

export function formatExploreJobPrice(task: Task): string {
  if (task.jobType === "fixed") {
    return `$${task.fixedPrice || task.price} FIXED Rate`;
  }
  return `$${task.hourlyRate || task.price}/hr`;
}

export function getExploreJobCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    "Home Services": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    Delivery: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    "Tech Services": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    "Personal Care": "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
    Education: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
    Cleaning: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
    Plumbing: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    Electrical: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  };
  return colors[category] || "bg-gray-100 text-gray-700 dark:bg-blue-900/45 dark:text-blue-100";
}

export interface ExploreJobCardProps {
  job: Task;
  onApply: (job: Task) => void;
  /** When set, called instead of navigating to job details when the outer card is clicked */
  onCardNavigate?: (job: Task) => void;
  /** When set, called when Save is clicked (e.g. guest gate on marketing home) */
  onSave?: (job: Task) => void;
  liked?: boolean;
  likesCount?: number;
  likePending?: boolean;
  onLike?: (job: Task) => void;
  /** Hide the top-right like count pill (e.g. marketing home). */
  hideLikeBadge?: boolean;
}

/** Same tile as `/explore` job grid (image carousel, category tags, Save / Apply). */
export function ExploreJobCard({
  job,
  onApply,
  onCardNavigate,
  onSave,
  liked = false,
  likesCount = 0,
  likePending = false,
  onLike,
  hideLikeBadge = false,
}: ExploreJobCardProps) {
  const router = useRouter();
  const images = job.photos || [];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    setCurrentImageIndex(0);
  }, [job.jobId]);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [images.length, job.jobId]);

  const imageUrl = images[currentImageIndex] || null;

  const handleCardClick = () => {
    if (onCardNavigate) {
      onCardNavigate(job);
      return;
    }
    router.push(`/job-details/${job.jobId}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-lg dark:border-transparent dark:bg-darkBlue-013 dark:shadow-[0_4px_4px_rgba(0,0,0,0.25)]"
    >
      <div className="relative h-40 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800">
        {!hideLikeBadge ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onLike?.(job);
            }}
            disabled={likePending}
            aria-label={liked ? "Unlike job" : "Like job"}
            className="absolute right-2 top-2 z-10 inline-flex h-8 min-w-[2.4rem] items-center justify-center gap-1 rounded-full bg-black/35 px-2 text-white backdrop-blur-sm transition hover:bg-black/50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <ThumbsUp className={cn("h-4 w-4", liked ? "text-[#FF2D2D]" : "text-white")} />
            <span className="text-[10px] font-semibold leading-none text-white">{Math.max(0, likesCount)}</span>
          </button>
        ) : null}
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={job.title}
            className="h-full w-full object-cover transition-opacity duration-500"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-2xl font-bold text-red-500">Task</span>
          </div>
        )}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 transform gap-1">
            {images.slice(0, 3).map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  index === currentImageIndex ? "w-3 bg-red-500" : "w-1.5 bg-white/50"
                )}
              />
            ))}
          </div>
        )}
      </div>

      <div className="p-3" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex flex-wrap gap-2">
          {job.category && (
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium",
                getExploreJobCategoryColor(job.category)
              )}
            >
              {job.category.length > 15 ? `${job.category.substring(0, 15)}...` : job.category}
            </span>
          )}
          {job.urgency === "urgent" && (
            <span className="rounded-full bg-red-500 px-2.5 py-1 text-xs font-medium text-white">
              Urgent
            </span>
          )}
          {job.jobType === "fixed" && job.estimatedDuration && (
            <span className="rounded-full bg-red-500 px-2.5 py-1 text-xs font-medium text-white">
              {job.estimatedDuration} Fixed hours
            </span>
          )}
        </div>

        <h3 className="mb-2 line-clamp-1 text-base font-semibold text-gray-900 dark:text-white">{job.title}</h3>

        <div className="mb-2 flex items-start gap-1.5">
          <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-500 dark:text-white/55" />
          <p className="line-clamp-2 text-xs text-gray-600 dark:text-white/55">{job.address}</p>
        </div>

        <p className="mb-3 text-sm font-semibold text-red-500">{formatExploreJobPrice(job)}</p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSave?.(job);
            }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-transparent dark:bg-darkBlue-203 dark:text-white dark:hover:bg-darkBlue-343"
          >
            <Bookmark className="h-4 w-4" />
            Save
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onApply(job);
            }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
