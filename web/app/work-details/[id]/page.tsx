"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Share2, MessageCircle, MapPin, Calendar, Briefcase, ChevronLeft, ChevronRight, X, Heart } from "lucide-react";
import { getShowcaseItem } from "@/lib/api/showcase";
import { getUserById } from "@/lib/api/users";
import { getJobsByClientId } from "@/lib/api/jobs";
import { getOrCreateChatRoom } from "@/lib/api/messages";
import { ShowcaseItem } from "@/lib/api/showcase";
import { User } from "@/lib/types/user";
import { Task } from "@/lib/types/task";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/api/AuthContext";
import { addRecentlyViewed } from "@/lib/utils/recentlyViewed";
import { getUserLikedShowcaseIds, likeShowcase, unlikeShowcase } from "@/lib/api/likes";

/** Match TaskZing job / work detail dark UI */
const JD_RED = "#FF2D2D";

export default function WorkDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const showcaseId = params?.id as string;
  const providerHint = searchParams?.get("provider") ?? undefined;
  const [showcase, setShowcase] = useState<ShowcaseItem | null>(null);
  const [provider, setProvider] = useState<User | null>(null);
  const [jobs, setJobs] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isContacting, setIsContacting] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likePending, setLikePending] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!showcaseId) return;

      setLoading(true);
      try {
        const foundShowcase = await getShowcaseItem(showcaseId, providerHint);

        if (!foundShowcase) {
          router.push("/not-found");
          return;
        }

        setShowcase(foundShowcase);

        addRecentlyViewed({
          id: showcaseId,
          type: "showcase",
          providerHint: foundShowcase.userId || providerHint,
        });

        if (foundShowcase.userId) {
          const providerData = await getUserById(foundShowcase.userId);
          setProvider(providerData);

          const providerJobs = await getJobsByClientId(foundShowcase.userId);
          setJobs(providerJobs);
        }
      } catch (error) {
        console.error("Error fetching work details:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [showcaseId, providerHint, router]);

  useEffect(() => {
    let mounted = true;
    if (!user || !showcaseId) {
      setIsLiked(false);
      return () => {
        mounted = false;
      };
    }
    (async () => {
      try {
        const likedIds = await getUserLikedShowcaseIds(user.uid);
        if (mounted) setIsLiked(likedIds.includes(showcaseId));
      } catch (error) {
        console.warn("Failed to load liked showcases for details page:", error);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user, showcaseId]);

  const formatDate = (date: Date | string) => {
    if (!date) return "N/A";
    try {
      const d = typeof date === "string" ? new Date(date) : date;
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - d.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return "Today";
      if (diffDays === 1) return "1 day ago";
      if (diffDays < 30) return `${diffDays} days ago`;
      if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return `${months} ${months === 1 ? "month" : "months"} ago`;
      }
      const years = Math.floor(diffDays / 365);
      return `${years} ${years === 1 ? "year" : "years"} ago`;
    } catch {
      return "N/A";
    }
  };

  const workDetailsPath = () => {
    const q = providerHint ? `?provider=${encodeURIComponent(providerHint)}` : "";
    return `/work-details/${showcaseId}${q}`;
  };

  const buildShareUrl = () => {
    if (typeof window === "undefined") return "";
    // Preserve query string (e.g. ?provider=…) so recipients open the same showcase context.
    return window.location.href.split("#")[0];
  };

  const handleShare = async () => {
    if (!showcase) return;

    const shareUrl = buildShareUrl();
    const title = showcase.title || "Showcase on TaskZing";
    const text = (showcase.description || "").trim().slice(0, 400);

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text: text || title, url: shareUrl || undefined });
        return;
      } catch (error: unknown) {
        if (error instanceof Error && error.name === "AbortError") return;
        console.warn("navigator.share failed, using clipboard", error);
      }
    }

    const fallbackUrl = shareUrl || (typeof window !== "undefined" ? `${window.location.origin}${workDetailsPath()}` : "");
    try {
      await navigator.clipboard.writeText(fallbackUrl);
      alert("Link copied to clipboard!");
    } catch {
      window.prompt("Copy this link:", fallbackUrl);
    }
  };

  const handleLikeToggle = async () => {
    if (!showcase) return;
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(workDetailsPath())}`);
      return;
    }
    if (likePending) return;
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setShowcase((prev) =>
      prev
        ? { ...prev, likesCount: Math.max(0, Number(prev.likesCount ?? 0) + (wasLiked ? -1 : 1)) }
        : prev,
    );
    setLikePending(true);
    try {
      if (wasLiked) await unlikeShowcase(user.uid, showcaseId);
      else await likeShowcase(user.uid, showcaseId, showcase.userId);
    } catch (error) {
      console.error("Error toggling showcase like on details page:", error);
      setIsLiked(wasLiked);
      setShowcase((prev) =>
        prev
          ? { ...prev, likesCount: Math.max(0, Number(prev.likesCount ?? 0) + (wasLiked ? 1 : -1)) }
          : prev,
      );
    } finally {
      setLikePending(false);
    }
  };

  const handleContactProvider = async () => {
    if (!showcase) return;

    const peerId = provider?.uid || provider?.id || showcase.userId;
    if (!peerId) {
      alert("Provider information is not available.");
      return;
    }

    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(workDetailsPath())}`);
      return;
    }

    if (peerId === user.uid) {
      return;
    }

    setIsContacting(true);
    try {
      const roomId = await getOrCreateChatRoom([user.uid, peerId]);
      router.push(`/chats/${roomId}`);
    } catch (err) {
      console.error("Error creating chat room:", err);
      alert("Failed to start conversation. Please try again.");
    } finally {
      setIsContacting(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const skills = showcase?.skills
    ? showcase.skills.split(",").map((s) => s.trim()).filter(Boolean)
    : showcase?.tags || [];

  const images = showcase?.imageUrls || [];
  const fallbackImage = "/images/placeholder_image.png";
  const likesCount = Math.max(0, Number(showcase?.likesCount ?? 0));

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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#003B5C]">
          <div className="text-gray-500 dark:text-white/80">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!showcase) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#003B5C]">
          <div className="text-gray-500 dark:text-white/80">Work not found</div>
        </div>
      </DashboardLayout>
    );
  }

  const isOwnWork = user && showcase.userId === user.uid;
  const providerProfileId = showcase.userId || provider?.uid || provider?.id || "";

  const showcaseTypeLabel =
    showcase.postingAs === "company"
      ? "Company"
      : showcase.postingAs === "instore"
        ? "In-Store"
        : "Individual";

  const displayName = provider?.fullName || provider?.username || provider?.email?.split("@")[0] || "Provider";
  const handle = provider?.username ? `@${provider.username}` : provider?.email ? `@${provider.email.split("@")[0]}` : "";

  const posterCardBaseClass =
    "rounded-[18px] p-4 mb-5 flex items-center gap-4 border border-gray-200 bg-white shadow-sm dark:border-0 dark:bg-[#E0E0E0] dark:shadow-md";

  const posterCardInner =
    provider ? (
      <>
        <div
          className="h-14 w-14 sm:h-16 sm:w-16 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0 overflow-hidden"
          style={{ backgroundColor: JD_RED }}
        >
          {provider.photoUrl ? (
            <img src={provider.photoUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <span>{getInitials(provider.fullName || provider.username || provider.email?.split("@")[0])}</span>
          )}
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-lg text-gray-900 dark:text-neutral-900 truncate">{displayName}</h3>
          {handle ? <p className="text-sm text-gray-600 dark:text-neutral-800">{handle}</p> : null}
          <p className="text-sm text-gray-600 dark:text-neutral-800 mt-0.5">ShowCase Type: {showcaseTypeLabel}</p>
        </div>
      </>
    ) : null;

  const createdAtRaw = showcase.createdAt instanceof Date ? showcase.createdAt.toISOString() : String(showcase.createdAt);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-[#003B5C] dark:text-white">
        <div className="max-w-2xl mx-auto px-4 py-5 pb-28">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <button
              type="button"
              onClick={() => router.back()}
              className="p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="h-6 w-6 text-gray-900 dark:text-white" />
            </button>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Work Details</h1>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleLikeToggle}
                disabled={likePending}
                className="inline-flex items-center gap-1 rounded-full px-2 py-2 hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-70"
                aria-label={isLiked ? "Unlike work" : "Like work"}
              >
                <Heart className={`h-5 w-5 ${isLiked ? "fill-[#FF2D2D] text-[#FF2D2D]" : "text-gray-900 dark:text-white"}`} />
                <span className="text-xs font-semibold text-gray-700 dark:text-white/90 min-w-[1ch]">{likesCount}</span>
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                aria-label="Share work"
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

          {/* Media — slate frame in dark mode (matches app detail screens) */}
          {images.length > 0 ? (
            <div className="rounded-[18px] p-3 sm:p-4 mb-5 shadow-sm dark:shadow-none bg-white border border-gray-200 dark:border-0 dark:bg-[#2c3e50]">
              <div className="relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-black/25">
                <button
                  type="button"
                  className="relative w-full h-[220px] sm:h-[300px] cursor-pointer block"
                  onClick={() => setIsImageModalOpen(true)}
                >
                  <img
                    src={images[currentImageIndex] || fallbackImage}
                    alt={showcase.title || "Showcase image"}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = fallbackImage;
                    }}
                  />
                </button>
                {images.length > 1 && (
                  <div className="absolute top-3 right-3 px-3 py-1 bg-black/60 rounded-full text-white text-xs font-medium z-10">
                    {currentImageIndex + 1} / {images.length}
                  </div>
                )}
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
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                      {images.map((_, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentImageIndex(index);
                          }}
                          className={`h-2 rounded-full transition-all ${
                            index === currentImageIndex ? "bg-white w-7 shadow-sm" : "bg-white/45 w-2 hover:bg-white/70"
                          }`}
                          aria-label={`Image ${index + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : null}

          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
            {showcase.title || "Untitled"}
          </h2>

          {/* Provider card → profile */}
          {provider && providerProfileId ? (
            <Link
              href={`/profile/${providerProfileId}`}
              className={`${posterCardBaseClass} transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#003B5C] cursor-pointer block`}
              aria-label={`View profile of ${displayName}`}
            >
              {posterCardInner}
            </Link>
          ) : provider ? (
            <div className={posterCardBaseClass}>{posterCardInner}</div>
          ) : null}

          <div className="mb-5">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">Description</h2>
            <div className="rounded-[18px] p-4 border border-gray-200 bg-white dark:border-0 dark:bg-[#E0E0E0]">
              <p className="text-sm sm:text-base leading-relaxed text-gray-700 dark:text-neutral-900 whitespace-pre-wrap">
                {showcase.description || "No description provided."}
              </p>
            </div>
          </div>

          <div className="mb-5">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">Additional Information</h2>
            <div className="rounded-[18px] p-4 space-y-3 border border-gray-200 bg-white dark:border-0 dark:bg-[#E0E0E0]">
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-gray-500 dark:text-neutral-600 mt-0.5 shrink-0" />
                <p className="text-sm text-gray-800 dark:text-neutral-900">
                  <span className="font-semibold text-gray-600 dark:text-neutral-600">Created</span>{" "}
                  <span className="font-normal">{formatDate(createdAtRaw)}</span>
                </p>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-500 dark:text-neutral-600 mt-0.5 shrink-0" />
                <p className="text-sm text-gray-800 dark:text-neutral-900">
                  <span className="font-semibold text-gray-600 dark:text-neutral-600">Location</span>{" "}
                  <span className="font-normal">{showcase.location || "Not specified"}</span>
                </p>
              </div>
              {skills.length > 0 ? (
                <div className="flex items-start gap-2">
                  <Briefcase className="h-4 w-4 text-gray-500 dark:text-neutral-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-gray-800 dark:text-neutral-900">
                    <span className="font-semibold text-gray-600 dark:text-neutral-600">Skills</span>{" "}
                    <span className="font-normal">{skills.join(", ")}</span>
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          {jobs.length > 0 ? (
            <div className="rounded-[18px] p-4 mb-5 border border-gray-200 bg-slate-100 dark:border-0 dark:bg-[#2c3e50]">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-white/90 mb-3">Open roles from this provider</h2>
              <ul className="space-y-2">
                {jobs.slice(0, 8).map((job) => (
                  <li key={job.jobId} className="text-sm font-medium text-slate-900 dark:text-white/95 leading-snug">
                    • {job.title}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="space-y-3 mb-2">
            {isOwnWork ? (
              <button
                type="button"
                disabled
                className="w-full font-bold py-4 rounded-full flex items-center justify-center gap-2 cursor-not-allowed opacity-60 bg-gray-300 text-gray-600 dark:bg-white/20 dark:text-white/70"
              >
                <MessageCircle className="h-5 w-5" />
                Your work
              </button>
            ) : (
              <button
                type="button"
                onClick={handleContactProvider}
                disabled={isContacting}
                className="w-full text-white font-bold py-4 rounded-full flex items-center justify-center gap-2 shadow-lg transition-opacity hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ backgroundColor: JD_RED }}
              >
                <MessageCircle className="h-5 w-5" />
                {isContacting ? "Opening chat…" : "Contact Provider"}
              </button>
            )}
            <button
              type="button"
              onClick={handleShare}
              className="w-full py-3.5 rounded-full text-sm font-bold flex items-center justify-center gap-2 border border-gray-300 bg-white text-gray-900 shadow-sm hover:bg-gray-50 dark:bg-white dark:text-gray-900 dark:border-0 dark:hover:bg-gray-100 transition-colors"
            >
              <Share2 className="h-5 w-5" />
              Share Work
            </button>
          </div>

          {providerProfileId ? (
            <div className="text-center mt-4">
              <Link
                href={`/profile/${providerProfileId}`}
                prefetch={false}
                className="inline-block text-sm font-semibold underline decoration-2 underline-offset-4 hover:opacity-90"
                style={{ color: JD_RED }}
              >
                View Provider Profile
              </Link>
            </div>
          ) : null}
        </div>
      </div>

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
              alt={showcase.title || "Showcase image"}
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
                        index === currentImageIndex ? "bg-white w-8" : "bg-white/50 w-2 hover:bg-white/70"
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
