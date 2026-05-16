"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  MessageSquare,
  MoreVertical,
  UserMinus,
  Users,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { UnfollowConfirmSheet } from "@/components/profile/UnfollowConfirmSheet";
import { useAuth } from "@/lib/api/AuthContext";
import { getOrCreateChatRoom } from "@/lib/api/messages";
import {
  type FollowListUser,
  getFollowers,
  getFollowing,
  removeFollower,
  unfollowUser,
} from "@/lib/api/userFollow";
import { isBackendConfigured } from "@/lib/backendConfig";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import { cn } from "@/lib/utils/cn";

const PAGE_SIZE = 20;

type TabId = "following" | "followers";

function displayName(user: FollowListUser): string {
  if (user.fullName) return user.fullName;
  if (user.username) return `@${user.username}`;
  return "User";
}

function subtitle(user: FollowListUser): string {
  const parts: string[] = [];
  if (user.username) parts.push(`@${user.username}`);
  if (user.role) parts.push(user.role);
  return parts.join(" • ");
}

function FollowUserRow({
  user,
  isFollowingTab,
  isOwnManage,
  onOpenProfile,
  onMessage,
  onUnfollow,
  onRemoveFollower,
}: {
  user: FollowListUser;
  isFollowingTab: boolean;
  isOwnManage: boolean;
  onOpenProfile: (id: string) => void;
  onMessage: (id: string) => void;
  onUnfollow: (user: FollowListUser) => void;
  onRemoveFollower: (user: FollowListUser) => void;
}) {
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const name = displayName(user);
  const initial = name.replace(/^@/, "").charAt(0).toUpperCase() || "?";

  return (
    <div className="mb-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-darkBlue-013">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onOpenProfile(user.id)}
          className="flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-lg font-semibold text-gray-600 dark:bg-darkBlue-203 dark:text-white"
        >
          {user.photoUrl ? (
            <img src={user.photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initial
          )}
        </button>
        <button
          type="button"
          onClick={() => onOpenProfile(user.id)}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate text-base font-semibold text-gray-900 dark:text-white">{name}</p>
          {subtitle(user) ? (
            <p className="truncate text-xs text-gray-600 dark:text-gray-300">{subtitle(user)}</p>
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => onMessage(user.id)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#FF2D2D] bg-[#FF2D2D]/10 text-[#FF2D2D]"
          aria-label={t("profile.message")}
        >
          <MessageSquare className="h-5 w-5" />
        </button>
        {isFollowingTab ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 dark:text-white dark:hover:bg-white/10"
              aria-label={t("profile.moreOptions")}
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            {menuOpen ? (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-10"
                  aria-hidden
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-full z-20 mt-1 min-w-[8rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-darkBlue-013">
                  <button
                    type="button"
                    className="w-full px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-white/5"
                    onClick={() => {
                      setMenuOpen(false);
                      onUnfollow(user);
                    }}
                  >
                    {t("profile.unfollow")}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        ) : isOwnManage ? (
          <button
            type="button"
            onClick={() => onRemoveFollower(user)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 dark:text-white dark:hover:bg-red-900/20"
            aria-label={t("profile.removeFollower")}
          >
            <UserMinus className="h-5 w-5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function FollowerManagePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const { user: currentUser, loading: authLoading } = useAuth();

  const initialTab = (searchParams.get("tab") === "followers" ? "followers" : "following") as TabId;
  const targetUserId = searchParams.get("userId") || currentUser?.uid || "";
  const isOwnManage = !searchParams.get("userId") || searchParams.get("userId") === currentUser?.uid;

  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [followingUsers, setFollowingUsers] = useState<FollowListUser[]>([]);
  const [followerUsers, setFollowerUsers] = useState<FollowListUser[]>([]);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [followingHasMore, setFollowingHasMore] = useState(true);
  const [followersHasMore, setFollowersHasMore] = useState(true);
  const [followingLoadingMore, setFollowingLoadingMore] = useState(false);
  const [followersLoadingMore, setFollowersLoadingMore] = useState(false);

  const [unfollowTarget, setUnfollowTarget] = useState<FollowListUser | null>(null);
  const [removeTarget, setRemoveTarget] = useState<FollowListUser | null>(null);
  const [removeSheetOpen, setRemoveSheetOpen] = useState(false);

  const followingScrollRef = useRef<HTMLDivElement>(null);
  const followersScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      router.replace(`/login?redirect=${encodeURIComponent("/follower-manage")}`);
    }
  }, [authLoading, currentUser, router]);

  const loadFollowing = useCallback(
    async (refresh: boolean) => {
      if (!targetUserId || !isBackendConfigured()) return;
      if (refresh) {
        if (followingLoading) return;
        setFollowingLoading(true);
        setFollowingHasMore(true);
      } else {
        if (followingLoadingMore || !followingHasMore) return;
        setFollowingLoadingMore(true);
      }
      try {
        const offset = refresh ? 0 : followingUsers.length;
        const page = await getFollowing(targetUserId, { limit: PAGE_SIZE, offset });
        setFollowingUsers((prev) => {
          if (refresh) return page.items;
          const ids = new Set(prev.map((u) => u.id));
          return [...prev, ...page.items.filter((u) => !ids.has(u.id))];
        });
        setFollowingHasMore(page.hasMore);
      } catch {
        alert(t("reels.loadFailed"));
      } finally {
        setFollowingLoading(false);
        setFollowingLoadingMore(false);
      }
    },
    [
      targetUserId,
      followingLoading,
      followingLoadingMore,
      followingHasMore,
      followingUsers.length,
      t,
    ],
  );

  const loadFollowers = useCallback(
    async (refresh: boolean) => {
      if (!targetUserId || !isBackendConfigured()) return;
      if (refresh) {
        if (followersLoading) return;
        setFollowersLoading(true);
        setFollowersHasMore(true);
      } else {
        if (followersLoadingMore || !followersHasMore) return;
        setFollowersLoadingMore(true);
      }
      try {
        const offset = refresh ? 0 : followerUsers.length;
        const page = await getFollowers(targetUserId, { limit: PAGE_SIZE, offset });
        setFollowerUsers((prev) => {
          if (refresh) return page.items;
          const ids = new Set(prev.map((u) => u.id));
          return [...prev, ...page.items.filter((u) => !ids.has(u.id))];
        });
        setFollowersHasMore(page.hasMore);
      } catch {
        alert(t("reels.loadFailed"));
      } finally {
        setFollowersLoading(false);
        setFollowersLoadingMore(false);
      }
    },
    [
      targetUserId,
      followersLoading,
      followersLoadingMore,
      followersHasMore,
      followerUsers.length,
      t,
    ],
  );

  useEffect(() => {
    if (!targetUserId || authLoading || !currentUser) return;
    void loadFollowing(true);
    void loadFollowers(true);
  }, [targetUserId, authLoading, currentUser?.uid]);

  useEffect(() => {
    const el = activeTab === "following" ? followingScrollRef.current : followersScrollRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
        if (activeTab === "following") void loadFollowing(false);
        else void loadFollowers(false);
      }
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [activeTab, loadFollowing, loadFollowers]);

  const handleMessage = async (otherUserId: string) => {
    if (!currentUser?.uid) return;
    try {
      const roomId = await getOrCreateChatRoom([currentUser.uid, otherUserId]);
      router.push(`/chats/${roomId}`);
    } catch {
      alert(t("reels.loadFailed"));
    }
  };

  const confirmUnfollow = async () => {
    if (!unfollowTarget) return;
    const id = unfollowTarget.id;
    setUnfollowTarget(null);
    try {
      await unfollowUser(id);
      setFollowingUsers((list) => list.filter((u) => u.id !== id));
    } catch {
      alert(t("profile.followError"));
    }
  };

  const confirmRemoveFollower = async () => {
    if (!removeTarget) return;
    const id = removeTarget.id;
    setRemoveSheetOpen(false);
    setRemoveTarget(null);
    try {
      await removeFollower(id);
      setFollowerUsers((list) => list.filter((u) => u.id !== id));
    } catch {
      alert(t("profile.followError"));
    }
  };

  const list = activeTab === "following" ? followingUsers : followerUsers;
  const listLoading = activeTab === "following" ? followingLoading : followersLoading;
  const listLoadingMore = activeTab === "following" ? followingLoadingMore : followersLoadingMore;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-4 flex items-center gap-3">
          <Link
            href={targetUserId ? `/profile/${targetUserId}` : "/"}
            className="rounded-lg p-2 text-gray-700 hover:bg-gray-100 dark:text-white dark:hover:bg-white/10"
            aria-label={t("reels.back")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {t("profile.followerManageTitle")}
          </h1>
        </div>

        <div className="mb-4 flex rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-darkBlue-203">
          {(["following", "followers"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors",
                activeTab === tab
                  ? "bg-white text-[#FF2D2D] shadow-sm dark:bg-darkBlue-013 dark:text-[#FF2D2D]"
                  : "text-gray-600 dark:text-gray-300",
              )}
            >
              {tab === "following" ? t("profile.followingLabel") : t("profile.followersLabel")}
            </button>
          ))}
        </div>

        <div
          ref={activeTab === "following" ? followingScrollRef : followersScrollRef}
          className="max-h-[calc(100vh-220px)] overflow-y-auto"
        >
          {listLoading && list.length === 0 ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#FF2D2D]" />
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center text-gray-500 dark:text-gray-400">
              <Users className="mb-3 h-12 w-12 opacity-50" />
              <p className="text-sm">
                {activeTab === "following"
                  ? t("profile.noFollowingYet")
                  : t("profile.noFollowersYet")}
              </p>
            </div>
          ) : (
            list.map((user) => (
              <FollowUserRow
                key={user.id}
                user={user}
                isFollowingTab={activeTab === "following"}
                isOwnManage={isOwnManage}
                onOpenProfile={(id) => router.push(`/profile/${id}`)}
                onMessage={handleMessage}
                onUnfollow={setUnfollowTarget}
                onRemoveFollower={(u) => {
                  setRemoveTarget(u);
                  setRemoveSheetOpen(true);
                }}
              />
            ))
          )}
          {listLoadingMore ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-[#FF2D2D]" />
            </div>
          ) : null}
        </div>
      </div>

      <UnfollowConfirmSheet
        open={!!unfollowTarget}
        displayName={unfollowTarget ? displayName(unfollowTarget) : ""}
        onConfirm={() => void confirmUnfollow()}
        onCancel={() => setUnfollowTarget(null)}
      />

      <UnfollowConfirmSheet
        open={!!removeTarget && removeSheetOpen}
        displayName={removeTarget ? displayName(removeTarget) : ""}
        message={t("profile.removeFollowerConfirm")}
        confirmLabel={t("profile.removeFollower")}
        onConfirm={() => void confirmRemoveFollower()}
        onCancel={() => {
          setRemoveSheetOpen(false);
          setRemoveTarget(null);
        }}
      />
    </DashboardLayout>
  );
}
