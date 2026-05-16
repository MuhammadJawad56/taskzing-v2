"use client";

import React from "react";
import { AlertCircle, AlertTriangle } from "lucide-react";

interface OnlineStatusNoticeModalProps {
  open: boolean;
  doNotShowAgain: boolean;
  onDoNotShowAgainChange: (checked: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function OnlineStatusNoticeModal({
  open,
  doNotShowAgain,
  onDoNotShowAgainChange,
  onCancel,
  onConfirm,
}: OnlineStatusNoticeModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-darkBlue-013">
        <div className="mb-4 flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-500" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">Status Update</h2>
        </div>

        <p className="mb-3 text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">Your status is now online.</p>
        <p className="text-base font-semibold text-gray-800 dark:text-gray-200">Please make sure to:</p>
        <ul className="mb-5 ml-6 list-disc text-base text-gray-800 dark:text-gray-200">
          <li>Respond to all messages promptly</li>
          <li>Do your job to the best of your ability</li>
        </ul>

        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-400/40 dark:bg-amber-900/20">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <p className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">Important Warning:</p>
          </div>
          <p className="mb-2 text-base text-gray-800 dark:text-gray-200">
            If you fail to respond to clients or change your location repeatedly, you will be responsible for the
            consequences including:
          </p>
          <ul className="ml-6 list-disc text-base text-gray-800 dark:text-gray-200">
            <li>Termination of account</li>
            <li>Blacklist of email</li>
          </ul>
        </div>

        <label className="mb-7 flex items-center gap-3 text-base text-gray-800 dark:text-gray-200">
          <input
            type="checkbox"
            checked={doNotShowAgain}
            onChange={(e) => onDoNotShowAgainChange(e.target.checked)}
            className="h-6 w-6 rounded border-gray-300 text-red-500 focus:ring-red-500"
          />
          <span>Do not show again</span>
        </label>

        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-6 py-2.5 text-lg font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-2xl bg-red-500 px-7 py-2.5 text-lg font-bold text-white transition-colors hover:bg-red-600"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

