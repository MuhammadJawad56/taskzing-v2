"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Clock, Building2, Calendar, MapPin, ArrowLeft, Users, Trash2, Briefcase, AlertTriangle } from "lucide-react";
import { useAuth } from "@/lib/api/AuthContext";
import { getJobById, deleteJob } from "@/lib/api/jobs";
import { getProposalCounts } from "@/lib/api/proposals";
import { Task } from "@/lib/types/task";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function JobDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params?.jobId as string;
  const { user } = useAuth();
  
  const [job, setJob] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [proposalCounts, setProposalCounts] = useState<{ total: number; hired: number }>({ total: 0, hired: 0 });

  useEffect(() => {
    if (jobId) {
      loadJob();
    }
  }, [jobId]);

  const loadJob = async () => {
    if (!jobId) return;

    try {
      setIsLoading(true);
      const jobData = await getJobById(jobId);
      
      if (jobData) {
        setJob(jobData);
        // Load proposal counts
        const counts = await getProposalCounts(jobId);
        setProposalCounts(counts);
      } else {
        // Job not found, redirect back
        router.push("/all-jobs");
        return;
      }
    } catch (error) {
      console.error("Error loading job:", error);
    } finally {
      setIsLoading(false);
    }
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
      return `$${(job as any).hourlyRate}/hr`;
    } else if (job.jobType === "fixed" && (job as any).fixedPrice) {
      return `$${(job as any).fixedPrice}`;
    } else if (job.price) {
      return job.jobType === "hourly" ? `$${job.price}/hr` : `$${job.price}`;
    }
    return "Price not set";
  };

  const getCategoryDisplay = (job: Task) => {
    if (job.subCategory) {
      return `${job.category} - ${job.subCategory}`;
    }
    return job.category || "No category";
  };

  const getFlexibility = (job: Task) => {
    if (job.jobType === "hourly" && (job as any).timeFlexibility) {
      return (job as any).timeFlexibility;
    }
    return job.jobType === "hourly" ? "Time Based" : "Fixed";
  };

  const getCompletionStatus = (job: Task) => {
    const status = (job as any).completionStatus;
    if (status === "open" || status === undefined || status === null) {
      return "open";
    }
    return status;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not set";
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
    } catch {
      return dateString;
    }
  };

  const handleDeleteJob = () => {
    if (job) {
      setShowDeleteModal(true);
    }
  };

  const confirmDeleteJob = async () => {
    if (!job || !user) return;

    try {
      // Delete job from Firebase
      await deleteJob(jobId, user.uid);
      
      // After deletion, redirect to all-jobs
      router.push("/all-jobs");
    } catch (error: any) {
      console.error("Error deleting job:", error);
      const errorMessage = error?.message || "Failed to delete job. Please try again.";
      alert(errorMessage);
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-[#003D62]">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => router.push("/all-jobs")}
            className="flex items-center gap-2 mb-6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Jobs</span>
          </button>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">Loading job details...</p>
            </div>
          ) : !job ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">Job not found.</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="bg-white dark:bg-darkBlue-013 rounded-lg border border-gray-200 dark:border-white/10 p-6 mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                      {job.title}
                    </h1>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span>Posted {formatTimeAgo(job.createdAt)}</span>
                      {getCompletionStatus(job) === "open" && (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded text-xs font-medium">
                          OPEN
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Job Information */}
              <div className="bg-white dark:bg-darkBlue-013 rounded-lg border border-gray-200 dark:border-white/10 p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Job Information
                </h2>
                <div className="space-y-4">
                  {/* Hourly Rate / Fixed Price */}
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-gray-600 dark:text-white/70" />
                    <div className="flex-1">
                      <span className="text-sm text-gray-600 dark:text-white/70">Hourly Rate</span>
                      <p className="text-lg font-semibold text-red-500">
                        {getJobPrice(job)}
                      </p>
                    </div>
                  </div>

                  {/* Category */}
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-gray-600 dark:text-white/70" />
                    <div className="flex-1">
                      <span className="text-sm text-gray-600 dark:text-white/70">Category</span>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {getCategoryDisplay(job)}
                      </p>
                    </div>
                  </div>

                  {/* Job Date */}
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-gray-600 dark:text-white/70" />
                    <div className="flex-1">
                      <span className="text-sm text-gray-600 dark:text-white/70">Job Date</span>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatDate(job.jobDate)}
                      </p>
                    </div>
                  </div>

                  {/* Flexibility */}
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-gray-600 dark:text-white/70" />
                    <div className="flex-1">
                      <span className="text-sm text-gray-600 dark:text-white/70">Flexibility</span>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {getFlexibility(job)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="bg-white dark:bg-darkBlue-013 rounded-lg border border-gray-200 dark:border-white/10 p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Description
                </h2>
                <div className="border-2 border-dashed border-gray-300 dark:border-white/20 rounded-lg p-4 min-h-[100px]">
                  {job.description ? (
                    <p className="text-gray-700 dark:text-white/90 whitespace-pre-wrap">
                      {job.description}
                    </p>
                  ) : (
                    <p className="text-gray-400 dark:text-white/60 italic">No description provided.</p>
                  )}
                </div>
              </div>

              {/* Skills Required */}
              <div className="bg-white dark:bg-darkBlue-013 rounded-lg border border-gray-200 dark:border-white/10 p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Skills Required
                </h2>
                {job.skills && job.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-red-500 text-white rounded-full text-sm font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 dark:text-white/60 italic">No skills specified.</p>
                )}
              </div>

              {/* Location */}
              <div className="bg-white dark:bg-darkBlue-013 rounded-lg border border-gray-200 dark:border-white/10 p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Location
                </h2>
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-gray-600 dark:text-white/70" />
                  <p className="text-lg text-gray-900 dark:text-white">
                    {job.address || "Location not specified"}
                  </p>
                </div>
                {job.additionalLocationNotes && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-white/70 ml-8">
                    {job.additionalLocationNotes}
                  </p>
                )}
              </div>

              {/* Proposals and Hired Count */}
              <div className="bg-white dark:bg-darkBlue-013 rounded-lg border border-gray-200 dark:border-white/10 p-6 mb-6">
                <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-white/70">
                  <span>
                    {proposalCounts.total} Proposals
                  </span>
                  <span>
                    {proposalCounts.hired} Hired
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => router.push(`/all-jobs/${jobId}/proposals`)}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                >
                  <Users className="h-5 w-5" />
                  View Proposals
                </button>
                <button
                  onClick={handleDeleteJob}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                >
                  <Trash2 className="h-5 w-5" />
                  Delete Job
                </button>
              </div>
            </>
          )}

          {/* Delete Job Confirmation Modal */}
          {showDeleteModal && job && (
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
                      {job.title}
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
