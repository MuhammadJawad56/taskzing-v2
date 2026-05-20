"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { getOpenJobs } from "@/lib/api/jobs";
import type { Task } from "@/lib/types/task";
import { useAuth } from "@/lib/api/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProviderExploreJobCard } from "@/components/task/ProviderExploreJobCard";
import { JobProposalApplyModal } from "@/components/task/JobProposalApplyModal";
import { RemoveSavedJobModal } from "@/components/task/RemoveSavedJobModal";
import {
  ProviderExploreFilterSheet,
  providerExploreFiltersDefault,
  type ProviderExploreFilters,
} from "@/components/task/ProviderExploreFilterSheet";
import { cn } from "@/lib/utils/cn";
import { RecentSearchesDropdown } from "@/components/ui/RecentSearchesDropdown";
import { useRecentSearches } from "@/lib/utils/recentSearches";
import {
  listSavedJobIds,
  saveJobForUser,
  unsaveJobForUser,
} from "@/lib/providerSavedJobs";
import { getUserLikedJobIds, likeJob, unlikeJob } from "@/lib/api/likes";
import { EnableLocationModal } from "@/components/modals/EnableLocationModal";
import { ExploreHeroSection } from "@/components/explore/ExploreHeroSection";

const CATEGORY_CHIPS = [
  "Construction & Repair",
  "Home Improvement",
  "Lifestyle",
  "Professional",
  "Property Maintenance",
  "Specialty",
] as const;

function withinDayPosted(createdAt: string, dayPosted: ProviderExploreFilters["dayPosted"]): boolean {
  if (dayPosted === "any") return true;
  const itemDate = new Date(createdAt);
  if (Number.isNaN(itemDate.getTime())) return true;
  const now = new Date();
  const diffHours = (now.getTime() - itemDate.getTime()) / (1000 * 60 * 60);
  if (dayPosted === "24h") return diffHours <= 24;
  if (dayPosted === "week") return diffHours <= 168;
  if (dayPosted === "month") return diffHours <= 720;
  if (dayPosted === "month+") return diffHours > 720;
  return true;
}

export default function ProviderExplorePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [likedJobIds, setLikedJobIds] = useState<Set<string>>(new Set());
  const [likingJobId, setLikingJobId] = useState<string | null>(null);
  const [jobPendingRemove, setJobPendingRemove] = useState<Task | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<ProviderExploreFilters>(providerExploreFiltersDefault);
  const [draftFilters, setDraftFilters] = useState<ProviderExploreFilters>(providerExploreFiltersDefault);
  const [searchFocused, setSearchFocused] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [isEnablingLocation, setIsEnablingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [selectedJobForProposal, setSelectedJobForProposal] = useState<Task | null>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const { searches: recentSearches, add: addRecentSearch, remove: removeRecentSearch } = useRecentSearches();

  useEffect(() => {
    if (!searchFocused) return;
    const commitIfNeeded = () => {
      const q = searchQuery.trim();
      if (q.length >= 2) addRecentSearch(q);
    };
    const onMouseDown = (e: MouseEvent) => {
      if (!searchWrapRef.current?.contains(e.target as Node)) {
        setSearchFocused(false);
        commitIfNeeded();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSearchFocused(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [searchFocused, searchQuery, addRecentSearch]);

  const handleSelectRecent = useCallback(
    (q: string) => {
      setSearchQuery(q);
      addRecentSearch(q);
      setSearchFocused(false);
    },
    [addRecentSearch],
  );

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) {
      setSavedIds(new Set());
      return;
    }
    let alive = true;
    void listSavedJobIds(uid).then((ids) => {
      if (!alive) return;
      setSavedIds(new Set(ids));
    });
    return () => {
      alive = false;
    };
  }, [user?.uid]);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) {
      setLikedJobIds(new Set());
      return;
    }
    let alive = true;
    void getUserLikedJobIds(uid).then((ids) => {
      if (!alive) return;
      setLikedJobIds(new Set(ids));
    });
    return () => {
      alive = false;
    };
  }, [user?.uid]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const jobs = await getOpenJobs();
        if (alive) setTasks(jobs);
      } catch (e) {
        console.error("Error loading jobs:", e);
        if (alive) setTasks([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const handleSaveClick = useCallback(
    (task: Task) => async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!user) return;
      if (savedIds.has(task.jobId)) {
        setJobPendingRemove(task);
        return;
      }
      await saveJobForUser(user.uid, task.jobId, { posterUserId: task.clientId });
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.add(task.jobId);
        return next;
      });
    },
    [savedIds, user],
  );

  const confirmRemoveSavedJob = useCallback(async () => {
    if (!jobPendingRemove || !user) return;
    const id = jobPendingRemove.jobId;
    await unsaveJobForUser(user.uid, id);
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setJobPendingRemove(null);
  }, [jobPendingRemove, user]);

  const cancelRemoveSavedJob = useCallback(() => setJobPendingRemove(null), []);

  const adjustTaskLikes = useCallback((jobId: string, delta: number) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.jobId === jobId
          ? { ...task, likesCount: Math.max(0, Number(task.likesCount ?? 0) + delta) }
          : task,
      ),
    );
  }, []);

  const handleLikeClick = useCallback(
    (task: Task) => async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!user) return;
      const id = task.jobId;
      const wasLiked = likedJobIds.has(id);
      setLikedJobIds((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.delete(id);
        else next.add(id);
        return next;
      });
      adjustTaskLikes(id, wasLiked ? -1 : 1);
      setLikingJobId(id);
      try {
        if (wasLiked) await unlikeJob(user.uid, id);
        else await likeJob(user.uid, id, task.clientId);
      } catch (err) {
        console.error("Error toggling job like:", err);
        adjustTaskLikes(id, wasLiked ? 1 : -1);
        setLikedJobIds((prev) => {
          const next = new Set(prev);
          if (wasLiked) next.add(id);
          else next.delete(id);
          return next;
        });
      } finally {
        setLikingJobId(null);
      }
    },
    [adjustTaskLikes, likedJobIds, user],
  );

  const openFilterSheet = useCallback(() => {
    setDraftFilters(appliedFilters);
    setFilterOpen(true);
  }, [appliedFilters]);

  const handleClearFilterSheet = useCallback(() => {
    setDraftFilters(providerExploreFiltersDefault());
  }, []);

  const handleApplyFilterSheet = useCallback(() => {
    setAppliedFilters(draftFilters);
    setFilterOpen(false);
  }, [draftFilters]);

  const filteredTasks = useMemo(() => {
    let list = tasks.filter((t) => t.completionStatus === "open" || t.completionStatus === "in_progress");

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.title?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.address?.toLowerCase().includes(q),
      );
    }

    if (selectedCategory) {
      const needle = selectedCategory.toLowerCase();
      list = list.filter((t) => {
        const hay = [t.category, t.subCategory, ...(t.skills || []), ...(t.tags || [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(needle) || needle.split(/\s+/).some((w) => w.length > 2 && hay.includes(w));
      });
    }

    const loc = appliedFilters.location.trim().toLowerCase();
    if (loc) {
      list = list.filter(
        (t) =>
          t.address?.toLowerCase().includes(loc) ||
          t.description?.toLowerCase().includes(loc) ||
          t.category?.toLowerCase().includes(loc),
      );
    }

    // Flutter filter model stores area buckets (5km/25km/50km/100km), but
    // web jobs currently do not include reliable distance metadata; no-op for parity.

    if (appliedFilters.jobType !== "all" && appliedFilters.jobType !== "both") {
      list = list.filter((t) => t.jobType === appliedFilters.jobType);
    }

    if (appliedFilters.posterType !== "all") {
      list = list.filter((t) => (t.posterType || "individual") === appliedFilters.posterType);
    }

    if (appliedFilters.dayPosted !== "any") {
      list = list.filter((t) => withinDayPosted(t.createdAt, appliedFilters.dayPosted));
    }

    const minPrice = Number(appliedFilters.minPrice);
    if (appliedFilters.minPrice.trim() && Number.isFinite(minPrice)) {
      list = list.filter((t) => {
        const p = typeof t.price === "number" && !Number.isNaN(t.price) ? t.price : 0;
        return p >= minPrice;
      });
    }

    const maxPrice = Number(appliedFilters.maxPrice);
    if (appliedFilters.maxPrice.trim() && Number.isFinite(maxPrice)) {
      list = list.filter((t) => {
        const p = typeof t.price === "number" && !Number.isNaN(t.price) ? t.price : 0;
        return p <= maxPrice;
      });
    }

    if (appliedFilters.urgency !== "all") {
      list = list.filter((t) => t.urgency === appliedFilters.urgency);
    }

    return list;
  }, [tasks, searchQuery, selectedCategory, appliedFilters]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q.length >= 2) addRecentSearch(q);
    setSearchFocused(false);
  };

  const nearMeUrl = "/googlemap?focus=jobs&locate=1";
  const requestLocationAndNavigate = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Location is not supported in this browser.");
      setShowLocationModal(true);
      return;
    }
    setIsEnablingLocation(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      () => {
        setIsEnablingLocation(false);
        setShowLocationModal(false);
        router.push(nearMeUrl);
      },
      () => {
        setIsEnablingLocation(false);
        setLocationError("Location access is required to use Near me.");
        setShowLocationModal(true);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, [router]);

  const openProposalModal = useCallback(
    (task: Task) => {
      if (!user) {
        router.push(`/login?redirect=${encodeURIComponent("/provider-explore")}`);
        return;
      }
      setSelectedJobForProposal(task);
      setIsProposalModalOpen(true);
    },
    [router, user]
  );

  const closeProposalModal = useCallback(() => {
    setIsProposalModalOpen(false);
    setSelectedJobForProposal(null);
  }, []);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-white pb-28 dark:bg-[#003D62] lg:pb-10">
        <div ref={searchWrapRef} className="relative -mx-3 sm:-mx-6 lg:-mx-8">
          <ExploreHeroSection
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onSearchSubmit={handleSearchSubmit}
            onNearMe={requestLocationAndNavigate}
            onSearchFocus={() => setSearchFocused(true)}
            isFetchingLocation={isEnablingLocation}
          />
          <RecentSearchesDropdown
            open={searchFocused}
            query={searchQuery}
            searches={recentSearches}
            onSelect={handleSelectRecent}
            onRemove={removeRecentSearch}
            onNavigate={() => setSearchFocused(false)}
            className="left-4 right-4 top-[calc(100%-3.5rem)] sm:left-6 sm:right-6"
          />
        </div>

        <div className="mx-auto max-w-6xl px-3 pt-2 sm:px-6 lg:px-8 lg:pt-4">
          {/* Category strip (matched to client explore) */}
          <div className="-mx-3 mb-2 flex min-w-0 items-center gap-2 border-y-2 border-[#d2d2d3] px-5 pb-4 pt-[13px] dark:border-white/35 sm:-mx-6 lg:mx-0 lg:border-y-0 lg:px-0 lg:pb-1 lg:pt-0.5">
            <button
              type="button"
              onClick={openFilterSheet}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border border-gray-200 bg-[#E7E9EE] shadow-sm dark:border-white/25 dark:bg-darkBlue-203 dark:text-white/95 dark:shadow-none"
              aria-label="Open filters"
            >
              <SlidersHorizontal className="h-4 w-4" strokeWidth={2.2} />
            </button>
            <div className="category-scroll flex min-w-0 flex-1 items-center gap-[23px] overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {CATEGORY_CHIPS.map((label) => {
                const active = selectedCategory === label;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setSelectedCategory((c) => (c === label ? null : label))}
                    className={cn(
                      "max-w-[12rem] shrink-0 truncate text-left text-[15px] font-semibold transition-colors",
                      active ? "text-red-600 dark:text-red-400" : "text-darkBlue-003 dark:text-white",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop title */}
          <div className="mb-4 hidden lg:block">
            <h1 className="text-2xl font-bold text-[#1A202C] dark:text-white">Explore Jobs</h1>
          </div>

          {/* Job grid — two columns on mobile */}
          {loading ? (
            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="aspect-[3/4] animate-pulse rounded-2xl bg-gray-100 dark:bg-[#003D62]" />
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-gray-50 py-16 text-center text-gray-500 dark:border-transparent dark:bg-[#003D62] dark:text-white">
              <p className="text-base font-medium">No jobs found.</p>
              <p className="mt-1 text-sm">Try another search or category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
              {filteredTasks.map((task) => (
                <ProviderExploreJobCard
                  key={task.jobId}
                  task={task}
                  saved={savedIds.has(task.jobId)}
                  onToggleSave={handleSaveClick(task)}
                  onApply={(job) => openProposalModal(job)}
                  liked={likedJobIds.has(task.jobId)}
                  likesCount={task.likesCount ?? 0}
                  likePending={likingJobId === task.jobId}
                  onToggleLike={handleLikeClick(task)}
                />
              ))}
            </div>
          )}
        </div>

        <ProviderExploreFilterSheet
          open={filterOpen}
          draft={draftFilters}
          setDraft={setDraftFilters}
          onClose={() => setFilterOpen(false)}
          onClearAll={handleClearFilterSheet}
          onApply={handleApplyFilterSheet}
        />

        <RemoveSavedJobModal
          open={jobPendingRemove !== null}
          job={jobPendingRemove}
          onCancel={cancelRemoveSavedJob}
          onConfirm={confirmRemoveSavedJob}
        />
        <EnableLocationModal
          open={showLocationModal}
          loading={isEnablingLocation}
          error={locationError}
          onEnable={requestLocationAndNavigate}
          onLater={() => setShowLocationModal(false)}
        />
        <JobProposalApplyModal
          job={selectedJobForProposal}
          open={isProposalModalOpen}
          onClose={closeProposalModal}
          loginRedirectPath="/provider-explore"
        />
      </div>
    </DashboardLayout>
  );
}
