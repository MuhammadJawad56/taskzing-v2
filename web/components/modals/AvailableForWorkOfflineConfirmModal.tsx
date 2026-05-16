"use client";

import React from "react";

interface AvailableForWorkOfflineConfirmModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Confirms before setting “Available for work” to offline.
 * Shell + typography match `edit-profile` pending-approval dialog; actions match `OnlineStatusNoticeModal`.
 */
export function AvailableForWorkOfflineConfirmModal({
  open,
  onCancel,
  onConfirm,
}: AvailableForWorkOfflineConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="offline-confirm-title"
        aria-describedby="offline-confirm-desc"
        className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-darkBlue-013"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="offline-confirm-title"
          className="text-lg font-semibold text-gray-900 dark:text-white"
        >
          Go offline?
        </h2>
        <p
          id="offline-confirm-desc"
          className="mt-3 text-sm leading-relaxed text-gray-700 dark:text-white/95"
        >
          You will appear offline to clients. You can turn Available for work back on anytime.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-[#F21A1A] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
