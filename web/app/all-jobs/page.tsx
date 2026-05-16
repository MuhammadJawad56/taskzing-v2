"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, ListFilter, MoreVertical, Mail, Plus, Users, Info, Trash2, Briefcase, AlertTriangle, X } from "lucide-react";
import { useAuth } from "@/lib/api/AuthContext";
import { getJobsByClientId, deleteJob } from "@/lib/api/jobs";
import { getProposalCounts } from "@/lib/api/proposals";
import { Task } from "@/lib/types/task";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AllJobsFilterSheetContent } from "@/components/jobs/AllJobsFilterSheetContent";
import { AllJobsFilterDesktopPanel } from "@/components/jobs/AllJobsFilterDesktopPanel";
import { AllJobsFilterSummaryBar } from "@/components/jobs/AllJobsFilterSummaryBar";
import { FlutterStyleFilterBottomSheet } from "@/components/jobs/FlutterStyleFilterBottomSheet";
import {
  applyAllJobsAdvancedFilters,
  emptyAllJobsAdvancedFilter,
  hasActiveAllJobsAdvancedFilter,
  type AllJobsAdvancedFilter,
} from "@/lib/jobs/allJobsAdvancedFilter";

type TabType = "all" | "active" | "inProgress" | "completed";

export default function AllJobsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [jobs, setJobs] = useState<Task[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<Task | null>(null);
  const [proposalCounts, setProposalCounts] = useState<Record<string, { total: number; hired: number }>>({});
  const [advancedFilter, setAdvancedFilter] = useState<AllJobsAdvancedFilter>(emptyAllJobsAdvancedFilter);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [isLgUp, setIsLgUp] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsLgUp(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (user) {
      loadJobs();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  // Refresh proposal counts when page becomes visible (e.g., returning from proposals page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && jobs.length > 0) {
        // Refresh proposal counts
        const refreshCounts = async () => {
          const counts: Record<string, { total: number; hired: number }> = {};
          await Promise.all(
            jobs.map(async (job) => {
              const countsForJob = await getProposalCounts(job.jobId);
              counts[job.jobId] = countsForJob;
            })
          );
          setProposalCounts(counts);
        };
        refreshCounts();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user, jobs]);

  useEffect(() => {
    filterJobs();
  }, [jobs, activeTab, searchQuery, advancedFilter]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const loadJobs = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const userJobs = await getJobsByClientId(user.uid);
      setJobs(userJobs);
      
      // Load proposal counts for all jobs
      const counts: Record<string, { total: number; hired: number }> = {};
      await Promise.all(
        userJobs.map(async (job) => {
          const countsForJob = await getProposalCounts(job.jobId);
          counts[job.jobId] = countsForJob;
        })
      );
      setProposalCounts(counts);
    } catch (error) {
      console.error("Error loading jobs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterJobs = () => {
    let filtered = [...jobs];

    // Filter by tab — matches Flutter `AllJobsProposalsProvider.filteredJobs` (all_jobs_provider.dart)
    if (activeTab === "active") {
      filtered = filtered.filter((job) => (job.proposalAcceptance ?? "open") === "open");
    } else if (activeTab === "inProgress") {
      filtered = filtered.filter((job) => job.completionStatus === "in_progress");
    } else if (activeTab === "completed") {
      filtered = filtered.filter((job) => job.completionStatus === "completed");
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          job.title?.toLowerCase().includes(query) ||
          job.description?.toLowerCase().includes(query) ||
          job.category?.toLowerCase().includes(query)
      );
    }

    filtered = applyAllJobsAdvancedFilters(filtered, advancedFilter);

    setFilteredJobs(filtered);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
    return `${Math.floor(diffInSeconds / 2592000)} months ago`;
  };

  const getJobPrice = (job: Task) => {
    if (job.jobType === "hourly" && (job as any).hourlyRate) {
      return `Hourly $${(job as any).hourlyRate}/hr`;
    } else if (job.jobType === "fixed" && (job as any).fixedPrice) {
      return `Fixed Price $${(job as any).fixedPrice}`;
    } else if (job.price) {
      return job.jobType === "hourly" ? `Hourly $${job.price}/hr` : `Fixed Price $${job.price}`;
    }
    return "Price not set";
  };

  const getCompletionStatus = (job: Task) => {
    const status = (job as any).completionStatus;
    if (status === "open" || status === undefined || status === null) {
      return "open";
    }
    return status;
  };

  const handleViewProposals = (jobId: string) => {
    router.push(`/all-jobs/${jobId}/proposals`);
    setOpenMenuId(null);
  };


  const handleViewJobDetails = (jobId: string) => {
    router.push(`/all-jobs/${jobId}`);
    setOpenMenuId(null);
  };

  const handleDeleteJob = (jobId: string) => {
    const job = jobs.find(j => j.jobId === jobId);
    if (job) {
      setJobToDelete(job);
      setShowDeleteModal(true);
    }
    setOpenMenuId(null);
  };

  const confirmDeleteJob = async () => {
    if (!jobToDelete || !user) return;

    try {
      // Delete job from Firebase
      await deleteJob(jobToDelete.jobId, user.uid);
      
      // After deletion, remove from local state and close modal
      const updatedJobs = jobs.filter(j => j.jobId !== jobToDelete.jobId);
      setJobs(updatedJobs);
      setFilteredJobs(filteredJobs.filter(j => j.jobId !== jobToDelete.jobId));
      
      // Remove proposal counts for deleted job
      const updatedCounts = { ...proposalCounts };
      delete updatedCounts[jobToDelete.jobId];
      setProposalCounts(updatedCounts);
      
      setShowDeleteModal(false);
      setJobToDelete(null);
      
      // Show success message
      alert("Job deleted successfully.");
    } catch (error: any) {
      console.error("Error deleting job:", error);
      const errorMessage = error?.message || "Failed to delete job. Please try again.";
      alert(errorMessage);
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-transparent">
        <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Jobs & Proposals
          </h1>
          <button
            onClick={() => router.push("/post-task")}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
          >
            <Plus className="h-5 w-5" />
            Post New Job
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-4 border-b border-gray-200 dark:border-gray-600/40">
          {[
            { id: "all" as TabType, label: "All Jobs" },
            { id: "active" as TabType, label: "Active" },
            { id: "inProgress" as TabType, label: "In Progress" },
            { id: "completed" as TabType, label: "Completed" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-1 pb-3 font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-b-2 border-red-500 text-red-500"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search and Filter — matches Flutter all_jobs_widget.dart (accent5 / accent2 / 12px gap) */}
        <div className="mb-3 flex gap-3 sm:mb-4">
          <div className="relative min-h-[44px] flex-1 sm:min-h-[48px]">
            <div className="flex h-11 min-h-[44px] items-center rounded-lg border border-[#D9D9D9] bg-[#E7E9EE] pl-2 sm:h-12 sm:min-h-[48px] dark:border-darkBlue-003 dark:bg-darkBlue-343">
              <Search
                className="ml-1 h-5 w-5 shrink-0 text-[#808080] dark:text-white"
                strokeWidth={2}
                aria-hidden
              />
              <input
                type="text"
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="min-h-0 flex-1 border-0 bg-transparent py-2 pl-2 pr-3 text-sm text-gray-900 placeholder:text-[#808080] focus:outline-none focus:ring-0 dark:text-white dark:placeholder:text-white"
              />
            </div>
          </div>
          <div className="relative shrink-0">
            <button
              type="button"
              aria-label="Open filters"
              aria-expanded={filterSheetOpen}
              onClick={() => setFilterSheetOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#D9D9D9] bg-[#E7E9EE] transition-colors hover:opacity-95 sm:h-12 sm:w-12 dark:border-darkBlue-003 dark:bg-darkBlue-343"
            >
              <ListFilter
                className={`h-5 w-5 ${hasActiveAllJobsAdvancedFilter(advancedFilter) ? "text-[#F21A1A]" : "text-[#808080] dark:text-white"}`}
                strokeWidth={2}
                aria-hidden
              />
            </button>
            {hasActiveAllJobsAdvancedFilter(advancedFilter) ? (
              <span
                className="pointer-events-none absolute right-2 top-2 z-10 h-2 w-2 rounded-full bg-[#F21A1A]"
                aria-hidden
              />
            ) : null}
          </div>
        </div>

        <AllJobsFilterSummaryBar
          value={advancedFilter}
          onClear={() => setAdvancedFilter(emptyAllJobsAdvancedFilter())}
        />

        {filterSheetOpen && isLgUp ? (
          <AllJobsFilterDesktopPanel
              value={advancedFilter}
              onChange={setAdvancedFilter}
              onApply={() => setFilterSheetOpen(false)}
              onReset={() => {
                setAdvancedFilter(emptyAllJobsAdvancedFilter());
                setFilterSheetOpen(false);
              }}
              onClose={() => setFilterSheetOpen(false)}
          />
        ) : null}

        {!isLgUp ? (
          <FlutterStyleFilterBottomSheet open={filterSheetOpen} onClose={() => setFilterSheetOpen(false)}>
            <AllJobsFilterSheetContent
              value={advancedFilter}
              onChange={setAdvancedFilter}
              onApply={() => setFilterSheetOpen(false)}
              onReset={() => {
                setAdvancedFilter(emptyAllJobsAdvancedFilter());
                setFilterSheetOpen(false);
              }}
            />
          </FlutterStyleFilterBottomSheet>
        ) : null}

        {/* Jobs List */}
        {isLoading ? (
          <div className="py-12 text-center">
            <p className="text-gray-600 dark:text-gray-300">Loading jobs...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-600 dark:text-gray-200">
              {searchQuery.trim() || hasActiveAllJobsAdvancedFilter(advancedFilter)
                ? "No jobs match your search or filters."
                : "No jobs posted yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((job) => {
              const status = getCompletionStatus(job);
              const isOpen = status === "open" || status === undefined || status === null;
              
              return (
                <div
                  key={job.jobId}
                  className="rounded-lg border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md dark:border-gray-600/40 dark:bg-darkBlue-003"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      {/* Title and Status Tags */}
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {job.title}
                        </h3>
                        <div className="flex items-center gap-2">
                          {isOpen && (
                            <>
                              <span className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded text-xs font-medium">
                                <Mail className="h-3 w-3" />
                                ACCEPTING
                              </span>
                              <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded text-xs font-medium">
                                OPEN
                              </span>
                            </>
                          )}
                          {status === "in_progress" && (
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                              IN PROGRESS
                            </span>
                          )}
                          {status === "completed" && (
                            <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-darkBlue-203 dark:text-gray-200">
                              COMPLETED
                            </span>
                          )}
                          <div className="relative" ref={menuRef}>
                            <button
                              onClick={() => setOpenMenuId(openMenuId === job.jobId ? null : job.jobId)}
                              className="rounded p-1 hover:bg-gray-100 dark:hover:bg-darkBlue-203"
                            >
                              <MoreVertical className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            </button>
                            
                            {openMenuId === job.jobId && (
                              <div className="absolute right-0 top-8 z-10 mt-1 w-48 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600/50 dark:bg-darkBlue-013">
                                <button
                                  onClick={() => handleViewProposals(job.jobId)}
                                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors first:rounded-t-lg hover:bg-gray-100 dark:hover:bg-darkBlue-203"
                                >
                                  <Users className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                                  <span className="text-gray-900 dark:text-white">View Proposals</span>
                                </button>
                                <button
                                  onClick={() => handleViewJobDetails(job.jobId)}
                                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-100 dark:hover:bg-darkBlue-203"
                                >
                                  <Info className="h-5 w-5 text-red-500" />
                                  <span className="text-gray-900 dark:text-white">View Job Details</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteJob(job.jobId)}
                                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-red-600 transition-colors last:rounded-b-lg hover:bg-gray-100 dark:text-red-400 dark:hover:bg-darkBlue-203"
                                >
                                  <Trash2 className="h-5 w-5" />
                                  <span>Delete Job</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Job Details */}
                      <div className="flex items-center gap-4 mb-3 text-sm text-gray-600 dark:text-gray-400">
                        <span>Posted {formatTimeAgo(job.createdAt)}</span>
                        <span className="text-red-500 font-medium">
                          {getJobPrice(job)}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-2">
                        {job.description || "No description provided."}
                      </p>

                      {/* Proposals and Hired Count */}
                      <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                        <span>
                          {proposalCounts[job.jobId]?.total || 0} Proposals
                        </span>
                        <span>
                          {proposalCounts[job.jobId]?.hired || 0} Hired
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Delete Job Confirmation Modal */}
        {showDeleteModal && jobToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="mx-4 w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-darkBlue-013">
              {/* Modal Header */}
              <div className="flex items-center justify-center gap-2 px-6 pt-6 pb-4">
                <Trash2 className="h-5 w-5 text-red-500" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Delete Job
                </h2>
              </div>

              {/* Warning Message */}
              <div className="px-6 pb-4">
                <p className="text-gray-700 dark:text-gray-300 text-center">
                  Are you sure you want to delete this job? All proposals and related data will be permanently removed.
                </p>
              </div>

              {/* Job Title Display */}
              <div className="px-6 pb-4">
                <div className="relative flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg">
                  <Briefcase className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <p className="text-gray-900 dark:text-white font-medium">
                    {jobToDelete.title}
                  </p>
                </div>
              </div>

              {/* Irreversible Action Notice */}
              <div className="px-6 pb-4">
                <div className="flex items-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <p className="text-sm text-green-700 dark:text-green-300">
                    This action cannot be undone.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 px-6 pb-6 justify-end">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setJobToDelete(null);
                  }}
                  className="px-6 py-2 text-gray-600 dark:text-gray-400 font-medium hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteJob}
                  className="px-6 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </DashboardLayout>
  );
}
