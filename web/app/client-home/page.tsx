"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, Map, Search, MessageSquare, Bookmark, Heart, X, QrCode, LocateFixed } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RemoveSavedShowcaseModal } from "@/components/task/RemoveSavedShowcaseModal";
import { EnableLocationModal } from "@/components/modals/EnableLocationModal";
import { RecentSearchesDropdown } from "@/components/ui/RecentSearchesDropdown";
import { useRecentSearches } from "@/lib/utils/recentSearches";
import {
  getAllShowcases,
  formatShowcaseLoadError,
  ShowcaseItem,
  bookmarkShowcase,
  unbookmarkShowcase,
  getBookmarkedShowcaseIds,
} from "@/lib/api/showcase";
import { getOrCreateChatRoom } from "@/lib/api/messages";
import { getUserLikedShowcaseIds, likeShowcase, unlikeShowcase } from "@/lib/api/likes";
import { getUserData, resolveProfileDisplayName } from "@/lib/api/auth";
import { useAuth } from "@/lib/api/AuthContext";
import { QRCodeSVG } from "qrcode.react";
import Image from "next/image";

const fallbackImage = "/images/placeholder_image.png";

// Showcase Tile Component with Auto-sliding
function ShowcaseTile({ item, meta, skills, onSaveToggle, onLikeToggle, likedShowcaseIds, likingShowcaseId, savedShowcaseIds, savingShowcaseId, onNavigate, onContact, currentUserId, contactingId }: {
  item: ShowcaseItem;
  meta?: { name?: string; location?: string };
  skills: string[];
  onSaveToggle: (item: ShowcaseItem) => void;
  onLikeToggle: (item: ShowcaseItem) => void;
  likedShowcaseIds: Set<string>;
  likingShowcaseId: string | null;
  savedShowcaseIds: Set<string>;
  savingShowcaseId: string | null;
  onNavigate: (id: string) => void;
  onContact: (item: ShowcaseItem) => void;
  currentUserId?: string;
  contactingId: string | null;
}) {
  const images = item.imageUrls || [];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const isLiked = Boolean(item.id && likedShowcaseIds.has(item.id));
  const likesCount = Math.max(0, Number(item.likesCount ?? 0) || 0);

  // Auto-slide images if more than 1
  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 3000); // Change image every 3 seconds

    return () => clearInterval(interval);
  }, [images.length]);

  const imageUrl = images[currentImageIndex] || fallbackImage;
  const showTagRow = skills.length > 0 || (item.postingAs === "company" && item.companyName);
  const providerLine = meta?.name?.trim() ? meta.name : "\u00a0";

  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.08)] dark:border-transparent dark:bg-darkBlue-013 dark:shadow-[0_4px_4px_rgba(0,0,0,0.25)]">
      <div
        className="min-w-0 flex-1 cursor-pointer"
        onClick={() => {
          if (item.id) onNavigate(item.id);
        }}
        role="presentation"
      >
        <div className="relative aspect-[5/3] w-full bg-gray-100 dark:bg-gray-800">
          <img
            src={imageUrl}
            alt={item.title || "Showcase"}
            className="h-full w-full object-cover transition-opacity duration-500"
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackImage;
            }}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onLikeToggle(item);
            }}
            aria-label={isLiked ? "Unlike showcase" : "Like showcase"}
            disabled={likingShowcaseId === item.id}
            className="absolute right-2 top-2 z-10 inline-flex h-8 min-w-[2.4rem] items-center justify-center gap-1 rounded-full bg-black/35 px-2 text-white backdrop-blur-sm transition hover:bg-black/50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Heart className={`h-4 w-4 ${isLiked ? "fill-[#FF2D2D] text-[#FF2D2D]" : "text-white"}`} />
            <span className="text-[10px] font-semibold leading-none text-white">{likesCount}</span>
          </button>
          {images.length > 1 && (
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 transform gap-1">
              {images.slice(0, 3).map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 rounded-full transition-all ${
                    index === currentImageIndex ? "w-3 bg-red-500" : "w-1.5 bg-white/50"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-1.5 px-2 pb-1.5 pt-2">
          {showTagRow ? (
            <div className="flex flex-wrap gap-1">
              {skills.slice(0, 2).map((skill, idx) => (
                <span
                  key={`${skill}-${idx}`}
                  className="max-w-full truncate rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700 dark:bg-darkBlue-343 dark:text-white"
                >
                  {skill.length > 12 ? `${skill.substring(0, 12)}…` : skill}
                </span>
              ))}
              {item.postingAs === "company" && item.companyName && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-darkBlue-203 dark:text-white">
                  Company
                </span>
              )}
            </div>
          ) : null}

          <h3 className="line-clamp-2 text-left text-sm font-bold leading-snug text-[#1A202C] dark:text-white">
            {item.title || "Untitled"}
          </h3>

          <div className="flex min-w-0 items-start gap-1 text-left">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-white/55" aria-hidden />
            <p className="min-w-0 truncate text-[11px] leading-snug text-gray-500 dark:text-white/55">
              {item.location || meta?.location || "Remote / Unspecified"}
            </p>
          </div>

          <p className="line-clamp-1 text-left text-sm font-bold text-[#1A202C] dark:text-white/70">{providerLine}</p>
        </div>
      </div>

      <div className="mt-auto flex gap-1.5 border-t border-gray-100 px-2 pb-2 pt-1.5 dark:border-white/10">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSaveToggle(item);
          }}
          disabled={savingShowcaseId === item.id}
          className={`flex min-h-[38px] flex-1 items-center justify-center gap-1 rounded-lg border text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
            item.id && savedShowcaseIds.has(item.id)
              ? "border-[#1A202C] bg-sky-50 text-[#1A202C] dark:border-blue-400/70 dark:bg-darkBlue-203 dark:text-blue-300"
              : "border-gray-200 bg-slate-50 text-[#1A202C] hover:bg-slate-100 dark:border-transparent dark:bg-darkBlue-203 dark:text-white dark:hover:bg-darkBlue-343"
          }`}
        >
          <Bookmark
            className={`h-4 w-4 ${item.id && savedShowcaseIds.has(item.id) ? "fill-current" : ""}`}
            strokeWidth={2}
          />
          {savingShowcaseId === item.id ? "…" : item.id && savedShowcaseIds.has(item.id) ? "Saved" : "Save"}
        </button>
        {currentUserId && item.userId === currentUserId ? (
          <button
            type="button"
            disabled
            className="flex min-h-[38px] flex-1 cursor-not-allowed items-center justify-center gap-1 rounded-lg bg-gray-300 text-xs font-medium text-gray-500 dark:bg-gray-600 dark:text-gray-400"
          >
            <MessageSquare className="h-4 w-4" />
            Yours
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onContact(item);
            }}
            disabled={contactingId === item.id}
            className="flex min-h-[38px] flex-1 items-center justify-center gap-1 rounded-lg text-xs font-bold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: "#E53E3E" }}
          >
            <MessageSquare className="h-4 w-4" />
            {contactingId === item.id ? "…" : "Contact"}
          </button>
        )}
      </div>
    </article>
  );
}

export default function ClientHomePage() {
  const router = useRouter();
  const [showcases, setShowcases] = useState<ShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [userMeta, setUserMeta] = useState<Record<string, { name?: string; location?: string }>>({});
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [savedShowcaseIds, setSavedShowcaseIds] = useState<Set<string>>(new Set());
  const [showcasePendingRemove, setShowcasePendingRemove] = useState<ShowcaseItem | null>(null);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [savingShowcaseId, setSavingShowcaseId] = useState<string | null>(null);
  const [likedShowcaseIds, setLikedShowcaseIds] = useState<Set<string>>(new Set());
  const [likingShowcaseId, setLikingShowcaseId] = useState<string | null>(null);
  const [contactingShowcaseId, setContactingShowcaseId] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [isEnablingLocation, setIsEnablingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const { searches: recentSearches, add: addRecentSearch, remove: removeRecentSearch } = useRecentSearches();
  const { user, loading: authLoading, userData } = useAuth();

  // Generate QR code data with user contact information
  const qrCodeData = user
    ? JSON.stringify({
        name: resolveProfileDisplayName(user, userData),
        email: user.email || "",
        uid: user.uid,
      })
    : "";

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (authLoading) return;
      if (!user) {
        setLoading(false);
        setError("Please sign in to view showcase work.");
        return;
      }

      try {
        setLoading(true);
        setError(null);
        // JWT is sent automatically via `apiFetchJson` / fetch helpers.
        const data = await getAllShowcases();
        if (isMounted) setShowcases(data);
      } catch (err: unknown) {
        console.error("Failed to load showcase items", err);
        if (isMounted) setError(formatShowcaseLoadError(err));
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [authLoading, user]);

  // Hydrate showcase cards with user profile info (name/location) from users collection
  useEffect(() => {
    const loadMeta = async () => {
      const ids = Array.from(new Set(showcases.map((s) => s.userId).filter(Boolean)));
      if (ids.length === 0) return;

      try {
        const entries = await Promise.all(
          ids.map(async (id) => {
            const data = await getUserData(id);
            // Prioritize fullName, if not available extract name from email (part before @)
            let displayName = data?.fullName;
            if (!displayName && data?.email) {
              displayName = data.email.split("@")[0];
            }
            return [
              id,
              {
                name: displayName || "User",
                location: (data as any)?.location || "",
              },
            ] as const;
          })
        );
        setUserMeta((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
      } catch (err) {
        console.warn("Failed to load user meta for showcases", err);
      }
    };

    loadMeta();
  }, [showcases]);

  // Load saved showcase IDs (local bookmarks)
  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    try {
      setSavedShowcaseIds(new Set(getBookmarkedShowcaseIds(uid)));
    } catch (err) {
      console.warn("Failed to load saved showcases", err);
    }
  }, [user?.uid]);

  useEffect(() => {
    const loadLiked = async () => {
      const uid = user?.uid;
      if (!uid) {
        setLikedShowcaseIds(new Set());
        return;
      }
      try {
        const likedIds = await getUserLikedShowcaseIds(uid);
        setLikedShowcaseIds(new Set(likedIds));
      } catch (err) {
        console.warn("Failed to load liked showcases", err);
      }
    };
    void loadLiked();
  }, [user?.uid]);

  // Close the recent-searches dropdown when clicking outside and save the
  // current query to history if it's a real search.
  useEffect(() => {
    if (!searchFocused) return;
    const commitIfNeeded = () => {
      const q = search.trim();
      if (q.length >= 2) addRecentSearch(q);
    };
    const onMouseDown = (e: MouseEvent) => {
      if (!searchWrapRef.current?.contains(e.target as Node)) {
        setSearchFocused(false);
        commitIfNeeded();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchFocused(false);
      } else if (e.key === "Enter") {
        commitIfNeeded();
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [searchFocused, search, addRecentSearch]);

  const handleSelectRecent = useCallback(
    (q: string) => {
      setSearch(q);
      addRecentSearch(q);
      setSearchFocused(false);
    },
    [addRecentSearch],
  );

  const performBookmarkShowcase = useCallback(
    async (showcase: ShowcaseItem) => {
      if (!user || !showcase.id) return;
      setSavingShowcaseId(showcase.id);
      try {
        await bookmarkShowcase(user.uid, showcase.id, showcase.userId);
        setSavedShowcaseIds((prev) => new Set(prev).add(showcase.id!));
      } catch (error: unknown) {
        console.error("Error toggling bookmark:", error);
        alert("Failed to save showcase. Please try again.");
      } finally {
        setSavingShowcaseId(null);
      }
    },
    [user],
  );

  const handleSaveToggle = useCallback(
    (showcase: ShowcaseItem) => {
      if (!user) {
        alert("Please sign in to save showcases.");
        return;
      }
      if (!showcase.id) return;
      if (savedShowcaseIds.has(showcase.id)) {
        setShowcasePendingRemove(showcase);
        return;
      }
      void performBookmarkShowcase(showcase);
    },
    [user, savedShowcaseIds, performBookmarkShowcase],
  );

  const confirmRemoveSavedShowcase = useCallback(async () => {
    if (!user || !showcasePendingRemove?.id) return;
    const sid = showcasePendingRemove.id;
    const previousSaved = savedShowcaseIds;
    setShowcasePendingRemove(null);
    setSavedShowcaseIds((prev) => {
      const next = new Set(prev);
      next.delete(sid);
      return next;
    });
    setSavingShowcaseId(sid);
    try {
      await unbookmarkShowcase(user.uid, sid);
    } catch (error: unknown) {
      console.error("Error removing showcase bookmark:", error);
      setSavedShowcaseIds(previousSaved);
    } finally {
      setSavingShowcaseId(null);
    }
  }, [user, showcasePendingRemove, savedShowcaseIds]);

  const cancelRemoveSavedShowcase = useCallback(() => setShowcasePendingRemove(null), []);

  const adjustShowcaseLikes = useCallback((showcaseId: string, delta: number) => {
    setShowcases((prev) =>
      prev.map((item) =>
        item.id === showcaseId
          ? { ...item, likesCount: Math.max(0, Number(item.likesCount ?? 0) + delta) }
          : item,
      ),
    );
  }, []);

  const handleLikeToggle = useCallback(
    async (showcase: ShowcaseItem) => {
      if (!user) {
        alert("Please sign in to like showcases.");
        return;
      }
      if (!showcase.id) return;
      const sid = showcase.id;
      const wasLiked = likedShowcaseIds.has(sid);
      setLikedShowcaseIds((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.delete(sid);
        else next.add(sid);
        return next;
      });
      adjustShowcaseLikes(sid, wasLiked ? -1 : 1);
      setLikingShowcaseId(sid);
      try {
        if (wasLiked) {
          await unlikeShowcase(user.uid, sid);
        } else {
          await likeShowcase(user.uid, sid, showcase.userId);
        }
      } catch (error) {
        console.error("Error toggling showcase like:", error);
        adjustShowcaseLikes(sid, wasLiked ? 1 : -1);
        setLikedShowcaseIds((prev) => {
          const next = new Set(prev);
          if (wasLiked) next.add(sid);
          else next.delete(sid);
          return next;
        });
      } finally {
        setLikingShowcaseId(null);
      }
    },
    [adjustShowcaseLikes, likedShowcaseIds, user],
  );

  const handleContact = async (showcase: ShowcaseItem) => {
    if (!user) {
      alert("Please sign in to contact providers.");
      return;
    }
    if (!showcase.userId || showcase.userId === user.uid) return;
    setContactingShowcaseId(showcase.id || null);
    try {
      const roomId = await getOrCreateChatRoom([user.uid, showcase.userId]);
      router.push(`/chats/${roomId}`);
    } catch (err) {
      console.error("Error creating chat room:", err);
      alert("Failed to start conversation. Please try again.");
    } finally {
      setContactingShowcaseId(null);
    }
  };

  const nearMeUrl = "/googlemap?focus=showcases&locate=1";
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

  const filteredShowcases = useMemo(() => {
    let filtered = showcases;

    // Filter by saved if showSavedOnly is true
    if (showSavedOnly) {
      filtered = filtered.filter((item) => item.id && savedShowcaseIds.has(item.id));
    }

    // Filter by search query
    const query = search.toLowerCase();
    if (query) {
      filtered = filtered.filter((item) => {
        const haystack = [
          item.title,
          item.description,
          item.location,
          item.companyName,
          item.storeName,
          item.skills,
          item.tags?.join(" "),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      });
    }

    return filtered;
  }, [showcases, search, showSavedOnly, savedShowcaseIds]);

  return (
    <DashboardLayout onQRClick={() => setIsQRModalOpen(true)}>
      {/* QR Code Modal */}
      {isQRModalOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[200] backdrop-blur-sm"
            onClick={() => setIsQRModalOpen(false)}
          />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-darkBlue-003 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
              {/* Header with gradient */}
              <div className="bg-gradient-to-r from-red-700 via-red-800 to-purple-900 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                    <Image
                      src="/images/logos/Taskzing-Logo-light-mode_1.png"
                      alt="TaskZing"
                      width={32}
                      height={32}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <h2 className="text-white font-semibold text-lg">Scan for my Contact Information</h2>
                </div>
                <button
                  onClick={() => setIsQRModalOpen(false)}
                  className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>

              {/* QR Code Display */}
              <div className="p-8 flex flex-col items-center bg-white dark:bg-white">
                <div className="relative bg-white p-4 rounded-lg">
                  {qrCodeData && (
                    <div className="relative w-[280px] h-[280px] mx-auto">
                      <QRCodeSVG
                        value={qrCodeData}
                        size={280}
                        level="H"
                        includeMargin={true}
                        marginSize={2}
                        className="w-full h-full"
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
                  )}
                </div>
              </div>

              {/* Footer Button */}
              <div className="px-6 pb-6">
                <button
                  onClick={() => {
                    // Share QR code functionality
                    if (navigator.share) {
                      navigator.share({
                        title: "My Contact Information",
                        text: "Scan this QR code to get my contact information",
                      });
                    }
                  }}
                  className="w-full py-4 bg-gradient-to-r from-red-700 via-red-800 to-purple-900 text-white rounded-xl font-semibold hover:from-red-800 hover:via-red-900 hover:to-purple-950 transition-all shadow-lg"
                >
                  Scan/Share QR Code
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="-mx-4 sm:-mx-6 lg:-mx-8 -my-8">
        {/* Search Bar - Mobile Layout */}
        <div ref={searchWrapRef} className="border-b border-gray-200 bg-white px-3 py-2.5 dark:border-gray-700 dark:bg-darkBlue-003 sm:px-4 sm:py-3">
          {/* Mobile / tablet: mock layout — combined search + Map, then Show saved + QR */}
          <div className="space-y-2.5 lg:hidden">
            <div className="flex min-w-0 items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <div className="flex min-w-0 items-center overflow-hidden rounded-full border border-gray-800 bg-white p-1 shadow-sm dark:border-white dark:bg-darkBlue-203/60">
                  <button
                    type="button"
                    onClick={requestLocationAndNavigate}
                    aria-label="Open map centered on your location"
                    className="flex shrink-0 items-center gap-1 rounded-full bg-red-600 px-2.5 py-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                  >
                    <LocateFixed className="h-3.5 w-3.5" />
                    <span className="max-[340px]:sr-only">Near me</span>
                  </button>
                  <div className="flex min-w-0 flex-1 items-center pl-3 pr-2">
                    <Search className="h-4 w-4 shrink-0 text-gray-400 dark:text-white/90" aria-hidden />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onFocus={() => setSearchFocused(true)}
                      placeholder="Search for services"
                      className="min-w-0 flex-1 border-0 bg-transparent py-2 pl-1.5 pr-0 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-0 dark:text-white dark:placeholder:text-white/90"
                    />
                  </div>
                </div>
                <RecentSearchesDropdown
                  open={searchFocused}
                  query={search}
                  searches={recentSearches}
                  onSelect={handleSelectRecent}
                  onRemove={removeRecentSearch}
                  onNavigate={() => setSearchFocused(false)}
                />
              </div>
              <Link
                href="/googlemap?focus=showcases&locate=1"
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
              >
                <Map className="h-4 w-4" />
                Map
              </Link>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSavedOnly(!showSavedOnly)}
                aria-pressed={showSavedOnly}
                aria-label={showSavedOnly ? "Showing saved only; tap to show all" : "Show saved showcases only"}
                className={`flex w-1/2 min-w-0 shrink-0 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition-colors ${
                  showSavedOnly
                    ? "border-red-600 bg-red-600 text-white dark:border-red-500/60 dark:bg-red-500"
                    : "border-gray-300 bg-gray-100 text-gray-800 hover:bg-gray-200 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                }`}
              >
                <Bookmark className={`h-4 w-4 ${showSavedOnly ? "fill-white" : ""}`} />
                {showSavedOnly ? "Saved only" : "Show Saved"}
              </button>
              <button
                type="button"
                onClick={() => setIsQRModalOpen(true)}
                className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-gray-300 bg-white transition-colors hover:bg-gray-50 dark:border-white/15 dark:bg-white/10 dark:hover:bg-white/15"
                aria-label="QR Code"
              >
                <QrCode className="h-5 w-5 text-gray-700 dark:text-blue-200" strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Desktop View - Match Provider Explore search bar */}
          <div className="hidden lg:flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <div className="flex h-12 min-w-0 items-center overflow-hidden rounded-[35px] border border-[#2F3B77] bg-white pl-1.5 pr-1 shadow-sm dark:border-white dark:bg-darkBlue-013">
                <button
                  type="button"
                  onClick={requestLocationAndNavigate}
                  aria-label="Open map centered on your location"
                  className="flex shrink-0 items-center gap-1 rounded-full bg-red-600 px-2.5 py-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                >
                  <LocateFixed className="h-3.5 w-3.5" />
                  <span>Near me</span>
                </button>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  placeholder="Search for services"
                  aria-label="Search showcases"
                  className="min-w-0 flex-1 border-0 bg-transparent px-2 py-2 text-[18px] font-semibold leading-none text-[#343B8C] placeholder:text-[#343B8C] focus:outline-none focus:ring-0 dark:text-white dark:placeholder:text-white"
                />
                <button
                  type="button"
                  aria-label="Search"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-600 text-white transition-colors hover:bg-red-700"
                >
                  <Search className="h-6 w-6" aria-hidden />
                </button>
              </div>
              <RecentSearchesDropdown
                open={searchFocused}
                query={search}
                searches={recentSearches}
                onSelect={handleSelectRecent}
                onRemove={removeRecentSearch}
                onNavigate={() => setSearchFocused(false)}
              />
            </div>
            <Link
              href="/googlemap?focus=showcases&locate=1"
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            >
              <Map className="h-4 w-4" />
              Map
            </Link>
            <button
              type="button"
              onClick={() => setShowSavedOnly(!showSavedOnly)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-colors border ${
                showSavedOnly
                  ? "bg-red-500 text-white border-red-600"
                  : "bg-gray-100 dark:bg-blue-500/20 dark:border-blue-500/30 text-gray-700 dark:text-blue-300 border-gray-300 dark:border-blue-500/30 hover:bg-gray-200 dark:hover:bg-blue-500/30"
              }`}
            >
              <Bookmark className={`h-4 w-4 ${showSavedOnly ? "fill-white" : ""}`} />
              Show Saved
            </button>
            <button
              type="button"
              onClick={() => setIsQRModalOpen(true)}
              className="p-2.5 bg-gray-100 dark:bg-blue-500/20 dark:border-blue-500/30 rounded-xl hover:bg-gray-200 dark:hover:bg-blue-500/30 transition-colors flex items-center justify-center border border-gray-300 dark:border-blue-500/30"
              aria-label="QR Code"
              style={{ borderRadius: '12px' }}
            >
              <QrCode className="h-5 w-5 text-gray-700 dark:text-blue-300" strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="mx-auto min-h-screen max-w-6xl space-y-8 bg-gray-50 px-3 py-4 dark:bg-[#003D62] sm:px-6 lg:px-8">

        {/* Showcase feed */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
          {loading &&
            Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="aspect-[3/4] min-w-0 animate-pulse rounded-2xl bg-gray-100 dark:bg-[#003D62]"
              />
            ))}

          {!loading && error && (
            <div className="col-span-full text-center text-red-500 py-8">{error}</div>
          )}

          {!loading && !error && filteredShowcases.length === 0 && (
            <div className="col-span-full text-center text-gray-500 dark:text-gray-400 py-8">
              No showcase items found. Try a different search.
            </div>
          )}

          {!loading &&
            !error &&
            filteredShowcases.map((item) => {
              const skills = item.skills
                ? item.skills.split(",").map((s) => s.trim()).filter(Boolean)
                : item.tags || [];
              const meta = item.userId ? userMeta[item.userId] : undefined;

              return (
                <ShowcaseTile
                  key={item.id || item.title}
                  item={item}
                  meta={meta}
                  skills={skills}
                  onSaveToggle={handleSaveToggle}
                  onLikeToggle={handleLikeToggle}
                  likedShowcaseIds={likedShowcaseIds}
                  likingShowcaseId={likingShowcaseId}
                  savedShowcaseIds={savedShowcaseIds}
                  savingShowcaseId={savingShowcaseId}
                  onNavigate={(id) => {
                    const providerUid = item.userId;
                    const qs = providerUid ? `?provider=${encodeURIComponent(providerUid)}` : "";
                    router.push(`/work-details/${id}${qs}`);
                  }}
                  onContact={handleContact}
                  currentUserId={user?.uid}
                  contactingId={contactingShowcaseId}
                />
              );
            })}
        </div>
        </div>
      </div>

      <RemoveSavedShowcaseModal
        open={showcasePendingRemove !== null}
        showcase={showcasePendingRemove}
        onCancel={cancelRemoveSavedShowcase}
        onConfirm={() => void confirmRemoveSavedShowcase()}
      />
      <EnableLocationModal
        open={showLocationModal}
        loading={isEnablingLocation}
        error={locationError}
        onEnable={requestLocationAndNavigate}
        onLater={() => setShowLocationModal(false)}
      />
    </DashboardLayout>
  );
}

