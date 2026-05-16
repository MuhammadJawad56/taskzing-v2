"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useLanguage } from "@/lib/contexts/LanguageContext";

type ProfilePhotoLightboxProps = {
  open: boolean;
  onClose: () => void;
  photoUrl: string | null;
  displayName: string;
  initial: string;
  shapeClass?: string;
};

export function ProfilePhotoLightbox({
  open,
  onClose,
  photoUrl,
  displayName,
  initial,
  shapeClass = "rounded-full",
}: ProfilePhotoLightboxProps) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!open) return;
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
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[210] bg-black/80 backdrop-blur-sm"
        aria-label={t("common.cancel")}
        onClick={onClose}
      />
      <div
        className="pointer-events-none fixed inset-0 z-[211] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label={displayName}
      >
        <div className="pointer-events-auto relative flex max-h-[90vh] max-w-[min(92vw,28rem)] flex-col items-center">
          <button
            type="button"
            onClick={onClose}
            className="absolute -right-2 -top-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-lg transition-colors hover:bg-white dark:bg-darkBlue-013 dark:text-white"
            aria-label={t("common.cancel")}
          >
            <X className="h-5 w-5" />
          </button>
          <div
            className={cn(
              "flex max-h-[min(85vh,32rem)] w-[min(85vw,28rem)] items-center justify-center overflow-hidden bg-red-600 shadow-2xl",
              shapeClass,
            )}
          >
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={displayName}
                className="h-full w-full max-h-[min(85vh,32rem)] object-cover"
              />
            ) : (
              <span className="px-8 py-16 text-6xl font-semibold text-white sm:text-8xl">{initial}</span>
            )}
          </div>
          <p className="mt-4 max-w-full truncate text-center text-sm font-medium text-white">{displayName}</p>
        </div>
      </div>
    </>
  );
}
