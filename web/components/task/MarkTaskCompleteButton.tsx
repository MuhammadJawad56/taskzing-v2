"use client";

import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { completeJob, JobCompletionError } from "@/lib/api/jobApplications";
import { useAuth } from "@/lib/api/AuthContext";
import type { Task } from "@/lib/types/task";

export interface MarkTaskCompleteButtonProps {
  task: Task;
  onCompleted?: () => void;
  size?: "compact" | "default";
}


export function MarkTaskCompleteButton({
  task,
  onCompleted,
  size = "compact",
}: MarkTaskCompleteButtonProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alreadyCompleted = task.completionStatus === "completed";
  const canComplete =
    !alreadyCompleted &&
    Boolean(task.contractorId && task.contractorId.length > 0) &&
    Boolean(user && (user.uid === task.contractorId || user.uid === task.clientId));

  if (!canComplete) return null;

  const handleConfirm = async () => {
    if (!user) return;
    setSubmitting(true);
    setError(null);
    try {
      await completeJob({
        jobId: task.jobId,
        completionNotes: notes,
        requesterId: user.uid,
      });
      setOpen(false);
      setNotes("");
      onCompleted?.();
    } catch (err) {
      const message =
        err instanceof JobCompletionError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to mark as completed";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const buttonSize =
    size === "compact" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={`inline-flex items-center gap-1.5 rounded-full bg-green-600 text-white font-medium hover:bg-green-700 transition-colors ${buttonSize}`}
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        Mark Completed
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[260] flex items-center justify-center p-4"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div
            className="relative bg-white dark:bg-darkBlue-003 rounded-xl w-full max-w-md shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Mark task as completed
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                {task.title}
              </p>

              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Completion notes (optional)
              </label>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything the client should know about the finished work."
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-darkBlue-203 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />

              {error ? (
                <p className="mt-3 text-sm text-red-500" role="alert">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="flex justify-end gap-3 px-6 pb-6">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 font-medium hover:text-gray-800 dark:hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                {submitting ? "Completing..." : "Confirm Complete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
