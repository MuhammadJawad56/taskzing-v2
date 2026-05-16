"use client";

import React from "react";
import { Bookmark, Briefcase } from "lucide-react";
import type { Task } from "@/lib/types/task";

const RED = "#E53E3E";

export interface RemoveSavedJobModalProps {
  job: Task | null;
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function RemoveSavedJobModal({ job, open, onCancel, onConfirm }: RemoveSavedJobModalProps) {
  if (!open || !job) return null;

  const title = job.title?.trim() || "Untitled job";

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="remove-saved-job-title">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        aria-label="Close"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:border dark:border-white/10 dark:bg-darkBlue-003">
        <div className="border-b border-gray-100 px-5 pb-4 pt-5 dark:border-white/10">
          <div className="flex items-center gap-3">
            <Bookmark className="h-6 w-6 shrink-0 fill-red-500 text-red-500" aria-hidden />
            <h2 id="remove-saved-job-title" className="text-lg font-bold leading-snug text-gray-900 dark:text-white">
              Remove from Saved
            </h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-gray-900 dark:text-gray-100">Remove job confirmation</p>
        </div>

        <div className="px-5 py-4">
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-darkBlue-203/80">
            <Briefcase className="h-5 w-5 shrink-0 text-gray-800 dark:text-gray-200" aria-hidden />
            <span className="min-w-0 flex-1 text-sm font-semibold text-gray-900 dark:text-white">{title}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-5 py-4 dark:border-white/10">
          <button
            type="button"
            onClick={onCancel}
            className="px-2 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold lowercase text-white shadow-sm transition-opacity hover:opacity-95"
            style={{ backgroundColor: RED }}
          >
            remove
          </button>
        </div>
      </div>
    </div>
  );
}
