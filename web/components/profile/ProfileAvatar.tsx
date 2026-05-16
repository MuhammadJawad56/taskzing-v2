"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";
import { useLanguage } from "@/lib/contexts/LanguageContext";

type ProfileAvatarProps = {
  size: "mobile" | "desktop";
  photoUrl: string | null;
  imageFailed: boolean;
  displayName: string;
  initial: string;
  shapeClass: string;
  onImageError: () => void;
  onOpenPhoto: () => void;
  className?: string;
};

export function ProfileAvatar({
  size,
  photoUrl,
  imageFailed,
  displayName,
  initial,
  shapeClass,
  onImageError,
  onOpenPhoto,
  className,
}: ProfileAvatarProps) {
  const { t } = useLanguage();
  const showPhoto = Boolean(photoUrl) && !imageFailed;

  return (
    <button
      type="button"
      onClick={onOpenPhoto}
      className={cn(
        "relative flex shrink-0 cursor-zoom-in items-center justify-center overflow-hidden bg-red-600 font-semibold text-white transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F21A1A] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-darkBlue-003",
        size === "mobile" ? "h-[70px] w-[70px] text-xl" : "h-48 w-48 text-4xl",
        shapeClass,
        className,
      )}
      aria-label={t("profile.viewPhoto")}
    >
      {showPhoto ? (
        <img
          src={photoUrl!}
          alt={displayName}
          className="h-full w-full object-cover"
          onError={onImageError}
          loading="lazy"
        />
      ) : (
        <span>{initial}</span>
      )}
    </button>
  );
}
