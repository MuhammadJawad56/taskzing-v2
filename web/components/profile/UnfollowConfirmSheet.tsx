"use client";

import React, { useEffect } from "react";
import { cn } from "@/lib/utils/cn";
import { useLanguage } from "@/lib/contexts/LanguageContext";

type UnfollowConfirmSheetProps = {
  open: boolean;
  displayName: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  message?: string;
};

export function UnfollowConfirmSheet({
  open,
  displayName,
  onConfirm,
  onCancel,
  confirmLabel,
  message,
}: UnfollowConfirmSheetProps) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const bodyMessage =
    message ?? t("profile.unfollowConfirmSheet").replace("{name}", displayName);
  const actionLabel = confirmLabel ?? t("profile.unfollow");

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-sheet-title"
    >
      <button
        type="button"
        className="fixed inset-0 bg-black/50"
        aria-label={t("common.cancel")}
        onClick={onCancel}
      />
      <div
        className={cn(
          "relative z-[121] w-full max-w-md rounded-t-2xl bg-white p-5 pb-8 shadow-xl",
          "dark:bg-darkBlue-013 sm:rounded-2xl",
        )}
      >
        <h2
          id="confirm-sheet-title"
          className="text-center text-lg font-semibold text-gray-900 dark:text-white"
        >
          {displayName}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-300">{bodyMessage}</p>
        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={onConfirm}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-red-600 text-base font-semibold text-white transition-colors hover:bg-red-700"
          >
            {actionLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-12 w-full items-center justify-center rounded-xl border border-gray-200 text-base font-medium text-gray-900 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-white dark:hover:bg-white/5"
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
