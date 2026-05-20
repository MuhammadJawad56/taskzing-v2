"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, RefreshCw, Briefcase } from "lucide-react";
import { useAuth } from "@/lib/api/AuthContext";
import { getProposalsByProviderId } from "@/lib/api/proposals";
import { getUserShowcases, type ShowcaseItem } from "@/lib/api/showcase";
import { getJobById } from "@/lib/api/jobs";
import { getUserData, updateUserProfile } from "@/lib/api/auth";
import { ProposalWithDetails } from "@/lib/types/proposal";
import { Task } from "@/lib/types/task";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { OnlineStatusNoticeModal } from "@/components/modals/OnlineStatusNoticeModal";
import { AvailableForWorkOfflineConfirmModal } from "@/components/modals/AvailableForWorkOfflineConfirmModal";
import { parseUserPresenceFromDoc, userAppearsOnline } from "@/lib/api/presence";

const ONLINE_STATUS_NOTICE_DISMISS_KEY = "taskzing:provider-online-status-modal-dismissed";

export default function ProviderDashboardPage() {
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
  const [showOnlineStatusNotice, setShowOnlineStatusNotice] = useState(false);
  const [suppressOnlineStatusNotice, setSuppressOnlineStatusNotice] = useState(false);
  const [showOfflineConfirm, setShowOfflineConfirm] = useState(false);

  const loadDashboardData = useCallback(async () => {
    if (!user) {
      console.log("[Dashboard] No user, skipping load");
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
    console.log("[Dashboard] useEffect triggered - user:", !!user, "userData:", !!userData, "authLoading:", authLoading);
    
    // If auth is still loading, wait
    if (authLoading) {
      console.log("[Dashboard] Auth still loading, waiting...");
      return;
    }
    
    // If no user, stop loading
    if (!user) {
      console.log("[Dashboard] No user, setting loading to false");
      setIsLoading(false);
      return;
    }
    
    // Load dashboard data even if userData is not yet available
    // userData will be fetched inside loadDashboardData if needed
    console.log("[Dashboard] Calling loadDashboardData");
    loadDashboardData();
  }, [user, userData, authLoading, loadDashboardData]);

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
      if (!document.hidden && user && !authLoading) {
        loadDashboardData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user, authLoading, loadDashboardData]);

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

      setMetrics(prev => ({
        myJobs: validTasks.length,
        completed,
        inProgress,
        totalEarning,
      }));
    } catch (error) {
      console.error("Error refreshing tasks:", error);
    } finally {
      setIsRefreshingTasks(false);
    }
  };

  const earningDisplay =
    metrics.totalEarning === 0
      ? "$0"
      : `$${metrics.totalEarning % 1 === 0 ? metrics.totalEarning.toFixed(0) : metrics.totalEarning.toFixed(2)}`;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-white pb-24 dark:bg-darkBlue-013 lg:pb-8">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
          {/* Available For Work — reference: one medium-gray line + grey toggle */}
          <div className="mb-7 flex items-center justify-between gap-3 sm:mb-8">
            <p className="min-w-0 text-sm font-normal leading-snug text-[#718096] dark:text-gray-400">
              Available For Work:{" "}
              <span className={isAvailable ? "text-green-600 dark:text-green-400" : ""}>
                {isAvailable ? "Online" : "Offline"}
              </span>
            </p>
            <button
              type="button"
              onClick={handleToggleAvailability}
              aria-pressed={isAvailable}
              aria-label={isAvailable ? "Set unavailable for work" : "Set available for work"}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
                isAvailable ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  isAvailable ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Provider Performance — title + Saved one row; compact separate stat columns */}
          <div className="mb-10">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <h2 className="min-w-0 flex-1 text-[13px] font-bold leading-none tracking-tight text-black whitespace-nowrap dark:text-white sm:text-lg sm:leading-tight md:text-xl lg:text-2xl">
                Provider Performance
              </h2>
              <button
                type="button"
                onClick={() => router.push("/all-showcases")}
                className="flex shrink-0 items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600 transition hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/15 sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs"
              >
                <Bookmark className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={1.5} />
                Saved
              </button>
            </div>
            <p className="mt-1.5 text-xs font-normal leading-snug text-[#A0AEC0] dark:text-gray-500 sm:text-sm">
              Provider Performance Description
            </p>

            <div className="mt-4 rounded-xl bg-[#F5F6F8] p-2 dark:bg-white/[0.04] sm:mt-5 sm:rounded-2xl sm:p-2.5">
              <div className="flex min-w-0 flex-row justify-between gap-1.5 sm:gap-2">
                {(
                  [
                    { value: String(metrics.myJobs), label: "My Jobs" as const },
                    { value: String(metrics.completed), label: "Completed" as const },
                    { value: String(metrics.inProgress), label: "In Progress" as const },
                    { value: earningDisplay, label: "Total Earning" as const },
                  ] as const
                ).map(({ value, label }) => (
                  <div
                    key={label}
                    className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center rounded-2xl bg-white px-0.5 py-2.5 text-center shadow-[0_2px_8px_rgba(15,23,42,0.07)] dark:bg-darkBlue-203 dark:shadow-[0_2px_8px_rgba(0,0,0,0.35)] sm:rounded-3xl sm:py-3.5 sm:shadow-[0_3px_12px_rgba(15,23,42,0.08)]"
                  >
                    <span className="text-base font-bold tabular-nums leading-none text-black dark:text-white sm:text-lg">
                      {value}
                    </span>
                    <span className="mt-1 max-w-full px-0.5 text-center text-[9px] font-normal leading-[1.15] text-black dark:text-gray-200 sm:text-[10px]">
                      {label === "Total Earning" ? (
                        <>
                          <span className="block">Total</span>
                          <span className="block">Earning</span>
                        </>
                      ) : (
                        label
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* My Work */}
          <div className="mb-10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold leading-tight text-black dark:text-white sm:text-2xl">My Work</h2>
              <button
                type="button"
                onClick={handleRefreshWork}
                disabled={isRefreshingWork}
                className="rounded-full p-2 text-[#3182CE] transition hover:bg-gray-50 dark:text-blue-400 dark:hover:bg-white/10"
                aria-label="Refresh showcase work"
              >
                <RefreshCw className={`h-5 w-5 ${isRefreshingWork ? "animate-spin" : ""}`} strokeWidth={2} />
              </button>
            </div>

            {showcases.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Briefcase className="mb-5 h-[4.5rem] w-[4.5rem] text-[#CBD5E0] dark:text-gray-600" strokeWidth={1.15} />
                <p className="text-base font-normal text-[#718096] dark:text-gray-400">No Showcase Work</p>
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/showcase")}
                  className="mt-1.5 text-sm font-normal text-[#718096] dark:text-gray-400"
                >
                  Create First Showcase
                </button>
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

          {/* My Current Tasks */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold leading-tight text-black dark:text-white sm:text-2xl">
                My Current Tasks
              </h2>
              <button
                type="button"
                onClick={handleRefreshTasks}
                disabled={isRefreshingTasks}
                className="rounded-full p-2 text-black transition hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/10"
                aria-label="Refresh tasks"
              >
                <RefreshCw className={`h-5 w-5 ${isRefreshingTasks ? "animate-spin" : ""}`} strokeWidth={2} />
              </button>
            </div>

            {currentTasks.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm font-normal text-[#A0AEC0] dark:text-gray-500">No current tasks</p>
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
                              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">
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
    </DashboardLayout>
  );
}
