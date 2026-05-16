"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Sliders,
  Users,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Star,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "@/lib/api/AuthContext";
import { getJobById } from "@/lib/api/jobs";
import { getProposalsByJobId } from "@/lib/api/proposals";
import {
  completeJob,
  hireProvider,
  JobCompletionError,
  updateApplicationStatus,
  updateProposalMessagedStatus,
} from "@/lib/api/jobApplications";
import { Task } from "@/lib/types/task";
import { ProposalWithDetails } from "@/lib/types/proposal";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FlutterStyleFilterBottomSheet } from "@/components/jobs/FlutterStyleFilterBottomSheet";
import {
  ProposalsListFilterSheetContent,
  proposalSortSummary,
  type ProposalSortKey,
} from "@/components/jobs/ProposalsListFilterSheetContent";

type ProposalTabType = "all" | "shortlisted" | "messaged" | "archived";

export default function JobProposalsPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params?.jobId as string;
  const { user } = useAuth();

  const [job, setJob] = useState<Task | null>(null);
  const [proposals, setProposals] = useState<ProposalWithDetails[]>([]);
  const [filteredProposals, setFilteredProposals] = useState<ProposalWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [proposalTab, setProposalTab] = useState<ProposalTabType>("all");
  const [proposalSearchQuery, setProposalSearchQuery] = useState("");
  const [proposalSort, setProposalSort] = useState<ProposalSortKey>("newest");
  const [proposalFilterSheetOpen, setProposalFilterSheetOpen] = useState(false);

  // Per-action loading state (keyed by `${applicationId}:${action}`)
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Hire confirmation dialog
  const [hireTarget, setHireTarget] = useState<ProposalWithDetails | null>(null);
  const [hireCloseJob, setHireCloseJob] = useState(true);

  // Complete confirmation dialog
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completionNotes, setCompletionNotes] = useState("");

  const loadData = useCallback(async () => {
    if (!jobId) return;

    try {
      setIsLoading(true);
      const [jobData, proposalsData] = await Promise.all([
        getJobById(jobId),
        getProposalsByJobId(jobId),
      ]);

      if (jobData) {
        setJob(jobData);
      } else {
        router.push("/all-jobs");
        return;
      }

      setProposals(proposalsData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [jobId, router]);

  useEffect(() => {
    if (jobId) {
      loadData();
    }
  }, [jobId, loadData]);

  useEffect(() => {
    let filtered = [...proposals];

    if (proposalTab === "shortlisted") {
      filtered = filtered.filter((p) => p.status === "shortlisted");
    } else if (proposalTab === "messaged") {
      filtered = filtered.filter((p) => p.isMessaged);
    } else if (proposalTab === "archived") {
      filtered = filtered.filter((p) => p.status === "archived");
    }

    if (proposalSearchQuery.trim()) {
      const q = proposalSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.provider?.fullName?.toLowerCase().includes(q) ||
          p.proposalText?.toLowerCase().includes(q)
      );
    }

    const parseCreated = (p: ProposalWithDetails) =>
      new Date(p.createdAt || 0).getTime() || 0;
    const bidOf = (p: ProposalWithDetails) =>
      Number.isFinite(Number(p.bidAmount)) ? Number(p.bidAmount) : 0;

    const sorted = [...filtered];
    switch (proposalSort) {
      case "newest":
        sorted.sort((a, b) => parseCreated(b) - parseCreated(a));
        break;
      case "oldest":
        sorted.sort((a, b) => parseCreated(a) - parseCreated(b));
        break;
      case "bid_asc":
        sorted.sort((a, b) => bidOf(a) - bidOf(b));
        break;
      case "bid_desc":
        sorted.sort((a, b) => bidOf(b) - bidOf(a));
        break;
      default:
        break;
    }

    setFilteredProposals(sorted);
  }, [proposals, proposalTab, proposalSearchQuery, proposalSort]);

  const isOwner = Boolean(user && job && user.uid === job.clientId);
  const hasHiredContractor = Boolean(
    (job?.contractorId && job.contractorId.length > 0) ||
      proposals.some((p) => p.isHired)
  );
  const jobCompleted = job?.completionStatus === "completed";

  const runAction = async (
    applicationId: string,
    action: string,
    fn: () => Promise<void>
  ) => {
    const key = `${applicationId}:${action}`;
    setPendingAction(key);
    setActionError(null);
    setActionMessage(null);
    try {
      await fn();
      await loadData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setPendingAction(null);
    }
  };

  const handleShortlist = (p: ProposalWithDetails) =>
    runAction(p.applicationId, "shortlist", async () => {
      const nextStatus =
        p.status === "shortlisted" ? "submitted" : "shortlisted";
      await updateApplicationStatus(p.applicationId, nextStatus);
      setActionMessage(
        nextStatus === "shortlisted" ? "Proposal shortlisted" : "Removed from shortlist"
      );
    });

  const handleArchive = (p: ProposalWithDetails) =>
    runAction(p.applicationId, "archive", async () => {
      await updateApplicationStatus(p.applicationId, "archived");
      setActionMessage("Proposal archived");
    });

  const handleReject = (p: ProposalWithDetails) =>
    runAction(p.applicationId, "reject", async () => {
      await updateApplicationStatus(p.applicationId, "rejected");
      setActionMessage("Proposal rejected");
    });

  const handleMessage = (p: ProposalWithDetails) =>
    runAction(p.applicationId, "message", async () => {
      if (!p.isMessaged) {
        await updateProposalMessagedStatus(p.applicationId, true);
      }
      if (p.providerId) {
        router.push(`/chats/${p.providerId}`);
      }
    });

  const confirmHire = async () => {
    if (!hireTarget || !user || !job) return;
    const target = hireTarget;
    setHireTarget(null);
    await runAction(target.applicationId, "hire", async () => {
      await hireProvider({
        jobId: job.jobId,
        applicationId: target.applicationId,
        providerId: target.providerId,
        requesterId: user.uid,
        closeJob: hireCloseJob,
      });
      setActionMessage(
        hireCloseJob
          ? "Provider hired — job closed to new proposals"
          : "Provider hired — job remains open for more proposals"
      );
    });
  };

  const handleMarkComplete = async () => {
    if (!user || !job) return;
    const notes = completionNotes;
    setShowCompleteDialog(false);
    setCompletionNotes("");
    const key = `job:${job.jobId}:complete`;
    setPendingAction(key);
    setActionError(null);
    setActionMessage(null);
    try {
      await completeJob({
        jobId: job.jobId,
        completionNotes: notes,
        requesterId: user.uid,
      });
      await loadData();
      setActionMessage("Job marked as completed and proposals closed");
    } catch (err) {
      const message =
        err instanceof JobCompletionError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to mark job as completed";
      setActionError(message);
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.push("/all-jobs")}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {isLoading ? "Loading..." : job?.title || "Job Proposals"}
            </h1>
            {jobCompleted ? (
              <span className="ml-2 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                COMPLETED
              </span>
            ) : null}
          </div>

          {actionError ? (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm">
              {actionError}
            </div>
          ) : null}
          {actionMessage ? (
            <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm">
              {actionMessage}
            </div>
          ) : null}

          {!isLoading && job && (
            <>
              {/* Job owner actions */}
              {isOwner && !jobCompleted && (
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setShowCompleteDialog(true)}
                    disabled={
                      !hasHiredContractor ||
                      pendingAction === `job:${job.jobId}:complete`
                    }
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title={
                      hasHiredContractor
                        ? "Mark this job as completed"
                        : "Hire a provider before completing this job"
                    }
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {pendingAction === `job:${job.jobId}:complete`
                      ? "Completing..."
                      : "Mark Completed"}
                  </button>
                  {!hasHiredContractor ? (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Hire a provider first to enable completion.
                    </span>
                  ) : null}
                </div>
              )}

              {/* Workflow Steps */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
                <div className="flex items-center justify-center gap-8 flex-wrap">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center text-white font-semibold">
                      ✓
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Post</span>
                  </div>
                  <div className="h-0.5 w-16 bg-green-500"></div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center text-white font-semibold">
                      ✓
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Find</span>
                  </div>
                  <div
                    className={`h-0.5 w-16 ${hasHiredContractor ? "bg-green-500" : "bg-red-500"}`}
                  ></div>
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`h-12 w-12 rounded-full flex items-center justify-center text-white font-semibold ${
                        hasHiredContractor ? "bg-green-500" : "bg-red-500"
                      }`}
                    >
                      {hasHiredContractor ? "✓" : "3"}
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white font-semibold">Review</span>
                  </div>
                  <div
                    className={`h-0.5 w-16 ${jobCompleted ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}
                  ></div>
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`h-12 w-12 rounded-full flex items-center justify-center font-semibold ${
                        jobCompleted
                          ? "bg-green-500 text-white"
                          : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {jobCompleted ? "✓" : "4"}
                    </div>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Hire</span>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
                <div className="flex gap-4 px-6 pt-4 border-b border-gray-200 dark:border-gray-700">
                  {[
                    { id: "all" as ProposalTabType, label: "All" },
                    { id: "shortlisted" as ProposalTabType, label: "Shortlisted" },
                    { id: "messaged" as ProposalTabType, label: "Messaged" },
                    { id: "archived" as ProposalTabType, label: "Archived" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setProposalTab(tab.id)}
                      className={`pb-3 px-1 font-medium transition-colors ${
                        proposalTab === tab.id
                          ? "text-red-500 border-b-2 border-red-500"
                          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Search and Filter — matches Flutter job_proposals_widget.dart _buildSearchAndFilter */}
                <div className="flex flex-col gap-3 px-6 py-4">
                  <div className="flex gap-3">
                    <div className="relative min-h-[44px] flex-1">
                      <div className="flex h-11 min-h-[44px] items-center rounded-lg border border-[#D9D9D9] bg-[#E7E9EE] pl-2 dark:border-darkBlue-003 dark:bg-darkBlue-343">
                        <Search
                          className="ml-1 h-5 w-5 shrink-0 text-[#808080] dark:text-white"
                          strokeWidth={2}
                          aria-hidden
                        />
                        <input
                          type="text"
                          placeholder="Search proposals"
                          value={proposalSearchQuery}
                          onChange={(e) => setProposalSearchQuery(e.target.value)}
                          className="min-h-0 flex-1 border-0 bg-transparent py-2 pl-2 pr-3 text-sm text-gray-900 placeholder:text-[#808080] focus:outline-none focus:ring-0 dark:text-white dark:placeholder:text-white"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="Open filters"
                      aria-expanded={proposalFilterSheetOpen}
                      onClick={() => setProposalFilterSheetOpen(true)}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#F21A1A] transition-colors hover:opacity-95"
                    >
                      <Sliders className="h-5 w-5 text-white" strokeWidth={2} aria-hidden />
                    </button>
                  </div>
                  {proposalSort !== "newest" ? (
                    <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
                      <Sliders className="h-4 w-4 shrink-0 text-[#F21A1A]" strokeWidth={2} aria-hidden />
                      <p className="min-w-0 flex-1 text-xs font-medium text-[#F21A1A] sm:text-sm">
                        Sort: {proposalSortSummary(proposalSort)}
                      </p>
                      <button
                        type="button"
                        onClick={() => setProposalSort("newest")}
                        className="flex shrink-0 items-center justify-center rounded bg-[#F21A1A] p-1 text-white hover:opacity-90"
                        aria-label="Clear sort"
                      >
                        <span className="text-xs leading-none">×</span>
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <FlutterStyleFilterBottomSheet
                open={proposalFilterSheetOpen}
                onClose={() => setProposalFilterSheetOpen(false)}
              >
                <ProposalsListFilterSheetContent
                  sort={proposalSort}
                  onChangeSort={setProposalSort}
                  onApply={() => setProposalFilterSheetOpen(false)}
                  onReset={() => {
                    setProposalSort("newest");
                    setProposalFilterSheetOpen(false);
                  }}
                />
              </FlutterStyleFilterBottomSheet>

              {/* Proposals List */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                {filteredProposals.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {proposals.length === 0 ? "No proposals yet" : "No matching proposals"}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      {proposals.length === 0
                        ? "Proposals will appear here when providers apply for this job."
                        : "Try changing the tab, search, or sort filters."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredProposals.map((proposal) => {
                      const keyBase = proposal.applicationId;
                      const isHireTarget = hireTarget?.applicationId === keyBase;
                      const isPending = (action: string) =>
                        pendingAction === `${keyBase}:${action}`;
                      const isHired = proposal.isHired;
                      const canModify = isOwner && !jobCompleted;

                      return (
                        <div
                          key={proposal.applicationId}
                          className={`border rounded-lg p-6 transition-shadow ${
                            isHired
                              ? "border-green-400 dark:border-green-500 bg-green-50/40 dark:bg-green-900/10"
                              : "border-gray-200 dark:border-gray-700 hover:shadow-md"
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            {/* Provider Avatar */}
                            <Link
                              href={`/profile/${proposal.providerId}`}
                              className="flex-shrink-0"
                              aria-label={`View ${proposal.provider?.fullName || "provider"} profile`}
                            >
                              {proposal.provider?.photoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={proposal.provider.photoUrl}
                                  alt={proposal.provider.fullName}
                                  className="h-12 w-12 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-12 w-12 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold">
                                  {proposal.provider?.fullName?.charAt(0).toUpperCase() || "P"}
                                </div>
                              )}
                            </Link>

                            {/* Proposal Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-2 flex-wrap gap-2">
                                <div>
                                  <Link
                                    href={`/profile/${proposal.providerId}`}
                                    className="text-lg font-semibold text-gray-900 dark:text-white hover:underline"
                                  >
                                    {proposal.provider?.fullName || "Unknown Provider"}
                                  </Link>
                                  {proposal.provider?.isVerified && (
                                    <span className="inline-block ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                                      Verified
                                    </span>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold text-red-500">
                                    ${proposal.bidAmount}
                                  </p>
                                  {proposal.estimatedDuration && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      {proposal.estimatedDuration}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Rating */}
                              {proposal.provider &&
                                (proposal.provider.totalRating > 0 ||
                                  proposal.provider.totalReviews > 0) && (
                                  <div className="flex items-center gap-2 mb-3">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                      ⭐ {proposal.provider.totalRating.toFixed(1)}
                                    </span>
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                      ({proposal.provider.totalReviews} reviews)
                                    </span>
                                  </div>
                                )}

                              {/* Proposal Text */}
                              <p className="text-gray-700 dark:text-gray-300 mb-4 whitespace-pre-wrap">
                                {proposal.proposalText}
                              </p>

                              {/* Status and Actions */}
                              <div className="flex items-center justify-between flex-wrap gap-3">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-2 py-1 rounded text-xs font-medium ${
                                      proposal.isHired
                                        ? "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300"
                                        : proposal.status === "submitted"
                                          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                                          : proposal.status === "shortlisted"
                                            ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                                            : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                                    }`}
                                  >
                                    {proposal.isHired
                                      ? "HIRED"
                                      : proposal.status.toUpperCase()}
                                  </span>
                                  {proposal.isMessaged && (
                                    <span className="text-xs text-gray-600 dark:text-gray-400">
                                      Messaged
                                    </span>
                                  )}
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() => handleMessage(proposal)}
                                    disabled={isPending("message")}
                                    className="inline-flex items-center gap-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium disabled:opacity-50"
                                  >
                                    <MessageSquare className="h-4 w-4" />
                                    {isPending("message") ? "Opening..." : "Message"}
                                  </button>
                                  {canModify && !isHired ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleShortlist(proposal)}
                                        disabled={isPending("shortlist")}
                                        className="inline-flex items-center gap-1 px-3 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors text-sm font-medium disabled:opacity-50"
                                      >
                                        <Star className="h-4 w-4" />
                                        {proposal.status === "shortlisted"
                                          ? "Unshortlist"
                                          : "Shortlist"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleReject(proposal)}
                                        disabled={isPending("reject")}
                                        className="inline-flex items-center gap-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium disabled:opacity-50"
                                      >
                                        <XCircle className="h-4 w-4" />
                                        Reject
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setHireTarget(proposal);
                                          setHireCloseJob(true);
                                        }}
                                        disabled={isPending("hire") || isHireTarget}
                                        className="inline-flex items-center gap-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium disabled:opacity-50"
                                      >
                                        Hire
                                      </button>
                                    </>
                                  ) : null}
                                  {canModify && !isHired && proposal.status !== "archived" ? (
                                    <button
                                      type="button"
                                      onClick={() => handleArchive(proposal)}
                                      disabled={isPending("archive")}
                                      className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium disabled:opacity-50"
                                    >
                                      Archive
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Hire confirmation dialog — matches Flutter HireConfirmationDialog */}
      {hireTarget && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[200]"
            onClick={() => setHireTarget(null)}
          />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-darkBlue-003 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Hire {hireTarget.provider?.fullName || "provider"}?
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  Choose how to handle remaining proposals after hiring.
                </p>

                <div className="space-y-2">
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="hire-mode"
                      checked={hireCloseJob}
                      onChange={() => setHireCloseJob(true)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block font-medium text-gray-900 dark:text-white">
                        Close job to new proposals
                      </span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">
                        Other pending proposals will be rejected.
                      </span>
                    </span>
                  </label>
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="hire-mode"
                      checked={!hireCloseJob}
                      onChange={() => setHireCloseJob(false)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block font-medium text-gray-900 dark:text-white">
                        Keep job open
                      </span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">
                        Continue to accept additional proposals alongside this hire.
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 pb-6">
                <button
                  type="button"
                  onClick={() => setHireTarget(null)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 font-medium hover:text-gray-800 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmHire}
                  className="px-4 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors"
                >
                  Confirm Hire
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Complete job dialog */}
      {showCompleteDialog && job && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[200]"
            onClick={() => setShowCompleteDialog(false)}
          />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-darkBlue-003 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Mark Job as Completed
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  This closes the job to new proposals and notifies the hired contractor
                  that reviews can be submitted. This cannot be undone.
                </p>

                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Completion notes (optional)
                </label>
                <textarea
                  rows={4}
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="Summary of the finished work, deliverables, etc."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-darkBlue-203 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="flex justify-end gap-3 px-6 pb-6">
                <button
                  type="button"
                  onClick={() => setShowCompleteDialog(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 font-medium hover:text-gray-800 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleMarkComplete}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Confirm Complete
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
