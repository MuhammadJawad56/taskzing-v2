"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Share2, MessageCircle, MapPin, Calendar, ChevronLeft, ChevronRight, X, DollarSign, Clock, ThumbsUp } from "lucide-react";
import { getJobById } from "@/lib/api/jobs";
import { getUserById } from "@/lib/api/users";
import { Task } from "@/lib/types/task";
import { User as UserType } from "@/lib/types/user";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/api/AuthContext";
import { JobProposalApplyModal } from "@/components/task/JobProposalApplyModal";
import { addRecentlyViewed } from "@/lib/utils/recentlyViewed";
import { getUserLikedJobIds, likeJob, unlikeJob } from "@/lib/api/likes";

/** TaskZing job details — dark mode palette from product UI */
const JD_NAVY = "#003B5C";
const JD_RED = "#FF2D2D";

function formatPostedDate(date: Date | string) {
  if (!date) return "N/A";
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "N/A";
  }
}

function urgencyDisplay(u: Task["urgency"]) {
  const map: Record<Task["urgency"], string> = {
    low: "Low",
    normal: "Normal",
    high: "High",
    urgent: "Urgent",
  };
  return map[u] ?? u;
}

export default function JobDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const jobId = params?.id as string;
  const [job, setJob] = useState<Task | null>(null);
  const [client, setClient] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likePending, setLikePending] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!jobId) return;

      setLoading(true);
      try {
        const jobData = await getJobById(jobId);
        if (!jobData) {
          router.push("/not-found");
          return;
        }

        setJob(jobData);

        addRecentlyViewed({ id: jobId, type: "job" });

        if (jobData.clientId) {
          const clientData = await getUserById(jobData.clientId);
          setClient(clientData);
        }
      } catch (error) {
        console.error("Error fetching job details:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [jobId, router]);

  useEffect(() => {
    let mounted = true;
    if (!currentUser || !jobId) {
      setIsLiked(false);
      return () => {
        mounted = false;
      };
    }
    (async () => {
      try {
        const likedIds = await getUserLikedJobIds(currentUser.uid);
        if (mounted) setIsLiked(likedIds.includes(jobId));
      } catch (error) {
        console.warn("Failed to load liked jobs for details page:", error);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [currentUser, jobId]);

  const handleShare = async () => {
    if (!job) return;

    const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/job-details/${jobId}` : "";

    if (navigator.share) {
      try {
        await navigator.share({
          title: job.title || "Job Details",
          text: job.description || "",
          url: shareUrl,
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert("Link copied to clipboard!");
    }
  };

  const handleLikeToggle = async () => {
    if (!job) return;
    if (!currentUser) {
      router.push(`/login?redirect=${encodeURIComponent(`/job-details/${jobId}`)}`);
      return;
    }
    if (likePending) return;
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setJob((prev) =>
      prev
        ? { ...prev, likesCount: Math.max(0, Number(prev.likesCount ?? 0) + (wasLiked ? -1 : 1)) }
        : prev,
    );
    setLikePending(true);
    try {
      if (wasLiked) await unlikeJob(currentUser.uid, job.jobId);
      else await likeJob(currentUser.uid, job.jobId, job.clientId);
    } catch (error) {
      console.error("Error toggling job like on details page:", error);
      setIsLiked(wasLiked);
      setJob((prev) =>
        prev
          ? { ...prev, likesCount: Math.max(0, Number(prev.likesCount ?? 0) + (wasLiked ? 1 : -1)) }
          : prev,
      );
    } finally {
      setLikePending(false);
    }
  };

  /** Same flow as Explore job tile Apply — opens proposal modal (after login if needed). */
  const openApplyModal = () => {
    if (!job) return;
    if (!currentUser) {
      router.push(`/login?redirect=${encodeURIComponent(`/job-details/${jobId}`)}`);
      return;
    }
    setIsProposalModalOpen(true);
  };

  const closeApplyModal = () => setIsProposalModalOpen(false);

  const getInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const images = job?.photos || [];
  const fallbackImage = "/images/placeholder_image.png";
  const likesCount = Math.max(0, Number(job?.likesCount ?? 0));

  const nextImage = () => {
    if (images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }
  };

  const prevImage = () => {
    if (images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [images.length]);

  useEffect(() => {
    if (!isImageModalOpen || images.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsImageModalOpen(false);
      } else if (e.key === "ArrowLeft") {
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
      } else if (e.key === "ArrowRight") {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isImageModalOpen, images.length]);

  const formatBudgetLine = (j: Task) => {
    const p = j.price;
    if (!p && p !== 0) return "Not specified";
    if (j.jobType === "hourly") {
      return `${p.toFixed(1)} Hourly`;
    }
    return `${p.toFixed(1)} Fixed Price`;
  };

  const roleBullets = React.useMemo(() => {
    if (!job?.description) return ["Details in the description below."];
    const parts = job.description
      .split(/\n+|[.!?]+\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 4);
    return parts.length ? parts : [job.description.slice(0, 120) + (job.description.length > 120 ? "…" : "")];
  }, [job?.description]);

  const skillBullets = job?.skills?.length ? job.skills : ["See skills section below."];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#003B5C]">
          <div className="text-gray-500 dark:text-white/80">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!job) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#003B5C]">
          <div className="text-gray-500 dark:text-white/80">Job not found</div>
        </div>
      </DashboardLayout>
    );
  }

  const isOwnJob = currentUser && job.clientId === currentUser.uid;
  /** Profile route uses the same id as `getUserById` / Firestore user doc — prefer job poster id. */
  const posterProfileId = job.clientId || client?.uid || client?.id || "";
  const posterLabel =
    client?.postingAs === "company"
      ? "Job Poster: Company"
      : client?.postingAs === "instore"
        ? "Job Poster: In-store"
        : "Job Poster: Individual";

  const displayName = client?.fullName || client?.username || client?.email?.split("@")[0] || "Client";
  const handle = client?.username ? `@${client.username}` : client?.email ? `@${client.email.split("@")[0]}` : "";

  const posterCardBaseClass =
    "rounded-[18px] p-4 mb-5 flex items-center gap-4 border border-gray-200 bg-white shadow-sm dark:border-0 dark:bg-[#E0E0E0] dark:shadow-md";

  const posterCardInner =
    client ? (
      <>
        <div
          className="h-14 w-14 sm:h-16 sm:w-16 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0 overflow-hidden"
          style={{ backgroundColor: JD_RED }}
        >
          {client.photoUrl ? (
            <img src={client.photoUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <span>{getInitials(client.fullName || client.username || client.email?.split("@")[0])}</span>
          )}
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-lg text-gray-900 dark:text-neutral-900 truncate">{displayName}</h3>
          {handle ? <p className="text-sm text-gray-600 dark:text-neutral-800">{handle}</p> : null}
          <p className="text-sm text-gray-600 dark:text-neutral-800 mt-0.5">{posterLabel}</p>
        </div>
      </>
    ) : null;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-[#003B5C] dark:text-white">
        <div className="max-w-2xl mx-auto px-4 py-5 pb-28">
          {/* Top bar — Job Details */}
          <div className="flex items-center justify-between mb-5">
            <button
              type="button"
              onClick={() => router.back()}
              className="p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="h-6 w-6 text-gray-900 dark:text-white" />
            </button>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Job Details</h1>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleLikeToggle}
                disabled={likePending}
                className="inline-flex items-center gap-1 rounded-full px-2 py-2 hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-70"
                aria-label={isLiked ? "Unlike job" : "Like job"}
              >
                <ThumbsUp className={`h-5 w-5 ${isLiked ? "text-[#FF2D2D]" : "text-gray-900 dark:text-white"}`} />
                <span className="text-xs font-semibold text-gray-700 dark:text-white/90 min-w-[1ch]">{likesCount}</span>
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                aria-label="Share job"
              >
                <Share2 className="h-6 w-6 text-gray-900 dark:text-white" />
              </button>
              {images.length > 1 && (
                <div className="hidden sm:block px-2 py-1 rounded-full text-xs bg-gray-200 text-gray-600 dark:bg-white/10 dark:text-white/70">
                  {currentImageIndex + 1}/{images.length}
                </div>
              )}
            </div>
          </div>

          {/* Slate overview / media */}
          <div className="rounded-[18px] p-4 mb-5 shadow-sm dark:shadow-none bg-white border border-gray-200 dark:border-0 dark:bg-[#2c3e50]">
            <p className="text-sm font-semibold text-gray-800 dark:text-white mb-3">{job.category || "Job"}</p>

            {images.length > 0 ? (
              <div className="relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-black/20">
                <button
                  type="button"
                  className="relative w-full h-[220px] sm:h-[280px] cursor-pointer block"
                  onClick={() => setIsImageModalOpen(true)}
                >
                  <img
                    src={images[currentImageIndex] || fallbackImage}
                    alt={job.title || "Job image"}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = fallbackImage;
                    }}
                  />
                </button>
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        prevImage();
                      }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white z-10"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        nextImage();
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white z-10"
                      aria-label="Next image"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <div className="flex justify-center gap-2 py-3">
                      {images.map((_, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setCurrentImageIndex(index)}
                          className={`h-2 rounded-full transition-all ${
                            index === currentImageIndex
                              ? "w-6"
                              : "w-2 opacity-60 hover:opacity-90"
                          }`}
                          style={{
                            backgroundColor: index === currentImageIndex ? JD_RED : "#9ca3af",
                          }}
                          aria-label={`Image ${index + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {[
                    { title: "The role", items: roleBullets },
                    {
                      title: "Background",
                      items: [
                        job.category,
                        job.subCategory,
                        job.posterType ? `Poster: ${job.posterType}` : "",
                      ].filter(Boolean) as string[],
                    },
                    { title: "Skills", items: skillBullets },
                    {
                      title: "Budget",
                      items: [formatBudgetLine(job), job.jobType === "hourly" && job.estimatedDuration ? `Est. ${job.estimatedDuration} hrs` : ""].filter(
                        Boolean
                      ) as string[],
                    },
                  ].map((block) => (
                    <div
                      key={block.title}
                      className="rounded-2xl border border-gray-200 dark:border-white/35 p-3 sm:p-3.5 min-h-[100px] bg-gray-50/80 dark:bg-transparent"
                    >
                      <h3 className="text-xs font-bold text-gray-800 dark:text-white mb-2 uppercase tracking-wide">
                        {block.title}
                      </h3>
                      <ul className="text-xs sm:text-sm text-gray-600 dark:text-white/95 space-y-1.5 list-disc list-inside leading-snug">
                        {block.items.map((line, i) => (
                          <li key={i} className="marker:text-red-500 dark:marker:text-[#FF2D2D]">
                            {line}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="flex justify-center gap-2 pt-3">
                  <span className="h-2 w-6 rounded-full" style={{ backgroundColor: JD_RED }} />
                  <span className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-500 opacity-70" />
                  <span className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-500 opacity-70" />
                </div>
              </>
            )}
          </div>

          {/* Main title */}
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">{job.title}</h2>

          {/* Poster card — opens poster profile when a profile id is known */}
          {client && posterProfileId ? (
            <Link
              href={`/profile/${posterProfileId}`}
              className={`${posterCardBaseClass} transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#003B5C] cursor-pointer`}
              aria-label={`View profile of ${displayName}`}
            >
              {posterCardInner}
            </Link>
          ) : client ? (
            <div className={posterCardBaseClass}>{posterCardInner}</div>
          ) : null}

          {/* Description */}
          <div className="mb-5">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">Description</h2>
            <div className="rounded-[18px] p-4 border border-gray-200 bg-white dark:border-0 dark:bg-[#E0E0E0]">
              <p className="text-sm sm:text-base leading-relaxed text-gray-700 dark:text-neutral-900">
                {job.description || "No description provided."}
              </p>
            </div>
          </div>

          {/* Additional Information */}
          <div className="mb-5">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">Additional Information</h2>
            <div className="rounded-[18px] p-4 space-y-3 border border-gray-200 bg-white dark:border-0 dark:bg-[#E0E0E0]">
              <div className="flex items-start gap-2">
                <DollarSign className="h-4 w-4 text-gray-500 dark:text-neutral-700 mt-0.5 shrink-0" />
                <p className="text-sm text-gray-800 dark:text-neutral-900">
                  <span className="font-bold">Budget</span>{" "}
                  <span className="font-normal">{formatBudgetLine(job)}</span>
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-gray-500 dark:text-neutral-700 mt-0.5 shrink-0" />
                <p className="text-sm text-gray-800 dark:text-neutral-900">
                  <span className="font-bold">Job posted</span>{" "}
                  <span className="font-normal">{formatPostedDate(job.createdAt)}</span>
                </p>
              </div>
              {job.address ? (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-500 dark:text-neutral-700 mt-0.5 shrink-0" />
                  <p className="text-sm text-gray-800 dark:text-neutral-900">
                    <span className="font-bold">Location</span>{" "}
                    <span className="font-normal">{job.address}</span>
                  </p>
                </div>
              ) : null}
              {job.jobType === "hourly" && job.estimatedDuration ? (
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-gray-500 dark:text-neutral-700 mt-0.5 shrink-0" />
                  <p className="text-sm text-gray-800 dark:text-neutral-900">
                    <span className="font-bold">Estimated duration</span>{" "}
                    <span className="font-normal">{job.estimatedDuration} hours</span>
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          {/* Skills Required */}
          {job.skills && job.skills.length > 0 ? (
            <div className="mb-4">
              <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">Skills Required</h2>
              <div className="rounded-[18px] p-4 border border-gray-200 bg-white dark:border-0 dark:bg-[#E0E0E0]">
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center rounded-full px-3 py-1.5 text-xs sm:text-sm font-medium text-white"
                      style={{ backgroundColor: JD_NAVY }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          <p className="text-sm text-gray-700 dark:text-white mb-5">
            Urgency level: <span className="font-semibold">{urgencyDisplay(job.urgency)}</span>
          </p>

          {/* CTA */}
          <div className="space-y-3">
            {isOwnJob ? (
              <button
                type="button"
                disabled
                className="w-full font-bold py-4 rounded-full flex items-center justify-center gap-2 cursor-not-allowed opacity-60 bg-gray-300 text-gray-600 dark:bg-white/20 dark:text-white/70"
              >
                <MessageCircle className="h-5 w-5" />
                Your job
              </button>
            ) : (
              <button
                type="button"
                onClick={openApplyModal}
                className="w-full text-white font-bold py-4 rounded-full uppercase tracking-wide text-sm sm:text-base shadow-lg transition-colors hover:opacity-95 active:opacity-90"
                style={{ backgroundColor: JD_RED }}
              >
                Apply now
              </button>
            )}
            <button
              type="button"
              onClick={handleShare}
              className="w-full py-3 rounded-full text-sm font-semibold border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 dark:bg-transparent dark:border-white/25 dark:text-white dark:hover:bg-white/10 transition-colors"
            >
              Share job
            </button>
          </div>

          {posterProfileId ? (
            <div className="text-center mt-4">
              <Link
                href={`/profile/${posterProfileId}`}
                className="inline-block text-sm font-semibold underline decoration-2 underline-offset-4 hover:opacity-90"
                style={{ color: JD_RED }}
              >
                View Client&apos;s Profile
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      <JobProposalApplyModal
        job={job}
        open={isProposalModalOpen}
        onClose={closeApplyModal}
        loginRedirectPath={`/job-details/${jobId}`}
      />

      {/* Image modal */}
      {isImageModalOpen && images.length > 0 && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setIsImageModalOpen(false)}
          role="presentation"
        >
          <div className="relative w-full h-full flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <button
              type="button"
              onClick={() => setIsImageModalOpen(false)}
              className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors z-10"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>

            <img
              src={images[currentImageIndex] || fallbackImage}
              alt={job.title || "Job image"}
              className="max-w-full max-h-[90vh] object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = fallbackImage;
              }}
            />

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    prevImage();
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors z-10"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-8 w-8" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    nextImage();
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors z-10"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-8 w-8" />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 rounded-full text-white text-sm">
                  {currentImageIndex + 1} / {images.length}
                </div>
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex(index);
                      }}
                      className={`h-2 rounded-full transition-all ${
                        index === currentImageIndex ? "bg-[#FF2D2D] w-8" : "bg-white/50 w-2 hover:bg-white/70"
                      }`}
                      aria-label={`Go to image ${index + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
