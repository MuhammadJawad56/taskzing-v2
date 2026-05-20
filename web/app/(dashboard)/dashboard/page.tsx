"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bookmark, RefreshCw, Briefcase, Circle } from "lucide-react";
import { useAuth } from "@/lib/api/AuthContext";
import { getProposalsByProviderId } from "@/lib/api/proposals";
import { getUserShowcases, type ShowcaseItem } from "@/lib/api/showcase";
import { getJobById } from "@/lib/api/jobs";
import { getUserData, updateUserProfile } from "@/lib/api/auth";
import { ProposalWithDetails } from "@/lib/types/proposal";
import { Task } from "@/lib/types/task";
import { ProviderExploreJobCard } from "@/components/task/ProviderExploreJobCard";
import { RemoveSavedJobModal } from "@/components/task/RemoveSavedJobModal";
import { OnlineStatusNoticeModal } from "@/components/modals/OnlineStatusNoticeModal";
import { AvailableForWorkOfflineConfirmModal } from "@/components/modals/AvailableForWorkOfflineConfirmModal";
import { parseUserPresenceFromDoc, userAppearsOnline } from "@/lib/api/presence";
import {
  listSavedJobIds,
  saveJobForUser,
  unsaveJobForUser,
} from "@/lib/providerSavedJobs";
import { getUserLikedJobIds, likeJob, unlikeJob } from "@/lib/api/likes";

function effectiveUserMode(userData: ReturnType<typeof useAuth>["userData"]) {
  return userData?.currentRole || userData?.role || "provider";
}

const ONLINE_STATUS_NOTICE_DISMISS_KEY = "taskzing:provider-online-status-modal-dismissed";

export default function DashboardPage() {
  const router = useRouter();
  const { user, userData, loading: authLoading, refreshUserData } = useAuth();
  const [isAvailable, setIsAvailable] = useState(false);
  const [metrics, setMetrics] = useState({
    myJobs: 0,
    completed: 0,
    inProgress: 0,
    totalEarning: 0,
  });
  const [showcases, setShowcases] = useState<ShowcaseItem[]>([]);
  const [currentTasks, setCurrentTasks] = useState<Array<{ job: Task; proposal: ProposalWithDetails }>>([]);
  const [isRefreshingWork, setIsRefreshingWork] = useState(false);
  const [isRefreshingTasks, setIsRefreshingTasks] = useState(false);
  const [showSavedJobs, setShowSavedJobs] = useState(false);
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const [savedJobs, setSavedJobs] = useState<Task[]>([]);
  const [savedJobsLoading, setSavedJobsLoading] = useState(false);
  const [jobPendingRemove, setJobPendingRemove] = useState<Task | null>(null);
  const [likedJobIds, setLikedJobIds] = useState<Set<string>>(new Set());
  const [likingJobId, setLikingJobId] = useState<string | null>(null);
  const [showOnlineStatusNotice, setShowOnlineStatusNotice] = useState(false);
  const [suppressOnlineStatusNotice, setSuppressOnlineStatusNotice] = useState(false);
  const [showOfflineConfirm, setShowOfflineConfirm] = useState(false);

  const savedJobIdSet = useMemo(() => new Set(savedJobIds), [savedJobIds]);

  const refreshSavedJobIds = useCallback(async () => {
    if (!user) return;
    const ids = await listSavedJobIds(user.uid);
    setSavedJobIds(ids);
  }, [user]);

  useEffect(() => {
    if (!user || !userData || effectiveUserMode(userData) === "client") return;
    void refreshSavedJobIds();
  }, [user, userData, refreshSavedJobIds]);

  const dashboardLikedJobsKey = user?.uid
    ? `${user.uid}:${userData ? effectiveUserMode(userData) : ""}`
    : "";

  useEffect(() => {
    if (!user?.uid || !userData || effectiveUserMode(userData) === "client") {
      setLikedJobIds(new Set());
      return;
    }
    const uid = user.uid;
    let alive = true;
    void getUserLikedJobIds(uid).then((ids) => {
      if (!alive) return;
      setLikedJobIds(new Set(ids));
    });
    return () => {
      alive = false;
    };
  }, [dashboardLikedJobsKey]);

  useEffect(() => {
    if (!user || !userData || effectiveUserMode(userData) === "client") return;
    const onVis = () => {
      if (!document.hidden) void refreshSavedJobIds();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [user, userData, refreshSavedJobIds]);

  useEffect(() => {
    if (!user || !userData || effectiveUserMode(userData) === "client") return;
    let alive = true;
    if (savedJobIds.length === 0) {
      setSavedJobs([]);
      setSavedJobsLoading(false);
      return () => {
        alive = false;
      };
    }
    (async () => {
      setSavedJobsLoading(true);
      try {
        const results = await Promise.all(savedJobIds.map((id) => getJobById(id)));
        if (!alive) return;
        setSavedJobs(results.filter((j): j is Task => j !== null));
      } finally {
        if (alive) setSavedJobsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [savedJobIds, user, userData]);

  const handleSavedJobToggle = useCallback(
    (task: Task) => async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!user) return;
      if (savedJobIdSet.has(task.jobId)) {
        setJobPendingRemove(task);
        return;
      }
      await saveJobForUser(user.uid, task.jobId, { posterUserId: task.clientId });
      setSavedJobIds((prev) => (prev.includes(task.jobId) ? prev : [...prev, task.jobId]));
    },
    [savedJobIdSet, user],
  );

  const confirmRemoveSavedJob = useCallback(async () => {
    if (!jobPendingRemove || !user) return;
    await unsaveJobForUser(user.uid, jobPendingRemove.jobId);
    setSavedJobIds((prev) => prev.filter((id) => id !== jobPendingRemove.jobId));
    setJobPendingRemove(null);
  }, [jobPendingRemove, user]);

  const cancelRemoveSavedJob = useCallback(() => setJobPendingRemove(null), []);

  const adjustTaskLikes = useCallback((jobId: string, delta: number) => {
    setSavedJobs((prev) =>
      prev.map((task) =>
        task.jobId === jobId
          ? { ...task, likesCount: Math.max(0, Number(task.likesCount ?? 0) + delta) }
          : task,
      ),
    );
  }, []);

  const handleLikeToggle = useCallback(
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

  const loadDashboardData = useCallback(async () => {
    if (!user) {
      console.log("[Dashboard] No user, skipping load");
      return;
    }
    if (effectiveUserMode(userData) === "client") {
      return;
    }

    try {
      console.log("[Dashboard] Starting to load dashboard data for user:", user.uid);

      // Load availability status from canonical presence fields.
      let currentUserData = userData;
      if (
        !currentUserData ||
        ((currentUserData as any).isAvailableForWork === undefined &&
          (currentUserData as any).availableFW === undefined)
      ) {
        console.log("[Dashboard] Fetching fresh userData");
        try {
          currentUserData = await getUserData(user.uid);
          console.log("[Dashboard] Fetched userData:", currentUserData);
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
      const availability = userAppearsOnline(
        currentUserData
          ? {
              isOnline: (currentUserData as any).isOnline,
              lastOnline: (currentUserData as any).lastOnline,
            }
          : null
      );
      console.log("[Dashboard] Availability status:", availability);
      setIsAvailable(availability);

      // Load proposals to get hired jobs
      console.log("[Dashboard] Fetching proposals for provider:", user.uid);
      const proposals = await getProposalsByProviderId(user.uid);
      console.log("[Dashboard] Total proposals fetched:", proposals.length);
      
      // Filter only hired proposals
      const hiredProposals = proposals.filter(p => p.isHired === true);
      console.log("[Dashboard] Hired proposals:", hiredProposals.length);
      console.log("[Dashboard] Sample hired proposals:", hiredProposals.slice(0, 3).map(p => ({
        applicationId: p.applicationId,
        jobId: p.jobId,
        isHired: p.isHired,
        status: p.status
      })));
      
      // Fetch job details for hired proposals
      const tasksWithProposals = await Promise.all(
        hiredProposals.map(async (proposal) => {
          try {
            const job = await getJobById(proposal.jobId);
            if (job) {
              console.log("[Dashboard] Found job for proposal:", proposal.jobId, "Job title:", job.title);
            } else {
              console.log("[Dashboard] Job not found for proposal:", proposal.jobId);
            }
            return job ? { job, proposal } : null;
          } catch (error) {
            console.error("[Dashboard] Error fetching job for proposal:", proposal.jobId, error);
            return null;
          }
        })
      );

      const validTasks = tasksWithProposals.filter(t => t !== null) as Array<{ job: Task; proposal: ProposalWithDetails }>;
      console.log("[Dashboard] Valid tasks with jobs:", validTasks.length);
      setCurrentTasks(validTasks);

      // Calculate metrics
      const totalJobs = hiredProposals.length;
      const completed = validTasks.filter(t => {
        const status = (t.job as any).completionStatus;
        return status === "completed";
      }).length;
      const inProgress = validTasks.filter(t => {
        const status = (t.job as any).completionStatus;
        return status === "in_progress" || status === "open" || status === undefined || status === null;
      }).length;
      
      // Calculate total earnings from completed jobs
      const totalEarning = validTasks
        .filter(t => {
          const status = (t.job as any).completionStatus;
          return status === "completed";
        })
        .reduce((sum, t) => sum + (t.proposal.bidAmount || 0), 0);

      const newMetrics = {
        myJobs: totalJobs,
        completed,
        inProgress,
        totalEarning,
      };
      console.log("[Dashboard] Setting metrics:", newMetrics);
      console.log("[Dashboard] Previous metrics:", metrics);
      
      // Update all state in a batch to ensure UI updates
      setMetrics(newMetrics);
      setCurrentTasks(validTasks);

      // Load showcase work
      console.log("[Dashboard] Fetching showcase work");
      const userShowcases = await getUserShowcases(user.uid);
      console.log("[Dashboard] Showcase work fetched:", userShowcases.length);
      setShowcases(userShowcases);
      
      console.log("[Dashboard] Dashboard data loaded successfully");
    } catch (error) {
      console.error("[Dashboard] Error loading dashboard data:", error);
      console.error("[Dashboard] Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      console.log("[Dashboard] Loading complete");
    }
  }, [user, userData]);

  useEffect(() => {
    if (!user) return;
    if (userData && effectiveUserMode(userData) === "client") return;
    void loadDashboardData();
  }, [user, userData, loadDashboardData]);

  // Poll profile so availability stays in sync across tabs/sessions.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const tick = async () => {
      const fresh = await getUserData(user.uid);
      if (cancelled || !fresh) return;
      const data = fresh as unknown as Record<string, unknown>;
      const live =
        !!fresh.isAvailableForWork ||
        !!fresh.availableFW ||
        parseUserPresenceFromDoc(data);
      setIsAvailable(live);
    };
    void tick();
    const id = window.setInterval(() => void tick(), 6000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [user]);

  // Refresh data when page becomes visible (e.g., returning from another tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && userData) {
        loadDashboardData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user, userData, loadDashboardData]);

  const updateAvailability = useCallback(
    async (newStatus: boolean) => {
      if (!user) return;
      const previousStatus = isAvailable;
      setIsAvailable(newStatus);

      try {
        await updateUserProfile(user.uid, {
          availableFW: newStatus,
          isAvailableForWork: newStatus,
          isOnline: newStatus,
        });
        await refreshUserData();
      } catch (error) {
        console.error("Error updating availability:", error);
        setIsAvailable(previousStatus);
      }
    },
    [isAvailable, refreshUserData, user],
  );

  const handleToggleAvailability = useCallback(() => {
    if (isAvailable) {
      setShowOfflineConfirm(true);
      return;
    }
    const dismissed =
      typeof window !== "undefined" && window.localStorage.getItem(ONLINE_STATUS_NOTICE_DISMISS_KEY) === "1";
    if (!dismissed) {
      setSuppressOnlineStatusNotice(false);
      setShowOnlineStatusNotice(true);
      return;
    }
    void updateAvailability(true);
  }, [isAvailable, updateAvailability]);

  const handleConfirmGoOffline = useCallback(() => {
    setShowOfflineConfirm(false);
    void updateAvailability(false);
  }, [updateAvailability]);

  const handleConfirmOnlineStatusNotice = useCallback(() => {
    if (suppressOnlineStatusNotice && typeof window !== "undefined") {
      window.localStorage.setItem(ONLINE_STATUS_NOTICE_DISMISS_KEY, "1");
    }
    setShowOnlineStatusNotice(false);
    void updateAvailability(true);
  }, [suppressOnlineStatusNotice, updateAvailability]);

  const handleRefreshWork = async () => {
    if (!user) return;

    try {
      setIsRefreshingWork(true);
      const userShowcases = await getUserShowcases(user.uid);
      setShowcases(userShowcases);
    } catch (error) {
      console.error("Error refreshing work:", error);
    } finally {
      setIsRefreshingWork(false);
    }
  };

  const handleRefreshTasks = async () => {
    if (!user) return;

    try {
      setIsRefreshingTasks(true);
      const proposals = await getProposalsByProviderId(user.uid);
      const hiredProposals = proposals.filter(p => p.isHired === true);
      
      const tasksWithProposals = await Promise.all(
        hiredProposals.map(async (proposal) => {
          const job = await getJobById(proposal.jobId);
          return job ? { job, proposal } : null;
        })
      );

      const validTasks = tasksWithProposals.filter(t => t !== null) as Array<{ job: Task; proposal: ProposalWithDetails }>;
      setCurrentTasks(validTasks);

      // Update metrics
      const completed = validTasks.filter(t => {
        const status = (t.job as any).completionStatus;
        return status === "completed";
      }).length;
      const inProgress = validTasks.filter(t => {
        const status = (t.job as any).completionStatus;
        return status === "in_progress" || status === "open" || status === undefined || status === null;
      }).length;
      const totalEarning = validTasks
        .filter(t => {
          const status = (t.job as any).completionStatus;
          return status === "completed";
        })
        .reduce((sum, t) => sum + (t.proposal.bidAmount || 0), 0);

      setMetrics({
        myJobs: validTasks.length,
        completed,
        inProgress,
        totalEarning,
      });
    } catch (error) {
      console.error("Error refreshing tasks:", error);
    } finally {
      setIsRefreshingTasks(false);
    }
  };

  if (!authLoading && userData && effectiveUserMode(userData) === "client") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent">
        <p className="text-gray-600 dark:text-gray-400">Opening client home…</p>
      </div>
    );
  }

  if (showSavedJobs) {
    return (
      <div className="min-h-screen min-w-0 bg-transparent">
        <div className="mx-auto max-w-7xl min-w-0 px-3 py-8 sm:px-6">
          <div className="mb-6 flex min-w-0 flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Bookmark className="h-6 w-6 shrink-0 fill-red-600 text-red-600 dark:fill-red-500 dark:text-red-500" aria-hidden />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">Show Saved</h1>
            </div>
            <button
              type="button"
              onClick={() => setShowSavedJobs(false)}
              className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-darkBlue-203 dark:text-gray-200 dark:hover:bg-darkBlue-343"
            >
              Back to dashboard
            </button>
          </div>
          <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
            Jobs you bookmark on{" "}
            <Link href="/provider-explore" className="font-medium text-red-600 underline-offset-2 hover:underline dark:text-red-400">
              Explore
            </Link>{" "}
            appear here.
          </p>
          {savedJobsLoading ? (
            <p className="text-center text-gray-600 dark:text-gray-400">Loading saved jobs…</p>
          ) : savedJobs.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 py-16 text-center dark:border-gray-700 dark:bg-darkBlue-203/40">
              <p className="text-base font-medium text-gray-700 dark:text-gray-300">No saved jobs yet</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Tap Save on a job card in Explore to add it here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
              {savedJobs.map((task) => (
                <ProviderExploreJobCard
                  key={task.jobId}
                  task={task}
                  saved={savedJobIdSet.has(task.jobId)}
                  onToggleSave={handleSavedJobToggle(task)}
                  liked={likedJobIds.has(task.jobId)}
                  likesCount={task.likesCount ?? 0}
                  likePending={likingJobId === task.jobId}
                  onToggleLike={handleLikeToggle(task)}
                />
              ))}
            </div>
          )}
        </div>

        <RemoveSavedJobModal
          open={jobPendingRemove !== null}
          job={jobPendingRemove}
          onCancel={cancelRemoveSavedJob}
          onConfirm={confirmRemoveSavedJob}
        />

        <OnlineStatusNoticeModal
          open={showOnlineStatusNotice}
          doNotShowAgain={suppressOnlineStatusNotice}
          onDoNotShowAgainChange={setSuppressOnlineStatusNotice}
          onCancel={() => setShowOnlineStatusNotice(false)}
          onConfirm={handleConfirmOnlineStatusNotice}
        />

        <AvailableForWorkOfflineConfirmModal
          open={showOfflineConfirm}
          onCancel={() => setShowOfflineConfirm(false)}
          onConfirm={handleConfirmGoOffline}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen min-w-0 bg-transparent">
      <div className="mx-auto max-w-7xl min-w-0 px-4 py-8 sm:px-6">
        {/* Top Section: Availability Toggle */}
        <div className="mb-8 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <span className="text-gray-700 dark:text-gray-300 font-medium">
              Available For Work:
            </span>
            <div className="flex items-center gap-2">
              <Circle 
                className={`h-3 w-3 ${isAvailable ? 'text-green-500 fill-green-500' : 'text-gray-400 fill-gray-400'}`} 
              />
              <span className={`text-sm font-medium ${isAvailable ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {isAvailable ? 'Online' : 'Offline'}
              </span>
              <button
                onClick={handleToggleAvailability}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isAvailable ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isAvailable ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Provider Performance Section */}
        <div className="mb-8 min-w-0">
          <div className="mb-1 flex min-w-0 items-center justify-between gap-3">
            <h2 className="min-w-0 flex-1 text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
              Provider Performance
            </h2>
            <button
              type="button"
              onClick={() => setShowSavedJobs(true)}
              aria-pressed={false}
              aria-label="View jobs saved from Explore"
              className="flex shrink-0 items-center gap-2 rounded-full border border-gray-300 bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-200 dark:border-gray-600 dark:bg-darkBlue-203 dark:text-gray-200 dark:hover:bg-darkBlue-343"
            >
              <Bookmark className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <span>Show Saved</span>
            </button>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
            Provider Performance Description
          </p>
          
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-600/35">
            <div className="grid min-w-0 grid-cols-4 gap-px bg-gray-200 dark:bg-white/10">
              <div className="min-w-0 bg-white px-1 py-2.5 text-center dark:bg-darkBlue-013 sm:p-4 sm:text-left">
                <p className="mb-0.5 text-lg font-bold tabular-nums leading-none text-gray-900 dark:text-white sm:mb-1 sm:text-2xl">
                  {metrics.myJobs}
                </p>
                <p className="text-[10px] font-normal leading-tight text-gray-600 dark:text-gray-400 sm:text-sm">
                  My Jobs
                </p>
              </div>
              <div className="min-w-0 bg-white px-1 py-2.5 text-center dark:bg-darkBlue-013 sm:p-4 sm:text-left">
                <p className="mb-0.5 text-lg font-bold tabular-nums leading-none text-gray-900 dark:text-white sm:mb-1 sm:text-2xl">
                  {metrics.completed}
                </p>
                <p className="text-[10px] font-normal leading-tight text-gray-600 dark:text-gray-400 sm:text-sm">
                  Completed
                </p>
              </div>
              <div className="min-w-0 bg-white px-1 py-2.5 text-center dark:bg-darkBlue-013 sm:p-4 sm:text-left">
                <p className="mb-0.5 text-lg font-bold tabular-nums leading-none text-gray-900 dark:text-white sm:mb-1 sm:text-2xl">
                  {metrics.inProgress}
                </p>
                <p className="text-[10px] font-normal leading-tight text-gray-600 dark:text-gray-400 sm:text-sm">
                  In Progress
                </p>
              </div>
              <div className="min-w-0 bg-white px-1 py-2.5 text-center dark:bg-darkBlue-013 sm:p-4 sm:text-left">
                <p className="mb-0.5 text-lg font-bold tabular-nums leading-none text-gray-900 dark:text-white sm:mb-1 sm:text-2xl">
                  ${metrics.totalEarning.toFixed(2)}
                </p>
                <p className="text-[10px] font-normal leading-tight text-gray-600 dark:text-gray-400 sm:text-sm">
                  <span className="block sm:inline">Total </span>
                  <span className="block sm:inline">Earning</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* My Work Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Work</h2>
            <button
              onClick={handleRefreshWork}
              disabled={isRefreshingWork}
              className="rounded-full p-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-darkBlue-203"
            >
              <RefreshCw 
                className={`h-5 w-5 text-blue-500 ${isRefreshingWork ? 'animate-spin' : ''}`} 
              />
            </button>
          </div>

          {showcases.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                No Showcase Work
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Create First Showcase
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {showcases.slice(0, 6).map((showcase) => (
                <div
                  key={showcase.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push("/dashboard/showcase")}
                >
                  {showcase.imageUrls && showcase.imageUrls.length > 0 && (
                    <img
                      src={showcase.imageUrls[0]}
                      alt={showcase.title}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {showcase.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {showcase.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Current Tasks Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Current Tasks</h2>
            <button
              onClick={handleRefreshTasks}
              disabled={isRefreshingTasks}
              className="rounded-full p-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-darkBlue-203"
            >
              <RefreshCw 
                className={`h-5 w-5 text-gray-900 dark:text-gray-100 ${isRefreshingTasks ? 'animate-spin' : ''}`} 
              />
            </button>
          </div>

          {currentTasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">No current tasks</p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentTasks.map(({ job, proposal }) => {
                const status = (job as any).completionStatus;
                const isCompleted = status === "completed";
                const isInProgress = status === "in_progress" || status === "open" || status === undefined || status === null;
                
                return (
                  <div
                    key={job.jobId}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => router.push(`/job-details/${job.jobId}`)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                          {job.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                          {job.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-red-500 font-medium">
                            ${proposal.bidAmount}
                          </span>
                          {isCompleted && (
                            <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-darkBlue-203 dark:text-gray-300">
                              Completed
                            </span>
                          )}
                          {isInProgress && (
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs">
                              In Progress
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <OnlineStatusNoticeModal
        open={showOnlineStatusNotice}
        doNotShowAgain={suppressOnlineStatusNotice}
        onDoNotShowAgainChange={setSuppressOnlineStatusNotice}
        onCancel={() => setShowOnlineStatusNotice(false)}
        onConfirm={handleConfirmOnlineStatusNotice}
      />

      <AvailableForWorkOfflineConfirmModal
        open={showOfflineConfirm}
        onCancel={() => setShowOfflineConfirm(false)}
        onConfirm={handleConfirmGoOffline}
      />
    </div>
  );
}
