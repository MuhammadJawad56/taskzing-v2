"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Star,
  Calendar,
  MapPin,
  QrCode,
  X,
  MessageSquare,
  CheckCircle2,
  Bookmark,
} from "lucide-react";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { ProfileJobsFilterBar } from "@/components/profile/ProfileJobsFilterBar";
import { ProfilePhotoLightbox } from "@/components/profile/ProfilePhotoLightbox";
import { ProfileFollowButton } from "@/components/profile/ProfileFollowButton";
import { ProfileQrCodeButton } from "@/components/profile/ProfileQrCodeButton";
import {
  ProfileFollowStatsRow,
  type FollowStatTab,
} from "@/components/profile/ProfileFollowStatsRow";
import {
  buildProfileTabs,
  getAvatarShapeClass,
  getDefaultProfileTab,
  getProfileInitial,
  getViewedProfileRole,
  isProviderRole,
  type ProfileJobFilter,
  type ProfileTabId,
  resolveProfileFollowUserId,
} from "@/lib/profile/profileHelpers";
import { QRCodeSVG } from "qrcode.react";
import Image from "next/image";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getUserById, getUserProfileImageUrl } from "@/lib/api/users";
import { getJobsByClientId } from "@/lib/api/jobs";
import {
  bookmarkShowcase,
  getBookmarkedShowcaseIds,
  getUserShowcases,
  type ShowcaseItem,
  unbookmarkShowcase,
} from "@/lib/api/showcase";
import { useAuth } from "@/lib/api/AuthContext";
import { cn } from "@/lib/utils/cn";
import { getOrCreateChatRoom } from "@/lib/api/messages";
import {
  formatReviewDate,
  getUserReviewStats,
  type UserReviewStats,
} from "@/lib/api/reviews";
import { isBackendConfigured } from "@/lib/backendConfig";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import { getFollowStatusFull } from "@/lib/api/userFollow";
import { Task } from "@/lib/types/task";
import { User } from "@/lib/types/user";
const SKILLS_PREVIEW_MOBILE = 8;
const SKILLS_PREVIEW_DESKTOP = 6;

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLanguage();
  const { user: currentUser, userData, loading: authLoading } = useAuth();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [jobs, setJobs] = useState<Task[]>([]);
  const [showcases, setShowcases] = useState<ShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ProfileTabId>("showcases");
  const [jobFilter, setJobFilter] = useState<ProfileJobFilter>("all");
  const [showQRModal, setShowQRModal] = useState(false);
  const [showPhotoLightbox, setShowPhotoLightbox] = useState(false);
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowedBy, setIsFollowedBy] = useState(false);
  const [loadingFollowStats, setLoadingFollowStats] = useState(true);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [bioExpanded, setBioExpanded] = useState(false);
  const [reviewStats, setReviewStats] = useState<UserReviewStats | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [savedShowcaseIds, setSavedShowcaseIds] = useState<Set<string>>(new Set());
  const [savingShowcaseId, setSavingShowcaseId] = useState<string | null>(null);
  const [contactingShowcaseId, setContactingShowcaseId] = useState<string | null>(null);
  const userId = params?.id as string;
  const followTargetUserId = useMemo(
    () => resolveProfileFollowUserId(profileUser, userId),
    [profileUser, userId],
  );
  const isOwnProfile =
    currentUser?.uid === followTargetUserId ||
    userData?.uid === followTargetUserId ||
    currentUser?.uid === userId ||
    userData?.uid === userId;

  const viewerRole = useMemo(
    () => String(userData?.currentRole || userData?.role || "client").toLowerCase(),
    [userData?.currentRole, userData?.role],
  );
  const viewedRole = useMemo(() => getViewedProfileRole(profileUser), [profileUser]);
  const profileTabIds = useMemo(
    () => buildProfileTabs(viewerRole, viewedRole),
    [viewerRole, viewedRole, isOwnProfile],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (authLoading) return;
    if (currentUser) return;
    const q = window.location.search || "";
    router.replace(`/login?redirect=${encodeURIComponent(`/profile/${userId}${q}`)}`);
  }, [authLoading, currentUser, router, userId]);

  // Helper to get photo URL with fallbacks
  const getPhotoUrl = (user: User | null): string | null => {
    if (!user) return null;
    const url = getUserProfileImageUrl(user) || null;
    // Ensure it's a valid non-empty string
    return (url && typeof url === "string" && url.trim().length > 0) ? url : null;
  };

  // Handle image load errors
  const handleImageError = (userId: string) => {
    setImageErrors((prev) => new Set(prev).add(userId));
  };

  useEffect(() => {
    async function fetchData() {
      if (!userId) return;
      
      setLoading(true);
      try {
        // Fetch user data
        const user = await getUserById(userId);
        if (!user) {
          router.push("/not-found");
          return;
        }
        setProfileUser(user);

        // Fetch jobs posted by this user
        const userJobs = await getJobsByClientId(userId);
        setJobs(userJobs);
        const userShowcases = await getUserShowcases(userId);
        setShowcases(userShowcases);

      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [userId, router, isOwnProfile, currentUser]);

  useEffect(() => {
    if (!currentUser?.uid) {
      setSavedShowcaseIds(new Set());
      return;
    }
    try {
      setSavedShowcaseIds(new Set(getBookmarkedShowcaseIds(currentUser.uid)));
    } catch (e) {
      console.error("Failed to load saved showcases:", e);
    }
  }, [currentUser?.uid]);

  useEffect(() => {
    setBioExpanded(false);
  }, [userId]);

  useEffect(() => {
    if (activeTab !== "reviews" || !userId) return;
    if (!isBackendConfigured()) {
      setReviewStats(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setReviewsLoading(true);
      try {
        const stats = await getUserReviewStats(userId);
        if (!cancelled) setReviewStats(stats);
      } catch (e) {
        console.error("Failed to load reviews", e);
        if (!cancelled) setReviewStats(null);
      } finally {
        if (!cancelled) setReviewsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, userId]);


  useEffect(() => {
    if (!profileUser) return;
    const defaultTab = getDefaultProfileTab(viewerRole, viewedRole);
    setActiveTab(defaultTab);
    setJobFilter("all");
    setShowAllSkills(false);
  }, [profileUser?.uid, viewerRole, viewedRole]);

  useEffect(() => {
    if (!profileTabIds.includes(activeTab)) {
      setActiveTab(profileTabIds[0] ?? "jobs");
    }
  }, [profileTabIds, activeTab]);

  const loadFollowStats = useCallback(async (profileId: string) => {
    if (!profileId) {
      setLoadingFollowStats(false);
      return;
    }
    setLoadingFollowStats(true);
    try {
      const status = await getFollowStatusFull(profileId);
      setFollowingCount(status.followingCount);
      setFollowersCount(status.followersCount);
      setIsFollowing(status.isFollowing);
      setIsFollowedBy(status.isFollowedBy);
    } catch (error) {
      console.error("Error loading follow stats:", error);
    } finally {
      setLoadingFollowStats(false);
    }
  }, []);


  useEffect(() => {
    if (!followTargetUserId || authLoading || !currentUser) return;
    void loadFollowStats(followTargetUserId);
  }, [followTargetUserId, currentUser, authLoading, loadFollowStats]);

  const handleChat = async () => {
    if (!currentUser || !profileUser) {
      alert("Please sign in to send a message.");
      return;
    }

    try {
      const chatRoomId = await getOrCreateChatRoom([currentUser.uid, profileUser.uid]);
      router.push(`/chats/${chatRoomId}`);
    } catch (error) {
      console.error("Error creating chat room:", error);
      alert("Failed to start chat. Please try again.");
    }
  };

  const handleFollowStatTap = (tab: FollowStatTab) => {
    if (!isOwnProfile) return;
    router.push(`/follower-manage?tab=${tab}&userId=${encodeURIComponent(userId)}`);
  };

  const handleFollowChange = (status: {
    isFollowing: boolean;
    isFollowedBy: boolean;
    followersCount: number;
    followingCount: number;
  }) => {
    setIsFollowing(status.isFollowing);
    setIsFollowedBy(status.isFollowedBy);
    setFollowersCount(status.followersCount);
    setFollowingCount(status.followingCount);
  };


  const filteredJobs = useMemo(() => {
    switch (jobFilter) {
      case "active":
        return jobs.filter(
          (job) =>
            job.completionStatus === "open" || job.completionStatus === "in_progress",
        );
      case "complete":
        return jobs.filter((job) => job.completionStatus === "completed");
      default:
        return jobs;
    }
  }, [jobs, jobFilter]);

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toISOString().split("T")[0];
    } catch {
      return dateString;
    }
  };

  // Format member since date
  const formatMemberSince = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      const month = date.toLocaleString("default", { month: "short" });
      const year = date.getFullYear();
      return `Member since ${month} ${year}`;
    } catch {
      return "N/A";
    }
  };

  // Get user initials for avatar
  const getInitials = (name?: string) => {
    if (!name || name === "User") {
      // Try to get initials from profileUser data
      const displayName = profileUser?.fullName || profileUser?.username || profileUser?.email?.split("@")[0];
      if (displayName && displayName !== "User") {
        return displayName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);
      }
      return "U";
    }
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const avatarShapeClass = getAvatarShapeClass(viewedRole);
  const showProviderBadge = isProviderRole(viewedRole);
  const showHandleChip =
    Boolean(profileUser?.username?.trim()) && Boolean(profileUser?.fullName?.trim());

  const tabs = useMemo(
    () =>
      profileTabIds.map((id) => ({
        id,
        label:
          id === "jobs"
            ? t("profile.jobs")
            : id === "showcases"
              ? t("profile.showcases")
              : t("profile.reviews"),
      })),
    [profileTabIds, t],
  );

  const jobFilterOptions: { id: ProfileJobFilter; label: string }[] = [
    { id: "all", label: t("profile.allJobs") },
    { id: "active", label: t("profile.activeJobs") },
    { id: "complete", label: t("profile.completeJobs") },
  ];


  if (!profileUser && !loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-theme-primaryText">User not found</div>
        </div>
      </DashboardLayout>
    );
  }

  const profileDisplayName =
    profileUser?.fullName || profileUser?.username || profileUser?.email?.split("@")[0] || "User";
  const profileHandle = profileUser?.username || profileUser?.email?.split("@")[0] || "user";

  const showcaseSkillPill = (item: ShowcaseItem): string => {
    if (Array.isArray(item.tags) && item.tags.length > 0) return item.tags[0];
    if (typeof item.skills === "string" && item.skills.trim()) {
      return item.skills.split(",").map((s) => s.trim()).filter(Boolean)[0] || "Showcase";
    }
    return item.postingAs === "company"
      ? "Company Showcase"
      : item.postingAs === "instore"
        ? "In-store Showcase"
        : "Showcase";
  };

  const openShowcase = (item: ShowcaseItem) => {
    if (!item.id) return;
    const q = item.userId ? `?provider=${encodeURIComponent(item.userId)}` : "";
    router.push(`/work-details/${item.id}${q}`);
  };

  const handleSaveShowcase = async (item: ShowcaseItem) => {
    if (!currentUser?.uid || !item.id) {
      alert("Please sign in to save showcases.");
      return;
    }
    if (item.userId === currentUser.uid) return;
    setSavingShowcaseId(item.id);
    try {
      const isSaved = savedShowcaseIds.has(item.id);
      if (isSaved) {
        await unbookmarkShowcase(currentUser.uid, item.id);
        setSavedShowcaseIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id!);
          return next;
        });
      } else {
        await bookmarkShowcase(currentUser.uid, item.id, item.userId);
        setSavedShowcaseIds((prev) => new Set(prev).add(item.id!));
      }
    } catch (e) {
      console.error("Failed to toggle showcase save:", e);
      alert("Could not update save status. Please try again.");
    } finally {
      setSavingShowcaseId(null);
    }
  };

  const handleShowcaseContact = async (item: ShowcaseItem) => {
    if (!currentUser?.uid) {
      alert("Please sign in to contact.");
      return;
    }
    const targetUserId = (item.userId || profileUser?.uid || userId || "").trim();
    if (!targetUserId) {
      alert("This showcase is missing owner information.");
      return;
    }
    if (targetUserId === currentUser.uid) return;
    const id = item.id || `${item.userId}-${item.createdAt.getTime()}`;
    setContactingShowcaseId(id);
    try {
      const roomId = await getOrCreateChatRoom([currentUser.uid, targetUserId]);
      router.push(`/chats/${roomId}`);
    } catch (e) {
      console.error("Failed to start chat from showcase:", e);
      alert("Could not start chat. Please try again.");
    } finally {
      setContactingShowcaseId(null);
    }
  };

  /** Public profile link — QR encodes this so a scan opens this user's profile in the browser. */
  const profileQrBase =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const profileQrValue = `${profileQrBase}/profile/${userId}`;

  /** Flutter `_ProfileActionButton`: accent8 bg + accent11 text; radius 18; elevation ~2 */
  const flutterProfileSkillChip =
    "inline-flex items-center rounded-[18px] bg-[#E7E9EE] px-3 py-1.5 text-xs font-medium text-darkBlue-203 shadow-sm dark:bg-darkBlue-203 dark:text-white dark:shadow-md";
  const flutterProfileSkillChipSm =
    "inline-flex items-center rounded-[18px] bg-[#E7E9EE] px-2 py-0.5 text-[10px] font-semibold text-darkBlue-203 shadow-sm dark:bg-darkBlue-203 dark:text-white dark:shadow-md";
  const flutterHandleChip =
    "inline-flex items-center rounded-[18px] bg-[#E7E9EE] px-2.5 py-1 text-xs font-medium text-darkBlue-203 shadow-sm dark:bg-darkBlue-203 dark:text-white dark:shadow-md";

  return (
    <DashboardLayout>
      <div className="mx-auto min-w-0 max-w-7xl bg-transparent px-0 pb-24 pt-0 sm:px-4 lg:px-8 lg:pb-8 lg:pt-8">
        {profileUser && (
          <>
            {/* Mobile profile — match provider UI (circular avatar, pills, scroll tabs) */}
            <div className="mb-0 bg-white px-4 pb-5 pt-3 shadow-[0_1px_0_rgba(0,0,0,0.06)] dark:bg-transparent dark:shadow-none lg:hidden">
              <div className="flex gap-4">
                <ProfileAvatar
                  size="mobile"
                  photoUrl={getPhotoUrl(profileUser)}
                  imageFailed={imageErrors.has(userId)}
                  displayName={profileDisplayName}
                  initial={getProfileInitial(profileDisplayName)}
                  shapeClass={avatarShapeClass}
                  onImageError={() => handleImageError(userId)}
                  onOpenPhoto={() => setShowPhotoLightbox(true)}
                />
                <div className="min-w-0 flex-1">
                  {isOwnProfile ? (
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
                      <h1 className="min-w-0 max-w-full break-words text-lg font-bold leading-tight text-gray-900 dark:text-white">
                        {profileDisplayName}
                      </h1>
                      {profileUser?.isVerified === true ? (
                        <CheckCircle2
                          className="h-4 w-4 shrink-0 text-[#249689]"
                          aria-label="Verified"
                          fill="currentColor"
                        />
                      ) : null}
                      <ProfileQrCodeButton compact onClick={() => setShowQRModal(true)} />
                      <Link href={`/edit-profile?returnTo=/profile/${userId}`} className="inline-flex shrink-0">
                        <span className={cn(flutterProfileSkillChip, "px-3 py-1.5 text-xs font-semibold")}>
                          {t("profile.edit")}
                        </span>
                      </Link>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
                        <h1 className="min-w-0 max-w-full break-words text-lg font-bold leading-tight text-gray-900 dark:text-white">
                          {profileDisplayName}
                        </h1>
                        {profileUser?.isVerified === true ? (
                          <CheckCircle2
                            className="h-4 w-4 shrink-0 text-[#249689]"
                            aria-label="Verified"
                            fill="currentColor"
                          />
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                        <ProfileFollowButton
                          userId={followTargetUserId}
                          displayName={profileDisplayName}
                          isFollowing={isFollowing}
                          isFollowedBy={isFollowedBy}
                          loading={loadingFollowStats}
                          compact
                          onFollowChange={handleFollowChange}
                        />
                        <button
                          type="button"
                          onClick={handleChat}
                          className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#FF2D2D] bg-[#FF2D2D]/10"
                          aria-label={t("profile.message")}
                        >
                          <MessageSquare className="h-5 w-5 text-[#FF2D2D]" strokeWidth={2.25} />
                        </button>
                        <ProfileQrCodeButton compact onClick={() => setShowQRModal(true)} />
                      </div>
                    </div>
                  )}
                  {showHandleChip ? (
                    <div className="mt-2.5">
                      <span className={flutterHandleChip}>@{profileHandle}</span>
                    </div>
                  ) : null}
                  <ProfileFollowStatsRow
                    followingCount={followingCount}
                    followersCount={followersCount}
                    loading={loadingFollowStats}
                    tappable={isOwnProfile}
                    onStatTap={isOwnProfile ? handleFollowStatTap : undefined}
                  />
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm text-[#747474] dark:text-white">
                {profileUser.location ? (
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#747474] dark:text-white" />
                    <span className="min-w-0 leading-snug">{profileUser.location}</span>
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {Number(profileUser.totalRating ?? 0).toFixed(1)}
                  </span>
                  <span className="text-[#747474] dark:text-white/85">
                    ({profileUser.totalReviews ?? 0} Reviews)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 shrink-0 text-red-600 dark:text-[#F21A1A]" />
                  <span>{formatMemberSince(profileUser.createdAt)}</span>
                </div>
              </div>

              {profileUser.description ? (
                <div className="mt-4">
                  <p
                    className={cn(
                      "text-sm leading-relaxed text-[#747474] dark:text-white/95",
                      !bioExpanded && "line-clamp-3",
                    )}
                  >
                    {profileUser.description}
                  </p>
                  {profileUser.description.length > 140 ? (
                    <button
                      type="button"
                      onClick={() => setBioExpanded((e) => !e)}
                      className="mt-1 text-sm font-semibold text-red-600 dark:text-red-400"
                    >
                      {bioExpanded ? "Less" : "More"}
                    </button>
                  ) : null}
                </div>
              ) : null}

              {profileUser.skills && profileUser.skills.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {profileUser.skills.slice(0, 8).map((skill, i) => (
                    <span key={i} className={flutterProfileSkillChip}>
                      {skill}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Desktop profile header */}
            <div className="mb-6 hidden rounded-lg bg-white p-6 dark:bg-transparent lg:block">
              <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
                <ProfileAvatar
                  size="desktop"
                  photoUrl={getPhotoUrl(profileUser)}
                  imageFailed={imageErrors.has(userId)}
                  displayName={profileDisplayName}
                  initial={getProfileInitial(profileDisplayName)}
                  shapeClass={avatarShapeClass}
                  onImageError={() => handleImageError(userId)}
                  onOpenPhoto={() => setShowPhotoLightbox(true)}
                />
                <div className="min-w-0 flex-1">
                  {isOwnProfile ? (
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <h1 className="text-3xl font-bold text-theme-primaryText dark:text-white">
                        {profileDisplayName}
                      </h1>
                      {profileUser?.isVerified === true ? (
                        <CheckCircle2 className="h-6 w-6 shrink-0 text-[#249689]" fill="currentColor" aria-hidden />
                      ) : null}
                      <ProfileQrCodeButton onClick={() => setShowQRModal(true)} />
                      <Link href={`/edit-profile?returnTo=/profile/${userId}`} className="-ml-1">
                        <span className={cn(flutterProfileSkillChip, "px-4 py-2 text-sm font-semibold")}>
                          {t("profile.edit")}
                        </span>
                      </Link>
                    </div>
                  ) : (
                    <div className="mb-2 flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                      <div className="flex min-w-0 max-w-full flex-wrap items-center gap-3 sm:flex-1 sm:pr-2">
                        <h1 className="min-w-0 max-w-full break-words text-3xl font-bold text-theme-primaryText dark:text-white">
                          {profileDisplayName}
                        </h1>
                        {profileUser?.isVerified === true ? (
                          <CheckCircle2 className="h-6 w-6 shrink-0 text-[#249689]" fill="currentColor" aria-hidden />
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                        <ProfileFollowButton
                          userId={followTargetUserId}
                          displayName={profileDisplayName}
                          isFollowing={isFollowing}
                          isFollowedBy={isFollowedBy}
                          loading={loadingFollowStats}
                          onFollowChange={handleFollowChange}
                        />
                        <button
                          type="button"
                          onClick={handleChat}
                          className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#FF2D2D] bg-[#FF2D2D]/10"
                          aria-label={t("profile.message")}
                        >
                          <MessageSquare className="h-6 w-6 text-[#FF2D2D]" strokeWidth={2.25} />
                        </button>
                        <ProfileQrCodeButton onClick={() => setShowQRModal(true)} />
                      </div>
                    </div>
                  )}
                  {showHandleChip ? (
                    <div className="mb-2">
                      <span className={flutterHandleChip}>@{profileHandle}</span>
                    </div>
                  ) : null}
                  <ProfileFollowStatsRow
                    followingCount={followingCount}
                    followersCount={followersCount}
                    loading={loadingFollowStats}
                    tappable={isOwnProfile}
                    onStatTap={isOwnProfile ? handleFollowStatTap : undefined}
                    className="mb-2"
                  />
                  {profileUser.location ? (
                    <div className="mb-2 flex items-center gap-2 text-[#747474] dark:text-white">
                      <MapPin className="h-4 w-4 shrink-0 text-[#747474] dark:text-white" />
                      <span>{profileUser.location}</span>
                    </div>
                  ) : null}
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-[#747474] dark:text-white">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {Number(profileUser.totalRating ?? 0).toFixed(1)}
                    </span>
                    <span className="text-[#747474] dark:text-white/85">
                      ({profileUser.totalReviews ?? 0} Reviews)
                    </span>
                  </div>
                  <div className="mb-2 flex items-center gap-2 text-[#747474] dark:text-white">
                    <Calendar className="h-4 w-4 shrink-0 text-red-600 dark:text-[#F21A1A]" />
                    <span>{formatMemberSince(profileUser.createdAt)}</span>
                  </div>
                  {profileUser.description ? (
                    <p className="mb-3 text-[#747474] dark:text-white/95">{profileUser.description}</p>
                  ) : null}
                  {profileUser.skills && profileUser.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {profileUser.skills.slice(0, 5).map((skill, i) => (
                        <span key={i} className={flutterProfileSkillChip}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Tabs — Flutter: Jobs / Showcases / Reviews / Saved */}
        <div className="border-b border-gray-200 bg-white dark:border-[#4a5f8a]/70 dark:bg-transparent lg:mb-0 lg:rounded-none">
          <nav
            className="flex gap-6 overflow-x-auto px-4 py-0 [-ms-overflow-style:none] [scrollbar-width:none] lg:px-0 [&::-webkit-scrollbar]:hidden"
            aria-label="Tabs"
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "shrink-0 whitespace-nowrap border-b-2 border-transparent pb-3 pt-3 text-sm font-medium transition-colors",
                    isActive
                      ? "text-[#F21A1A]"
                      : "text-gray-600 hover:text-gray-900 dark:text-white/70 dark:hover:text-white",
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {activeTab === "jobs" && (
          <div className="overflow-visible">
            <ProfileJobsFilterBar
              value={jobFilter}
              options={jobFilterOptions}
              onChange={setJobFilter}
            />
          </div>
        )}

        {/* Mobile: showcases list */}
        {activeTab === "showcases" && (
          <div className="min-h-[45vh] bg-white px-4 py-6 dark:bg-transparent lg:hidden">
            {showcases.length === 0 ? (
              <p className="text-center text-base text-gray-500 dark:text-gray-400">
                No showcases yet
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-3">
                {showcases.map((item) => {
                  const image = item.imageUrls?.[0];
                  const title = item.title || "Untitled showcase";
                  const skill = showcaseSkillPill(item);
                  return (
                    <li key={item.id || `${item.userId}-${item.createdAt.getTime()}`}>
                      <button
                        type="button"
                        onClick={() => openShowcase(item)}
                        className="h-full w-full overflow-hidden rounded-[18px] border border-gray-200 bg-white text-left shadow-[0_6px_14px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-darkBlue-203/50"
                      >
                        <div className="relative h-28 w-full bg-gray-200 dark:bg-darkBlue-013">
                          {image ? (
                            <img src={image} alt={title} className="h-full w-full object-cover" loading="lazy" />
                          ) : null}
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
                          <p className="absolute bottom-2 left-2 right-2 line-clamp-2 text-lg font-semibold leading-tight text-white">
                            {title}
                          </p>
                        </div>
                        <div className="px-3 pb-3 pt-2">
                          <p className="line-clamp-1 text-lg font-bold leading-tight text-gray-900 dark:text-white">
                            {title}
                          </p>
                          <div className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-white/70">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="line-clamp-1">{item.location || "Location unavailable"}</span>
                          </div>
                          <p className="mt-1.5 line-clamp-2 text-xs text-gray-600 dark:text-white/75">
                            {item.description || "No description"}
                          </p>
                          <div className="mt-2">
                            <span className={flutterProfileSkillChipSm}>{skill}</span>
                          </div>
                          <div className="mt-2 flex gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleSaveShowcase(item);
                              }}
                              disabled={
                                savingShowcaseId === item.id ||
                                !item.id ||
                                item.userId === currentUser?.uid
                              }
                              className="flex flex-1 items-center justify-center rounded-lg bg-gray-100 px-2 py-1.5 text-xs font-semibold text-darkBlue-003 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/10 dark:text-white"
                            >
                              {item.id && savedShowcaseIds.has(item.id) ? "Saved" : "Save"}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleShowcaseContact(item);
                              }}
                              disabled={
                                (item.userId || profileUser?.uid || userId || "").trim() === currentUser?.uid ||
                                contactingShowcaseId ===
                                  (item.id || `${item.userId}-${item.createdAt.getTime()}`)
                              }
                              className="flex flex-1 items-center justify-center rounded-lg bg-red-500 px-2 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {contactingShowcaseId ===
                              (item.id || `${item.userId}-${item.createdAt.getTime()}`)
                                ? "..."
                                : item.userId === currentUser?.uid
                                  ? "Yours"
                                  : "Contact"}
                            </button>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* Mobile: jobs list or empty */}
        {activeTab === "jobs" && (
          <div className="min-h-[45vh] bg-white px-4 py-12 dark:bg-transparent lg:hidden">
            {filteredJobs.length === 0 ? (
              <p className="text-center text-base text-gray-500 dark:text-gray-400">No jobs yet</p>
            ) : (
              <ul className="space-y-3">
                {filteredJobs.map((job) => (
                  <li key={job.jobId}>
                    <button
                      type="button"
                      onClick={() => router.push(`/all-jobs/${job.jobId}`)}
                      className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-gray-300 dark:border-white/10 dark:bg-darkBlue-203/40 dark:hover:border-white/20"
                    >
                      <p className="font-semibold text-gray-900 dark:text-white">{job.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                        {job.description || job.address || "—"}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                        <span>{formatDate(job.jobDate || job.createdAt)}</span>
                        <span className="text-gray-300">·</span>
                        <span className="font-medium text-darkBlue-003 dark:text-white">
                          ${job.price || job.fixedPrice || 0}
                        </span>
                        <span className="text-gray-300">·</span>
                        <span className="capitalize">{job.completionStatus || "open"}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Desktop: showcases grid */}
        {activeTab === "showcases" && (
          <div className="mt-6 hidden rounded-lg bg-white p-6 dark:bg-transparent lg:block">
            {showcases.length === 0 ? (
              <p className="py-8 text-center text-theme-accent4 dark:text-gray-300">No showcases yet</p>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {showcases.map((item) => {
                  const image = item.imageUrls?.[0];
                  const title = item.title || "Untitled showcase";
                  const skill = showcaseSkillPill(item);
                  return (
                    <button
                      key={item.id || `${item.userId}-${item.createdAt.getTime()}`}
                      type="button"
                      onClick={() => openShowcase(item)}
                      className="overflow-hidden rounded-[22px] border border-gray-200 bg-white text-left shadow-[0_6px_14px_rgba(0,0,0,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(0,0,0,0.12)] dark:border-white/10 dark:bg-darkBlue-203/50"
                    >
                      <div className="relative h-44 w-full bg-gray-200 dark:bg-darkBlue-013">
                        {image ? (
                          <img src={image} alt={title} className="h-full w-full object-cover" loading="lazy" />
                        ) : null}
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
                        <p className="absolute bottom-3 left-3 right-3 line-clamp-2 text-xl font-semibold leading-tight text-white">
                          {title}
                        </p>
                      </div>
                      <div className="px-4 pb-4 pt-3">
                        <p className="line-clamp-1 text-xl font-bold leading-tight text-gray-900 dark:text-white">
                          {title}
                        </p>
                        <div className="mt-1.5 flex items-center gap-1.5 text-sm text-gray-500 dark:text-white/70">
                          <MapPin className="h-4 w-4 shrink-0" />
                          <span className="line-clamp-1">{item.location || "Location unavailable"}</span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm text-gray-600 dark:text-white/75">
                          {item.description || "No description"}
                        </p>
                        <div className="mt-3">
                          <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-darkBlue-003 dark:bg-white/10 dark:text-white">
                            {skill}
                          </span>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleSaveShowcase(item);
                            }}
                            disabled={
                              savingShowcaseId === item.id ||
                              !item.id ||
                              item.userId === currentUser?.uid
                            }
                            className="flex flex-1 items-center justify-center rounded-xl bg-gray-100 px-3 py-2 text-sm font-semibold text-darkBlue-003 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/10 dark:text-white"
                          >
                            {item.id && savedShowcaseIds.has(item.id) ? "Saved" : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleShowcaseContact(item);
                            }}
                            disabled={
                              (item.userId || profileUser?.uid || userId || "").trim() === currentUser?.uid ||
                              contactingShowcaseId ===
                                (item.id || `${item.userId}-${item.createdAt.getTime()}`)
                            }
                            className="flex flex-1 items-center justify-center rounded-xl bg-red-500 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {contactingShowcaseId ===
                            (item.id || `${item.userId}-${item.createdAt.getTime()}`)
                              ? "..."
                              : item.userId === currentUser?.uid
                                ? "Yours"
                                : "Contact"}
                          </button>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Desktop: jobs table */}
        {activeTab === "jobs" && (
          <div className="mt-6 hidden overflow-hidden rounded-lg bg-white dark:rounded-none dark:bg-transparent lg:block">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-theme-accent2 dark:divide-gray-600">
                <thead className="rounded-t-lg bg-white dark:rounded-none dark:bg-transparent">
                  <tr className="border-b border-gray-200 dark:border-gray-600">
                    <th className="rounded-tl-lg px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-200 dark:rounded-none">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-200">
                      Job Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-200">
                      Delivery Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-200">
                      Budget
                    </th>
                    <th className="rounded-tr-lg px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-200 dark:rounded-none">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-accent2 bg-white dark:divide-gray-600 dark:bg-transparent">
                  {filteredJobs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-8 text-center text-theme-accent4 dark:text-gray-300"
                      >
                        No jobs yet
                      </td>
                    </tr>
                  ) : (
                    filteredJobs.map((job) => (
                      <tr 
                        key={job.jobId} 
                        onClick={() => router.push(`/all-jobs/${job.jobId}`)}
                        className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-8 w-8 rounded-full bg-pink-200 text-pink-700 flex items-center justify-center text-xs font-medium overflow-hidden">
              {getPhotoUrl(profileUser) && !imageErrors.has(userId) ? (
                <img
                  src={getPhotoUrl(profileUser)!}
                  alt={profileUser?.fullName || profileUser?.username || profileUser?.email?.split("@")[0] || "User"}
                  className="w-full h-full object-cover"
                  onError={() => handleImageError(userId)}
                  loading="lazy"
                />
              ) : (
                <span>{getInitials(profileUser?.fullName || profileUser?.username || profileUser?.email?.split("@")[0] || "User")}</span>
              )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
              <div>
                            <div className="font-medium text-theme-primaryText dark:text-white">
                              {job.title}
                            </div>
                            <p className="max-w-md truncate text-sm text-theme-accent4 dark:text-gray-300">
                              {job.description || job.address}
                            </p>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-theme-accent4 dark:text-gray-300">
                          {formatDate(job.jobDate || job.createdAt)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 font-medium text-theme-primaryText dark:text-white">
                          ${job.price || job.fixedPrice || 0}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className="text-theme-primaryText dark:text-gray-200">
                            {job.completionStatus || "open"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reviews Tab — Firestore `Reviews` where targetUserId = profile (Flutter getUserReviewStats) */}
        {activeTab === "reviews" && (
          <div className="rounded-none bg-white px-4 py-6 dark:bg-transparent lg:rounded-lg lg:p-6 dark:lg:bg-transparent">
            {reviewsLoading ? (
              <p className="py-8 text-center text-gray-500 dark:text-white/70">Loading reviews…</p>
            ) : !isBackendConfigured() ? (
              <p className="py-8 text-center text-gray-500 dark:text-white/70">
                Reviews could not be loaded. Sign in and try again.
              </p>
            ) : !reviewStats || reviewStats.totalReviews === 0 ? (
              <p className="py-8 text-center text-base text-gray-500 dark:text-white">No reviews yet</p>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-baseline gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                  <span className="text-sm text-gray-600 dark:text-white/85">Average</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {reviewStats.averageRating.toFixed(1)}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-white/70">
                    · {reviewStats.totalReviews} review{reviewStats.totalReviews === 1 ? "" : "s"}
                  </span>
                </div>
                <ul className="space-y-3">
                  {reviewStats.reviews.map((r) => {
                    const stars = Math.round(Math.min(5, Math.max(1, r.rating)));
                    const when = formatReviewDate(r.createdAt);
                    return (
                      <li
                        key={r.id}
                        className="rounded-lg border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-darkBlue-203/50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{r.reviewerName}</p>
                            <div className="mt-0.5 flex items-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3.5 w-3.5 ${
                                    i < stars
                                      ? "fill-amber-400 text-amber-400"
                                      : "text-gray-300 dark:text-white/25"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          {when ? (
                            <span className="shrink-0 text-xs text-gray-500 dark:text-white/65">{when}</span>
                          ) : null}
                        </div>
                        {r.reviewText ? (
                          <p className="mt-2 text-sm text-gray-700 dark:text-white/90">{r.reviewText}</p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Legacy liked-tab UI (not in Flutter profile) — keep disabled
        {false && activeTab === "liked" && (
          <div className="rounded-none bg-white px-4 py-4 dark:bg-transparent lg:rounded-lg lg:p-6 dark:lg:bg-transparent">
            {savedItemsLoading ? (
              <div className="text-center py-8 text-theme-accent4">Loading liked items...</div>
            ) : (
              <div className="space-y-8">
                <section>
                  <h3 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">Liked Jobs</h3>
                  {savedJobs.length === 0 ? (
                    <p className="text-theme-accent4 py-2">No liked jobs yet.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
                      {savedJobs.map((job) => (
                        <ProviderExploreJobCard
                          key={job.jobId}
                          task={job}
                          saved={bookmarkJobIdSet.has(job.jobId)}
                          onToggleSave={handleLikedTabJobSaveToggle(job)}
                          liked
                          likesCount={job.likesCount ?? 0}
                          likePending={likingJobId === job.jobId}
                          onToggleLike={handleLikedTabJobUnlike(job)}
                        />
                      ))}
                    </div>
                  )}
                </section>

                <section>
                  <h3 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">Liked Showcases</h3>
                  {savedShowcases.length === 0 ? (
                    <p className="text-theme-accent4 py-2">No liked showcases yet.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                      {savedShowcases.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => router.push(`/work-details/${item.id}`)}
                          className="w-full overflow-hidden rounded-2xl border border-black/10 bg-[#F6F6F6] text-left shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-colors hover:bg-[#efefef] dark:border-white/10 dark:bg-darkBlue-203 dark:hover:bg-darkBlue-343/70"
                        >
                          {item.imageUrls?.[0] ? (
                            <img src={item.imageUrls[0]} alt={item.title || "Showcase"} className="h-28 w-full object-cover" loading="lazy" />
                          ) : null}
                          <div className="p-4">
                            <p className="line-clamp-1 text-sm font-semibold text-gray-900 dark:text-white">{item.title || "Showcase"}</p>
                            <p className="mt-1 line-clamp-2 text-xs text-gray-600 dark:text-white/80">{item.description || "No description"}</p>
                            <p className="mt-2 line-clamp-1 text-xs text-gray-700 dark:text-white/90">{item.location || "Location unavailable"}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        )}
        */}


        {profileUser ? (
          <ProfilePhotoLightbox
            open={showPhotoLightbox}
            onClose={() => setShowPhotoLightbox(false)}
            photoUrl={
              getPhotoUrl(profileUser) && !imageErrors.has(userId) ? getPhotoUrl(profileUser) : null
            }
            displayName={profileDisplayName}
            initial={getProfileInitial(profileDisplayName)}
            shapeClass={avatarShapeClass}
          />
        ) : null}

        {/* QR Code Modal */}
        {showQRModal && profileUser && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-[200] backdrop-blur-sm"
              onClick={() => setShowQRModal(false)}
            />
            <div className="fixed inset-0 z-[201] flex items-center justify-center p-2 sm:p-3">
              <div className="bg-white dark:bg-darkBlue-003 rounded-2xl w-full max-w-[min(92vw,22.5rem)] shadow-2xl overflow-hidden">
                {/* Header with gradient */}
                <div className="bg-gradient-to-r from-red-700 via-red-800 to-purple-900 px-3 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-2.5">
                  <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                      <Image
                        src="/images/logos/Taskzing-Logo-light-mode_1.png"
                        alt="TaskZing"
                        width={32}
                        height={32}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <h2 className="min-w-0 truncate text-white font-semibold text-sm sm:text-base leading-snug">
                      {isOwnProfile
                        ? "Scan for my Contact Information"
                        : `Scan — ${profileDisplayName}`}
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowQRModal(false)}
                    className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
                  >
                    <X className="h-5 w-5 text-white" />
                  </button>
                </div>

                {/* QR Code Display */}
                <div className="p-3 sm:p-4 md:p-6 flex flex-col items-center bg-white dark:bg-white">
                  <p className="mb-3 max-w-[90%] text-center text-xs sm:text-sm text-gray-600 break-words">
                    {profileDisplayName}
                    <span className="text-gray-400"> · </span>@{profileHandle}
                    {profileUser?.location ? (
                      <>
                        <span className="text-gray-400"> · </span>
                        {profileUser.location}
                      </>
                    ) : null}
                  </p>
                  <div className="relative bg-white p-2 sm:p-2.5 md:p-3 rounded-lg">
                    <div className="relative h-[min(62vw,210px)] w-[min(62vw,210px)] mx-auto">
                      <QRCodeSVG
                        value={profileQrValue}
                        size={280}
                        level="H"
                        includeMargin={true}
                        marginSize={2}
                        className="h-full w-full"
                      />
                      {/* TaskZing Logo Overlay - Centered */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center shadow-lg border-2 border-gray-100 overflow-hidden p-2">
                          <Image
                            src="/images/logos/Taskzing-Logo-light-mode_1.png"
                            alt="TaskZing"
                            width={64}
                            height={64}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 max-w-[90%] text-center text-[11px] text-gray-500">
                    Scanning opens this TaskZing profile in the browser so others can see full details.
                  </p>
                </div>

                {/* Footer Button */}
                <div className="px-3 pb-3 sm:px-4 sm:pb-4">
                  <button
                    onClick={() => {
                      const profileUrl = profileQrValue;
                      if (navigator.share) {
                        navigator.share({
                          url: profileUrl,
                        });
                      } else {
                        // Fallback: Copy to clipboard
                        navigator.clipboard.writeText(profileUrl);
                        alert("Profile link copied to clipboard!");
                      }
                    }}
                    className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-red-700 via-red-800 to-purple-900 text-white rounded-xl text-base font-semibold hover:from-red-800 hover:via-red-900 hover:to-purple-950 transition-all shadow-lg"
                  >
                    Scan/Share QR Code
                  </button>
                </div>
              </div>
            </div>
          </>
            )}

      </div>
    </DashboardLayout>
  );
}
