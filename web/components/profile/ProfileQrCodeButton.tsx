"use client";

import React from "react";
import { QrCode } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useLanguage } from "@/lib/contexts/LanguageContext";

type ProfileQrCodeButtonProps = {
  compact?: boolean;
  onClick: () => void;
  className?: string;
};

/** Flutter profile header — secondary bg + border, opens QR modal directly. */
export function ProfileQrCodeButton({
  compact = true,
  onClick,
  className,
}: ProfileQrCodeButtonProps) {
  const { t } = useLanguage();

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t("profile.qrCode")}
      className={cn(
        "inline-flex items-center justify-center border border-gray-300 bg-gray-100 text-gray-900 transition-colors hover:bg-gray-200 dark:border-gray-600 dark:bg-darkBlue-203 dark:text-white dark:hover:bg-darkBlue-343",
        compact ? "rounded-lg p-2" : "rounded-xl p-3",
        className,
      )}
    >
      <QrCode className={compact ? "h-[18px] w-[18px]" : "h-6 w-6"} strokeWidth={2} />
    </button>
  );
}
