"use client";

import React, { useEffect } from "react";
import { Bookmark, QrCode } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useLanguage } from "@/lib/contexts/LanguageContext";

type ProfileMoreOptionsSheetProps = {
  open: boolean;
  isOwnProfile: boolean;
  isSaved: boolean;
  saving?: boolean;
  onClose: () => void;
  onToggleSave?: () => void;
  onShowQr: () => void;
};

export function ProfileMoreOptionsSheet({
  open,
  isOwnProfile,
  isSaved,
  saving = false,
  onClose,
  onToggleSave,
  onShowQr,
}: ProfileMoreOptionsSheetProps) {
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

  return (
    <div className="fixed inset-0 z-[115] flex items-end justify-center">
      <button
        type="button"
        className="fixed inset-0 bg-black/50"
        aria-label={t("common.cancel")}
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-[116] w-full max-w-lg rounded-t-[20px] bg-white pb-6 dark:bg-darkBlue-013",
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="mx-auto mb-4 mt-2.5 h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
        {!isOwnProfile && onToggleSave ? (
          <>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                onToggleSave();
                onClose();
              }}
              className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-gray-50 disabled:opacity-50 dark:hover:bg-white/5"
            >
              <Bookmark
                className={cn(
                  "h-6 w-6",
                  isSaved ? "fill-blue-600 text-blue-600" : "text-gray-900 dark:text-white",
                )}
              />
              <span className="flex-1 text-base font-medium text-gray-900 dark:text-white">
                {isSaved ? t("profile.removeSave") : t("profile.saveProfile")}
              </span>
              {saving ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#FF2D2D] border-t-transparent" />
              ) : null}
            </button>
            <div className="mx-5 border-t border-gray-200 dark:border-gray-700" />
          </>
        ) : null}
        <button
          type="button"
          onClick={() => {
            onShowQr();
            onClose();
          }}
          className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
        >
          <QrCode className="h-6 w-6 text-gray-900 dark:text-white" />
          <span className="text-base font-medium text-gray-900 dark:text-white">{t("profile.qrCode")}</span>
        </button>
      </div>
    </div>
  );
}
