"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Heart,
  MessageCircle,
  Share2,
  Check,
  Users,
  MapPin,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/lib/api/AuthContext";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import type { Reel, ReelComment } from "@/lib/reels/types";
import type { ReelsFeedModeApi } from "@/lib/reels/types";
import {
  addReelComment,
  fetchReelById,
  fetchReelComments,
  fetchReelsFeedPage,
  toggleReelLike,
  trackReelShare,
} from "@/lib/api/reels";
import {
  followUserIdempotent,
  getFollowStatus,
  unfollowUserRelaxed,
} from "@/lib/api/userFollow";
import { searchUsers } from "@/lib/api/usersSearch";
import { ReelCommentsSheet } from "./ReelCommentsSheet";
import { ReelPeopleDiscoverySheet } from "./ReelPeopleDiscoverySheet";
import { ReelUploadSheet } from "./ReelUploadSheet";
import { VolumeSliderControl } from "./VolumeSliderControl";

type FeedStatus = "initial" | "loading" | "loaded" | "failure";

function clampVolume(value: number) {
  return Math.min(1, Math.max(0, Math.round(value * 10) / 10));
}

export function ReelsFeedClient({ initialReelId }: { initialReelId?: string | null }) {
  const router = useRouter();
  const { t } = useLanguage();
  const { userData } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<number>(0);
  const loadMoreLock = useRef(false);
  const lastVolumeRef = useRef(1);

  const [status, setStatus] = useState<FeedStatus>("initial");
  const [reels, setReels] = useState<Reel[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [nextPage, setNextPage] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [mode, setMode] = useState<ReelsFeedModeApi>("for_you");
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsReel, setCommentsReel] = useState<Reel | null>(null);
  const [peopleOpen, setPeopleOpen] = useState<"search" | "filter" | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [likeBurstIndex, setLikeBurstIndex] = useState<number | null>(null);
  const [followedCount, setFollowedCount] = useState<number | null>(null);

  const modeRef = useRef(mode);
  modeRef.current = mode;

  const setVolumeLevel = useCallback((level: number) => {
    const next = clampVolume(level);
    if (next > 0) lastVolumeRef.current = next;
    setVolume(next);
  }, []);

  const navigateBack = useCallback(() => {
    const raw = String(userData?.currentRole ?? userData?.role ?? "").toLowerCase().replace(/\s+/g, "");
    const isProvider =
      raw === "provider" ||
      raw === "both" ||
      raw === "client+provider" ||
      raw === "clientprovider";
    router.push(isProvider ? "/dashboard" : "/client-home");
  }, [router, userData?.currentRole, userData?.role]);

  const loadInitial = useCallback(async (reelIdHint?: string | null) => {
      setStatus("loading");
      setErrorMessage(null);
      setLoadMoreError(null);
      try {
        const page = await fetchReelsFeedPage({ page: 1, limit: 10, mode: modeRef.current });
        let initialItems = page.items;
        const hint = reelIdHint?.trim();
        if (hint) {
          const found = initialItems.findIndex((r) => r.id === hint);
          if (found === -1) {
            const target = await fetchReelById(hint);
            if (target) initialItems = [target, ...initialItems];
          }
        }
        setReels(initialItems);
        setHasMore(page.hasMore);
        setFollowedCount(page.followedCount ?? null);
        setNextPage(2);
        setActiveIndex(0);
        setStatus("loaded");
        requestAnimationFrame(() => {
          if (scrollRef.current) scrollRef.current.scrollTop = 0;
        });
        if (hint && scrollRef.current) {
          const idx = initialItems.findIndex((r) => r.id === hint);
          if (idx > 0) {
            requestAnimationFrame(() => {
              const el = scrollRef.current;
              if (el) el.scrollTop = idx * el.clientHeight;
              setActiveIndex(idx);
            });
          }
        }
      } catch (e) {
        setStatus("failure");
        setErrorMessage(e instanceof Error ? e.message : "Failed to load reels");
      }
  }, []);

  useEffect(() => {
    void loadInitial(initialReelId ?? null);
  }, [initialReelId, loadInitial]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadMoreLock.current) return;
    loadMoreLock.current = true;
    setIsLoadingMore(true);
    setLoadMoreError(null);
    try {
      const page = await fetchReelsFeedPage({ page: nextPage, limit: 10, mode });
      setReels((prev) => [...prev, ...page.items]);
      setHasMore(page.hasMore);
      setNextPage((p) => p + 1);
    } catch (e) {
      setLoadMoreError(e instanceof Error ? e.message : "Failed to load more reels");
    } finally {
      setIsLoadingMore(false);
      loadMoreLock.current = false;
    }
  }, [hasMore, nextPage, mode]);

  const setActiveFromScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || reels.length === 0) return;
    const h = el.clientHeight || 1;
    const idx = Math.min(reels.length - 1, Math.max(0, Math.round(el.scrollTop / h)));
    setActiveIndex(idx);
    if (hasMore && idx >= reels.length - 2) void loadMore();
  }, [reels.length, hasMore, loadMore]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let t: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(t);
      t = setTimeout(setActiveFromScroll, 40);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(t);
      el.removeEventListener("scroll", onScroll);
    };
  }, [setActiveFromScroll, reels.length]);

  useEffect(() => {
    reels.forEach((r, i) => {
      const v = document.querySelector<HTMLVideoElement>(`video[data-reel-id="${r.id}"]`);
      if (!v) return;
      if (i === activeIndex) {
        v.muted = volume === 0;
        if (volume > 0) v.volume = volume;
        void v.play().catch(() => {});
      } else {
        v.pause();
      }
    });
  }, [activeIndex, volume, reels]);

  const switchMode = async (m: ReelsFeedModeApi) => {
    if (m === mode) return;
    setMode(m);
    setReels([]);
    setNextPage(1);
    setHasMore(true);
    setActiveIndex(0);
    setFollowedCount(null);
    setLoadMoreError(null);
    setErrorMessage(null);
    setStatus("loading");
    try {
      const page = await fetchReelsFeedPage({ page: 1, limit: 10, mode: m });
      setReels(page.items);
      setHasMore(page.hasMore);
      setFollowedCount(page.followedCount ?? null);
      setNextPage(2);
      setStatus("loaded");
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    } catch (e) {
      setStatus("failure");
      setErrorMessage(e instanceof Error ? e.message : "Failed to load reels");
    }
  };

  const likeAt = async (index: number) => {
    if (index < 0 || index >= reels.length) return;
    const id = reels[index].id;
    const updated = await toggleReelLike(id);
    if (!updated) return;
    setReels((prev) => {
      const next = [...prev];
      next[index] = updated;
      return next;
    });
  };

  const shareAt = async (index: number, reel: Reel) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/reels?reelId=${encodeURIComponent(reel.id)}`;
    const shareSubject =
      reel.caption.trim() || reel.location?.trim() || "";
    const text = `Watch this reel on TaskZing: ${url}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: shareSubject || "TaskZing Reel",
          text,
          url,
        });
      } else {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      /* user cancelled share */
    }
    const updated = await trackReelShare(reel.id);
    if (!updated) return;
    setReels((prev) => {
      const next = [...prev];
      if (next[index]) next[index] = updated;
      return next;
    });
  };

  const openComments = (reel: Reel) => {
    setCommentsReel(reel);
    setCommentsOpen(true);
  };

  const loadCommentsFor = useCallback(async (reelId: string): Promise<ReelComment[]> => {
    return fetchReelComments(reelId);
  }, []);

  const submitComment = async (reelId: string, text: string) => {
    const added = await addReelComment(reelId, text);
    if (!added) return;
    setReels((prev) => {
      const next = [...prev];
      const i = next.findIndex((r) => r.id === reelId);
      if (i !== -1) {
        const r = next[i];
        next[i] = { ...r, commentsCount: r.commentsCount + 1 };
      }
      return next;
    });
  };

  const afterUpload = async () => {
    setUploadOpen(false);
    await loadInitial(null);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  const refreshFollowingFeed = useCallback(async () => {
    if (modeRef.current !== "following") return;
    await loadInitial(null);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [loadInitial]);

  const scrollToReelIndex = useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el || reels.length === 0) return;
    const next = Math.min(reels.length - 1, Math.max(0, index));
    el.scrollTo({ top: next * el.clientHeight, behavior: "smooth" });
    setActiveIndex(next);
  }, [reels.length]);

  const scrollToPreviousReel = () => scrollToReelIndex(activeIndex - 1);
  const scrollToNextReel = () => scrollToReelIndex(activeIndex + 1);

  const handleVideoTap = (index: number) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      void likeAt(index);
      lastTapRef.current = 0;
      setLikeBurstIndex(index);
      window.setTimeout(() => {
        setLikeBurstIndex((cur) => (cur === index ? null : cur));
      }, 720);
    } else {
      lastTapRef.current = now;
      const v = document.querySelector<HTMLVideoElement>(
        `video[data-reel-id="${reels[index]?.id}"]`
      );
      if (v) {
        if (v.paused) void v.play();
        else v.pause();
      }
    }
  };

  if (status === "loading" && reels.length === 0) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900 animate-pulse lg:bg-[#121212]">
        <div className="aspect-[9/16] w-[min(420px,calc((100dvh-180px)*9/16))] max-h-[min(calc(100dvh-180px),780px)] rounded-xl bg-gradient-to-b from-zinc-800 to-zinc-900 shadow-[0_8px_40px_rgba(0,0,0,0.55)]" />
      </div>
    );
  }

  if (status === "failure" && reels.length === 0) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black px-6 text-center text-white lg:bg-[#121212]">
        <p className="text-white/80 mb-4">{errorMessage ?? t("reels.loadFailed")}</p>
        <button
          type="button"
          onClick={() => loadInitial(initialReelId ?? null)}
          className="rounded-full bg-white px-6 py-2 text-black font-semibold"
        >
          {t("reels.retry")}
        </button>
        <button type="button" onClick={navigateBack} className="mt-4 text-white/60 underline">
          {t("reels.goBack")}
        </button>
      </div>
    );
  }

  if (reels.length === 0) {
    const isFollowing = mode === "following";
    return (
      <div className="fixed inset-0 z-[100] bg-black text-white lg:bg-[#121212]">
        <ReelsTopChrome
          mode={mode}
          volume={volume}
          onBack={navigateBack}
          onVolumeChange={setVolumeLevel}
          onUpload={() => setUploadOpen(true)}
          onSwitchMode={(m) => void switchMode(m)}
          t={t}
        />
        <div className="flex h-full w-full flex-col items-center justify-center px-6 pb-10 pt-[max(5.5rem,env(safe-area-inset-top)+3.25rem)] text-center lg:max-w-md lg:mx-auto">
          {!isFollowing ? (
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="flex h-[72px] w-[72px] items-center justify-center rounded-full border border-white/20 bg-white/10"
              aria-label={t("reels.upload")}
            >
              <Plus className="h-10 w-10 text-white" />
            </button>
          ) : (
            <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full border border-white/20 bg-white/10">
              <Users className="h-9 w-9 text-white/70" strokeWidth={1.5} aria-hidden />
            </div>
          )}
          <p className="mt-4 text-lg font-semibold text-white">
            {isFollowing ? t("reels.emptyFollowingTitle") : t("reels.emptyForYouTitle")}
          </p>
          <p className="mt-1.5 max-w-xs text-sm text-white/55">
            {isFollowing
              ? (followedCount != null && followedCount > 0
                  ? t("reels.emptyFollowingHintFollowed")
                  : t("reels.emptyFollowingHint"))
              : t("reels.emptyForYouHint")}
          </p>
          {isFollowing ? (
            <div className="mt-4 flex flex-row flex-wrap justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setPeopleOpen("search")}
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black"
              >
                {t("reels.searchPeople")}
              </button>
              <button
                type="button"
                onClick={() => setPeopleOpen("filter")}
                className="rounded-full border border-white/55 bg-transparent px-4 py-2 text-sm font-semibold text-white"
              >
                {t("reels.filterPeople")}
              </button>
            </div>
          ) : null}
          {isFollowing ? (
            <>
              <button
                type="button"
                onClick={() => void switchMode("for_you")}
                className="mt-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-black"
              >
                {t("reels.watchForYou")}
              </button>
              <button
                type="button"
                onClick={() => void loadInitial(null)}
                className="mt-2 text-sm font-medium text-white/70 underline decoration-white/50 underline-offset-2"
              >
                {t("reels.refreshFollowing")}
              </button>
            </>
          ) : null}
        </div>
        <ReelUploadSheet open={uploadOpen} onClose={() => setUploadOpen(false)} onSuccess={afterUpload} />
        <ReelPeopleDiscoverySheet
          open={peopleOpen}
          onClose={() => setPeopleOpen(null)}
          searchUsers={searchUsers}
          getFollowStatus={getFollowStatus}
          followUser={followUserIdempotent}
          unfollowUser={unfollowUserRelaxed}
          onFollowSuccess={() => void refreshFollowingFeed()}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white lg:bg-[#121212]">
      <ReelsTopChrome
        mode={mode}
        volume={volume}
        onBack={navigateBack}
        onVolumeChange={setVolumeLevel}
        onUpload={() => setUploadOpen(true)}
        onSwitchMode={(m) => void switchMode(m)}
        t={t}
      />

      <div className="pointer-events-none absolute right-5 top-1/2 z-[6] hidden -translate-y-1/2 flex-col gap-3 lg:right-auto lg:left-[calc(50%+min(210px,calc((100dvh-180px)*9/32))+88px)] lg:flex">
        <DesktopScrollButton
          direction="up"
          disabled={activeIndex <= 0}
          onClick={scrollToPreviousReel}
          ariaLabel="Previous reel"
        />
        <DesktopScrollButton
          direction="down"
          disabled={activeIndex >= reels.length - 1 && !hasMore}
          onClick={scrollToNextReel}
          ariaLabel="Next reel"
        />
      </div>

      <div
        ref={scrollRef}
        className="h-full w-full snap-y snap-mandatory overflow-y-scroll overscroll-y-contain"
        style={{ scrollBehavior: "smooth" }}
      >
        {reels.map((reel, index) => (
          <div
            key={reel.id}
            className="relative flex h-[100dvh] w-full shrink-0 snap-start snap-always items-stretch justify-center bg-black lg:bg-[#121212]"
          >
            <div className="relative flex h-full w-full flex-col items-center justify-center lg:px-4 lg:py-5">
              <div className="relative flex h-full w-full flex-col lg:h-auto lg:max-h-[min(calc(100dvh-88px),900px)] lg:items-center">
                <div className="relative flex h-full w-full min-h-0 lg:h-[min(calc(100dvh-180px),780px)] lg:w-auto lg:flex-row lg:items-end lg:gap-3">
                  <div
                    className="relative h-full w-full min-h-0 lg:aspect-[9/16] lg:h-full lg:w-auto lg:max-w-[min(420px,calc((100dvh-180px)*9/16))] lg:shrink-0 lg:overflow-hidden lg:rounded-xl lg:bg-black lg:shadow-[0_8px_40px_rgba(0,0,0,0.55)]"
                    onClick={() => handleVideoTap(index)}
                    role="presentation"
                  >
              <video
                data-reel-id={reel.id}
                src={reel.videoUrl}
                poster={reel.thumbnailUrl?.trim() || undefined}
                className="h-full w-full object-cover"
                playsInline
                loop
                muted={volume === 0}
                preload={Math.abs(index - activeIndex) <= 1 ? "metadata" : "none"}
                disablePictureInPicture
                controlsList="nodownload noplaybackrate"
              />
                    <div
                      className="pointer-events-none absolute inset-0 z-[1] lg:rounded-xl"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, transparent 18%, transparent 58%, rgba(0,0,0,0.55) 100%)",
              }}
            />
                    {likeBurstIndex === index ? (
                      <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center lg:rounded-xl">
                <Heart
                  className="h-28 w-28 text-red-500 drop-shadow-[0_4px_24px_rgba(0,0,0,0.45)] animate-[pulse_0.55s_ease-out_1]"
                  fill="currentColor"
                  aria-hidden
                />
              </div>
            ) : null}
                    <div className="absolute bottom-[max(110px,env(safe-area-inset-bottom)+5.5rem)] right-3 z-[2] flex flex-col items-center gap-5 lg:hidden">
                      <ReelActionRail
                        reel={reel}
                        volume={volume}
                        onLike={() => likeAt(index)}
                        onComments={() => openComments(reel)}
                        onShare={() => shareAt(index, reel)}
                        onVolumeChange={setVolumeLevel}
                        onOpenProfile={() => router.push(`/profile/${encodeURIComponent(reel.author.id)}`)}
                        onFollowSuccess={() => void refreshFollowingFeed()}
                        showMute
                        t={t}
                      />
                    </div>
                    <div className="absolute bottom-[max(28px,env(safe-area-inset-bottom))] left-4 right-20 z-[2] lg:hidden">
                      <ReelCaptionBlock
                        reel={reel}
                        t={t}
                        onOpenProfile={() => router.push(`/profile/${encodeURIComponent(reel.author.id)}`)}
                      />
                    </div>
                  </div>

                  <div className="relative z-[2] hidden shrink-0 flex-col items-center gap-4 pb-2 lg:flex">
                    <ReelActionRail
                      reel={reel}
                      volume={volume}
                      onLike={() => likeAt(index)}
                      onComments={() => openComments(reel)}
                      onShare={() => shareAt(index, reel)}
                      onVolumeChange={setVolumeLevel}
                      onOpenProfile={() => router.push(`/profile/${encodeURIComponent(reel.author.id)}`)}
                      onFollowSuccess={() => void refreshFollowingFeed()}
                      showMute
                      desktop
                      t={t}
                    />
                  </div>
                </div>

                <div className="relative z-[2] mt-0 hidden w-full max-w-[min(420px,calc((100dvh-180px)*9/16))] shrink-0 px-0.5 pb-1 pt-3 lg:block">
                  <ReelCaptionBlock
                    reel={reel}
                    t={t}
                    onOpenProfile={() => router.push(`/profile/${encodeURIComponent(reel.author.id)}`)}
                    desktop
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {(isLoadingMore || loadMoreError) && (
        <div className="pointer-events-auto absolute bottom-3.5 left-1/2 z-[6] -translate-x-1/2 rounded-2xl bg-black/60 px-3 py-2">
          {isLoadingMore ? (
            <div className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <div className="flex items-center gap-2 text-sm text-white/70">
              <span>{loadMoreError ?? t("reels.loadMoreFailed")}</span>
              <button type="button" className="text-white underline" onClick={() => void loadMore()}>
                {t("reels.retry")}
              </button>
            </div>
          )}
        </div>
      )}

      {status === "failure" && errorMessage ? (
        <div className="pointer-events-auto absolute bottom-20 left-1/2 z-[6] max-w-sm -translate-x-1/2 rounded-lg bg-red-900/90 px-3 py-2 text-center text-sm text-white">
          {errorMessage}
        </div>
      ) : null}

      <ReelCommentsSheet
        open={commentsOpen}
        reel={commentsReel}
        onClose={() => {
          setCommentsOpen(false);
          setCommentsReel(null);
        }}
        loadComments={loadCommentsFor}
        onSubmitComment={submitComment}
      />
      <ReelPeopleDiscoverySheet
        open={peopleOpen}
        onClose={() => setPeopleOpen(null)}
        searchUsers={searchUsers}
        getFollowStatus={getFollowStatus}
        followUser={followUserIdempotent}
        unfollowUser={unfollowUserRelaxed}
        onFollowSuccess={() => void refreshFollowingFeed()}
      />
      <ReelUploadSheet open={uploadOpen} onClose={() => setUploadOpen(false)} onSuccess={afterUpload} />
    </div>
  );
}

function ReelsTopChrome({
  mode,
  volume,
  onBack,
  onVolumeChange,
  onUpload,
  onSwitchMode,
  t,
}: {
  mode: ReelsFeedModeApi;
  volume: number;
  onBack: () => void;
  onVolumeChange: (level: number) => void;
  onUpload: () => void;
  onSwitchMode: (m: ReelsFeedModeApi) => void;
  t: (key: string) => string;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[5] flex justify-center pt-[max(8px,env(safe-area-inset-top))]">
      <div className="pointer-events-auto flex w-full max-w-lg items-start justify-between px-3 py-1.5 lg:mx-auto lg:max-w-[min(520px,calc((100dvh-180px)*9/16+88px))]">
        <button
          type="button"
          onClick={onBack}
          className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-white/20 bg-black/30"
          aria-label={t("reels.back")}
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
        <div className="flex flex-col items-center gap-1">
          <div className="flex gap-2">
            <FeedModeChip
              label={t("reels.forYou")}
              selected={mode === "for_you"}
              onClick={() => void onSwitchMode("for_you")}
            />
            <FeedModeChip
              label={t("reels.followingTab")}
              selected={mode === "following"}
              onClick={() => void onSwitchMode("following")}
            />
          </div>
        </div>
        <div className="flex items-start gap-2">
          <VolumeSliderControl
            variant="chrome"
            volume={volume}
            onVolumeChange={onVolumeChange}
            t={t}
            className="lg:hidden"
            popoverSide="below"
          />
          <button
            type="button"
            onClick={onUpload}
            className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-white/20 bg-black/30"
            aria-label={t("reels.upload")}
          >
            <Plus className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

function FeedModeChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center min-w-[72px]">
      <span className={`text-sm ${selected ? "font-bold text-white" : "font-medium text-white/50"}`}>{label}</span>
      <span
        className={`mt-1 h-[2.5px] rounded-full bg-white transition-all duration-180 ${selected ? "w-[26px]" : "w-0"}`}
      />
    </button>
  );
}

function ActionIcon({
  icon,
  label,
  onClick,
  desktop = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  desktop?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} className="pointer-events-auto flex flex-col items-center">
      <div
        className={
          desktop
            ? "flex h-12 w-12 items-center justify-center"
            : "flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/30"
        }
      >
        {icon}
      </div>
      {label ? (
        <span className={`mt-1.5 text-xs font-semibold ${desktop ? "text-white/90" : "text-white"}`}>
          {label}
        </span>
      ) : null}
    </button>
  );
}

function AuthorFollowStack({
  author,
  onOpenProfile,
  onFollowSuccess,
}: {
  author: Reel["author"];
  onOpenProfile: () => void;
  onFollowSuccess?: () => void;
}) {
  const [following, setFollowing] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const f = await getFollowStatus(author.id);
        if (!cancelled) setFollowing(f);
      } catch {
        if (!cancelled) setFollowing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [author.id]);

  const toggle = async () => {
    if (following == null || loading) return;
    setLoading(true);
    const next = !following;
    try {
      if (next) await followUserIdempotent(author.id);
      else await unfollowUserRelaxed(author.id);
      setFollowing(next);
      if (next) onFollowSuccess?.();
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  const initial = author.username?.[0]?.toUpperCase() ?? "U";
  const avatar = author.avatarUrl?.trim();

  return (
    <div className="pointer-events-auto flex flex-col items-center">
      <button type="button" onClick={onOpenProfile} className="rounded-full border-[1.5px] border-white p-0.5">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="h-10 w-10 rounded-full bg-white/20 object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white">
            {initial}
          </div>
        )}
      </button>
      {following != null ? (
        <button
          type="button"
          onClick={() => void toggle()}
          className={`mt-1.5 flex h-6 w-6 items-center justify-center rounded-full ${
            following ? "bg-white/20" : "bg-white"
          }`}
        >
          {loading ? (
            <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
          ) : following ? (
            <Check className="h-4 w-4 text-white" />
          ) : (
            <Plus className="h-4 w-4 text-black" />
          )}
        </button>
      ) : null}
    </div>
  );
}

function ReelActionRail({
  reel,
  volume,
  onLike,
  onComments,
  onShare,
  onVolumeChange,
  onOpenProfile,
  onFollowSuccess,
  showMute,
  desktop = false,
  t,
}: {
  reel: Reel;
  volume: number;
  onLike: () => void;
  onComments: () => void;
  onShare: () => void;
  onVolumeChange: (level: number) => void;
  onOpenProfile: () => void;
  onFollowSuccess?: () => void;
  showMute: boolean;
  desktop?: boolean;
  t: (key: string) => string;
}) {
  return (
    <>
      <AuthorFollowStack author={reel.author} onOpenProfile={onOpenProfile} onFollowSuccess={onFollowSuccess} />
      <ActionIcon
        desktop={desktop}
        icon={<Heart className={`h-7 w-7 ${reel.isLiked ? "fill-red-400 text-red-400" : "text-white"}`} />}
        label={String(reel.likesCount)}
        onClick={onLike}
      />
      <ActionIcon
        desktop={desktop}
        icon={<MessageCircle className="h-7 w-7 text-white" />}
        label={String(reel.commentsCount)}
        onClick={onComments}
      />
      <ActionIcon
        desktop={desktop}
        icon={<Share2 className="h-7 w-7 text-white" />}
        label=""
        onClick={onShare}
      />
      {showMute ? (
        <VolumeSliderControl
          variant="rail"
          volume={volume}
          onVolumeChange={onVolumeChange}
          t={t}
          popoverSide="left"
        />
      ) : null}
    </>
  );
}

function ReelCaptionBlock({
  reel,
  t,
  onOpenProfile,
  desktop = false,
}: {
  reel: Reel;
  t: (key: string) => string;
  onOpenProfile: () => void;
  desktop?: boolean;
}) {
  const shadow = desktop ? "" : "drop-shadow-md";
  return (
    <>
      <button
        type="button"
        className={`text-left font-bold text-white ${shadow}`}
        onClick={onOpenProfile}
      >
        @{reel.author.username}
      </button>
      {reel.caption.trim() ? (
        <p className={`mt-1.5 line-clamp-3 text-sm leading-snug text-white/90 ${shadow}`}>{reel.caption}</p>
      ) : !reel.location?.trim() ? (
        <p className={`mt-1.5 line-clamp-2 text-sm leading-snug text-white/90 ${shadow}`}>{t("reels.noCaption")}</p>
      ) : null}
      {reel.location?.trim() ? (
        <div className={`flex items-start gap-1 ${reel.caption.trim() ? "mt-2" : "mt-1.5"}`}>
          <MapPin className="mt-0.5 h-[18px] w-[18px] shrink-0 text-white/90" aria-hidden />
          <p className={`line-clamp-2 text-xs leading-snug text-white/85 ${shadow}`}>{reel.location.trim()}</p>
        </div>
      ) : null}
    </>
  );
}

function DesktopScrollButton({
  direction,
  disabled,
  onClick,
  ariaLabel,
}: {
  direction: "up" | "down";
  disabled: boolean;
  onClick: () => void;
  ariaLabel: string;
}) {
  const Icon = direction === "up" ? ChevronUp : ChevronDown;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-35"
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
