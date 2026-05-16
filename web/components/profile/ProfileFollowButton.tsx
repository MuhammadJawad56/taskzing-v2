"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import {
  followUserIdempotent,
  unfollowUser,
} from "@/lib/api/userFollow";
import { isBackendConfigured } from "@/lib/backendConfig";
import { UnfollowConfirmSheet } from "./UnfollowConfirmSheet";

type ProfileFollowButtonProps = {
  userId: string;
  displayName: string;
  isFollowing: boolean;
  isFollowedBy: boolean;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  onFollowChange?: (next: { isFollowing: boolean; followersDelta: number }) => void;
  className?: string;
};

export function ProfileFollowButton({
  userId,
  displayName,
  isFollowing,
  isFollowedBy,
  loading = false,
  disabled = false,
  compact = false,
  onFollowChange,
  className,
}: ProfileFollowButtonProps) {
  const { t } = useLanguage();
  const [actionLoading, setActionLoading] = useState(false);
  const [showUnfollowSheet, setShowUnfollowSheet] = useState(false);

  const label = isFollowing
    ? t("profile.following")
    : isFollowedBy
      ? t("profile.followBack")
      : t("profile.follow");

  const handleFollow = async () => {
    if (actionLoading || loading || disabled || !userId) return;
    if (!isBackendConfigured()) {
      alert(t("profile.followError"));
      return;
    }
    setActionLoading(true);
    try {
      await followUserIdempotent(userId);
      onFollowChange?.({ isFollowing: true, followersDelta: 1 });
    } catch {
      alert(t("profile.followError"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnfollowConfirm = async () => {
    setShowUnfollowSheet(false);
    if (actionLoading || !userId) return;
    setActionLoading(true);
    try {
      await unfollowUser(userId);
      onFollowChange?.({ isFollowing: false, followersDelta: -1 });
    } catch {
      alert(t("profile.followError"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleClick = () => {
    if (actionLoading || loading || disabled) return;
    if (isFollowing) {
      setShowUnfollowSheet(true);
    } else {
      void handleFollow();
    }
  };

  if (loading) return null;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || actionLoading}
        aria-pressed={isFollowing}
        aria-label={label}
        className={cn(
          "inline-flex shrink-0 items-center justify-center font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          compact
            ? "min-h-[40px] max-w-[min(100%,11rem)] gap-1.5 rounded-lg px-3 py-2 text-xs"
            : "min-h-[44px] min-w-[8.5rem] max-w-[14rem] gap-2 rounded-xl px-4 py-2 text-sm",
          isFollowing
            ? "border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:border-gray-500 dark:bg-darkBlue-203 dark:text-white dark:hover:bg-darkBlue-343"
            : "border border-[#FF2D2D] bg-[#FF2D2D] text-black hover:bg-[#e31837] dark:border-[#FF2D2D] dark:bg-[#FF2D2D]",
          className,
        )}
      >
        {actionLoading ? (
          <Loader2 className={cn("animate-spin", compact ? "h-4 w-4" : "h-5 w-5")} aria-hidden />
        ) : (
          <span className="min-w-0 truncate">{label}</span>
        )}
      </button>

      <UnfollowConfirmSheet
        open={showUnfollowSheet}
        displayName={displayName}
        onConfirm={() => void handleUnfollowConfirm()}
        onCancel={() => setShowUnfollowSheet(false)}
      />
    </>
  );
}
