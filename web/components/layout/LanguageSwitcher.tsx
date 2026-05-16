"use client";

import React from "react";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import { cn } from "@/lib/utils/cn";

/** Header-style pills: selected = solid red, other = white + light gray border (matches legacy UI). */
export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();

  const pill =
    "inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-darkBlue-003";

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label={`${t("settings.language")}: ${t("settings.chooseLanguage")}`}
    >
      <button
        type="button"
        className={cn(
          pill,
          language === "english"
            ? "border-primary-500 bg-primary-500 text-white hover:bg-primary-600"
            : "border-gray-300 bg-white text-gray-900 hover:bg-gray-50 dark:border-gray-400 dark:bg-transparent dark:text-white dark:hover:bg-white/10"
        )}
        onClick={() => setLanguage("english")}
        aria-pressed={language === "english"}
      >
        {t("settings.english")}
      </button>
      <button
        type="button"
        className={cn(
          pill,
          language === "french"
            ? "border-primary-500 bg-primary-500 text-white hover:bg-primary-600"
            : "border-gray-300 bg-white text-gray-900 hover:bg-gray-50 dark:border-gray-400 dark:bg-transparent dark:text-white dark:hover:bg-white/10"
        )}
        onClick={() => setLanguage("french")}
        aria-pressed={language === "french"}
      >
        {t("settings.french")}
      </button>
    </div>
  );
};
