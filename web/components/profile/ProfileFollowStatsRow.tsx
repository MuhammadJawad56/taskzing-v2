"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";
import { useLanguage } from "@/lib/contexts/LanguageContext";

export type FollowStatTab = "following" | "followers";

type ProfileFollowStatsRowProps = {
  followingCount: number;
  followersCount: number;
  loading?: boolean;
  tappable?: boolean;
  onStatTap?: (tab: FollowStatTab) => void;
  className?: string;
};

function StatBlock({
  count,
  label,
  tab,
  loading,
  tappable,
  onStatTap,
}: {
  count: number;
  label: string;
  tab: FollowStatTab;
  loading: boolean;
  tappable: boolean;
  onStatTap?: (tab: FollowStatTab) => void;
}) {
  const countText = loading ? "..." : String(count);
  const content = (
    <span className="inline-flex items-center gap-1">
      <span className="text-sm font-bold text-gray-900 dark:text-white">{countText}</span>
      <span className="text-xs text-gray-900 dark:text-white/90">{label}</span>
    </span>
  );

  if (!tappable || !onStatTap) {
    return content;
  }

  return (
    <button
      type="button"
      onClick={() => onStatTap(tab)}
      className="rounded-lg px-1 py-0.5 transition-colors hover:bg-gray-100 dark:hover:bg-white/10"
    >
      {content}
    </button>
  );
}

export function ProfileFollowStatsRow({
  followingCount,
  followersCount,
  loading = false,
  tappable = false,
  onStatTap,
  className,
}: ProfileFollowStatsRowProps) {
  const { t } = useLanguage();

  return (
    <div className={cn("mt-1.5 flex flex-wrap items-center", className)}>
      <StatBlock
        count={followingCount}
        label={t("profile.followingLabel")}
        tab="following"
        loading={loading}
        tappable={tappable}
        onStatTap={onStatTap}
      />
      <span className="px-3 text-sm text-gray-900 dark:text-white" aria-hidden>
        ·
      </span>
      <StatBlock
        count={followersCount}
        label={t("profile.followersLabel")}
        tab="followers"
        loading={loading}
        tappable={tappable}
        onStatTap={onStatTap}
      />
    </div>
  );
}
