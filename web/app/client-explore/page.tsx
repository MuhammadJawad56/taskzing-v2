"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, SlidersHorizontal, ChevronDown, MapPin, MessageSquare, Heart } from "lucide-react";
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
import { getUserData } from "@/lib/api/auth";
import { useAuth } from "@/lib/api/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RemoveSavedShowcaseModal } from "@/components/task/RemoveSavedShowcaseModal";
import {
  ClientExploreFilterSheet,
  clientExploreFiltersDefault,
  type ClientExploreFilters,
} from "@/components/task/ClientExploreFilterSheet";
import { RecentSearchesDropdown } from "@/components/ui/RecentSearchesDropdown";
import { useRecentSearches } from "@/lib/utils/recentSearches";
import { cn } from "@/lib/utils/cn";
import { ExploreHeroSection } from "@/components/explore/ExploreHeroSection";
import { EnableLocationModal } from "@/components/modals/EnableLocationModal";

const categories = [
  "Construction & Repair",
  "Home Improvement",
  "Lifestyle",
  "Professional",
  "Property Maintenance",
  "Specialty",
];

const ratingOptions = ["All", "5 Stars", "4+ Stars", "3+ Stars", "2+ Stars"];
const sortOptions = ["Newest", "Oldest", "Rating: High to Low", "Rating: Low to High"];
const postingTypeOptions = ["All", "Individual", "Company", "In Store"];

const ratingLabelToCode = (label: string): ClientExploreFilters["rating"] => {
  if (label.startsWith("5")) return "5";
  if (label.startsWith("4")) return "4";
  if (label.startsWith("3")) return "3";
  if (label.startsWith("2")) return "2";
  return "";
};

const ratingCodeToLabel = (code: ClientExploreFilters["rating"]): string => {
  if (code === "5") return "5 Stars";
  if (code === "4") return "4+ Stars";
  if (code === "3") return "3+ Stars";
  if (code === "2") return "2+ Stars";
  return "All";
};

const fallbackImage = "/images/placeholder_image.png";

/** Native `<select>` cannot style the open panel; this matches the reference mobile UI. */
function MobileFilterDropdown({
  label,
  value,
  options,
  onChange,
  ariaLabel,
  isOpen,
  onOpenChange,
  zOnOpen,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (next: string) => void;
  ariaLabel: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  zOnOpen: boolean;
}) {
  return (
    <div className={cn("min-w-0", zOnOpen && "relative z-50")}>
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-500 dark:text-white/95">
        {label}
      </span>
      <div className="relative">
        <button
          type="button"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label={ariaLabel}
          onClick={() => onOpenChange(!isOpen)}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-xl border bg-white py-2 pl-4 pr-3 text-left text-sm font-semibold text-darkBlue-003 transition-shadow dark:bg-darkBlue-203 dark:text-white",
            isOpen
              ? "border-rose-300 shadow-[0_0_0_1px_rgb(251,113,133)] dark:border-rose-400/60 dark:shadow-[0_0_0_1px_rgba(251,113,133,0.35)]"
              : "border-gray-200 dark:border-white/20",
          )}
        >
          <span className="min-w-0 truncate">{value}</span>
          <ChevronDown
            className={cn("h-2.5 w-2.5 shrink-0 text-gray-400 transition-transform dark:text-white/90", isOpen && "rotate-180")}
            strokeWidth={2}
            aria-hidden
          />
        </button>
        {isOpen && (
          <ul
            role="listbox"
            className="absolute left-0 right-0 z-40 mt-1 overflow-hidden rounded-lg border border-gray-300 bg-white shadow-md dark:border-white/20 dark:bg-darkBlue-013"
          >
            <li
              role="option"
              aria-selected="true"
              className="border-b border-white/10 bg-darkBlue-203 px-3 py-2.5 text-sm font-semibold text-white dark:bg-darkBlue-203"
            >
              {value}
            </li>
            {options
              .filter((o) => o !== value)
              .map((option) => (
                <li key={option} className="border-b border-gray-100 last:border-b-0 dark:border-white/10">
                  <button
                    type="button"
                    role="option"
                    aria-selected="false"
                    className="w-full px-3 py-2.5 text-left text-sm font-medium text-darkBlue-003 hover:bg-gray-50 dark:text-white dark:hover:bg-white/10"
                    onClick={() => {
                      onChange(option);
                      onOpenChange(false);
                    }}
                  >
                    {option}
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ShowcaseTile Component with Auto-sliding
function ShowcaseTile({ item, meta, skills, onSaveToggle, onLikeToggle, likedShowcaseIds, likingShowcaseId, savedShowcaseIds, savingShowcaseId, onNavigate, onContact, currentUserId, contactingId }: {
  item: ShowcaseItem;
  meta?: { name?: string; location?: string; rating?: number };
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

export default function ClientExplorePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [showcases, setShowcases] = useState<ShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [selectedSort, setSelectedSort] = useState("Newest");
  const [appliedClientFilters, setAppliedClientFilters] = useState(clientExploreFiltersDefault);
  const [draftClientFilters, setDraftClientFilters] = useState(clientExploreFiltersDefault);
  const [userMeta, setUserMeta] = useState<Record<string, { name?: string; location?: string; rating?: number }>>({});
  const [savedShowcaseIds, setSavedShowcaseIds] = useState<Set<string>>(new Set());
  const [likedShowcaseIds, setLikedShowcaseIds] = useState<Set<string>>(new Set());
  const [showcasePendingRemove, setShowcasePendingRemove] = useState<ShowcaseItem | null>(null);
  const [savingShowcaseId, setSavingShowcaseId] = useState<string | null>(null);
  const [likingShowcaseId, setLikingShowcaseId] = useState<string | null>(null);
  const [contactingShowcaseId, setContactingShowcaseId] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();

  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [mobileRatingOpen, setMobileRatingOpen] = useState(false);
  const [mobileSortOpen, setMobileSortOpen] = useState(false);
  const mobileExploreFiltersRef = useRef<HTMLDivElement>(null);

  const [searchFocused, setSearchFocused] = useState(false);
  const heroSearchRef = useRef<HTMLDivElement>(null);
  const { searches: recentSearches, add: addRecentSearch, remove: removeRecentSearch } = useRecentSearches();
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [isEnablingLocation, setIsEnablingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");

  useEffect(() => {
    if (!searchFocused) return;
    const commitIfNeeded = () => {
      const q = searchQuery.trim();
      if (q.length >= 2) addRecentSearch(q);
    };
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!heroSearchRef.current?.contains(target)) {
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
    if (!mobileRatingOpen && !mobileSortOpen) return;
    const close = (e: MouseEvent) => {
      const root = mobileExploreFiltersRef.current;
      if (root && !root.contains(e.target as Node)) {
        setMobileRatingOpen(false);
        setMobileSortOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileRatingOpen(false);
        setMobileSortOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileRatingOpen, mobileSortOpen]);

  const openFilterSheet = useCallback(() => {
    setDraftClientFilters(appliedClientFilters);
    setIsFilterOpen(true);
  }, [appliedClientFilters]);

  const handleClearFilterSheet = useCallback(() => {
    setDraftClientFilters(clientExploreFiltersDefault());
  }, []);

  const handleApplyFilterSheet = useCallback(() => {
    setAppliedClientFilters(draftClientFilters);
    setIsFilterOpen(false);
  }, [draftClientFilters]);

  // Load showcases
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

  // Load user metadata for showcases
  useEffect(() => {
    const loadMeta = async () => {
      const ids = Array.from(new Set(showcases.map((s) => s.userId).filter(Boolean)));
      if (ids.length === 0) return;

      try {
        const entries = await Promise.all(
          ids.map(async (id) => {
            try {
              const data = await getUserData(id);
              let displayName = data?.fullName;
              if (!displayName && data?.email) {
                displayName = data.email.split("@")[0];
              }
              return [
                id,
                {
                  name: displayName || "User",
                  location: data?.location || "",
                  rating: data?.totalRating || 0,
                },
              ] as const;
            } catch (error) {
              console.warn(`Failed to load user data for ${id}:`, error);
              return [
                id,
                {
                  name: "User",
                  location: "",
                },
              ] as const;
            }
          })
        );
        setUserMeta(Object.fromEntries(entries));
      } catch (error) {
        console.error("Error loading user metadata:", error);
      }
    };

    if (showcases.length > 0) {
      loadMeta();
    }
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

  const getActiveFiltersCount = () => {
    let count = 0;
    if (appliedClientFilters.location.trim()) count++;
    if (appliedClientFilters.area.trim()) count++;
    if (appliedClientFilters.postingType !== "All") count++;
    if (appliedClientFilters.dayPosted !== "any") count++;
    if (appliedClientFilters.rating !== "") count++;
    return count;
  };

  // Filter and sort showcases
  const filteredAndSortedShowcases = useMemo(() => {
    let filtered = [...showcases];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.location?.toLowerCase().includes(query) ||
          item.skills?.toLowerCase().includes(query) ||
          item.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Category filter (using tags or skills)
    if (selectedCategory) {
      filtered = filtered.filter(
        (item) =>
          item.tags?.some((tag) => tag.toLowerCase().includes(selectedCategory.toLowerCase())) ||
          item.skills?.toLowerCase().includes(selectedCategory.toLowerCase())
      );
    }

    // Rating filter
    if (appliedClientFilters.rating !== "") {
      const minRating = Number(appliedClientFilters.rating);
      filtered = filtered.filter((item) => {
        const userRating = userMeta[item.userId]?.rating || 0;
        return userRating >= minRating;
      });
    }

    // Posting Type filter
    if (appliedClientFilters.postingType !== "All") {
      const postingTypeMap: Record<string, "individual" | "company" | "instore"> = {
        Individual: "individual",
        Company: "company",
        "In Store": "instore",
      };
      const targetType = postingTypeMap[appliedClientFilters.postingType];
      if (targetType) {
        filtered = filtered.filter((item) => item.postingAs === targetType);
      }
    }

    if (appliedClientFilters.location.trim()) {
      const locationLower = appliedClientFilters.location.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.location?.toLowerCase().includes(locationLower) ||
          userMeta[item.userId]?.location?.toLowerCase().includes(locationLower),
      );
    }

    if (appliedClientFilters.area.trim()) {
      const areaLower = appliedClientFilters.area.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.location?.toLowerCase().includes(areaLower) ||
          userMeta[item.userId]?.location?.toLowerCase().includes(areaLower),
      );
    }

    if (appliedClientFilters.dayPosted !== "any") {
      const now = new Date();
      filtered = filtered.filter((item) => {
        const itemDate = item.createdAt instanceof Date ? item.createdAt : new Date(item.createdAt);
        const diffHours = (now.getTime() - itemDate.getTime()) / (1000 * 60 * 60);
        if (appliedClientFilters.dayPosted === "24h") return diffHours <= 24;
        if (appliedClientFilters.dayPosted === "week") return diffHours <= 168;
        if (appliedClientFilters.dayPosted === "month") return diffHours <= 720;
        if (appliedClientFilters.dayPosted === "month+") return diffHours > 720;
        return true;
      });
    }

    // Saved filter
    if (showSaved) {
      filtered = filtered.filter((item) => item.id && savedShowcaseIds.has(item.id));
    }

    // Sort
    filtered.sort((a, b) => {
      switch (selectedSort) {
        case "Oldest":
          return a.createdAt.getTime() - b.createdAt.getTime();
        case "Rating: High to Low":
          const ratingA = userMeta[a.userId]?.rating || 0;
          const ratingB = userMeta[b.userId]?.rating || 0;
          return ratingB - ratingA;
        case "Rating: Low to High":
          const ratingA2 = userMeta[a.userId]?.rating || 0;
          const ratingB2 = userMeta[b.userId]?.rating || 0;
          return ratingA2 - ratingB2;
        case "Newest":
        default:
          return b.createdAt.getTime() - a.createdAt.getTime();
      }
    });

    return filtered;
  }, [
    showcases,
    searchQuery,
    selectedCategory,
    appliedClientFilters,
    showSaved,
    selectedSort,
    savedShowcaseIds,
    userMeta,
  ]);

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
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }, [router]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q.length >= 2) addRecentSearch(q);
    setSearchFocused(false);
  };

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

  return (
    <DashboardLayout>
      <style dangerouslySetInnerHTML={{__html: `
        .category-scroll::-webkit-scrollbar {
          display: none;
        }
        .category-scroll {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />

      <ClientExploreFilterSheet
        open={isFilterOpen}
        draft={draftClientFilters}
        setDraft={setDraftClientFilters}
        onClose={() => setIsFilterOpen(false)}
        onClearAll={handleClearFilterSheet}
        onApply={handleApplyFilterSheet}
      />

      <div ref={heroSearchRef} className="relative -mx-3 sm:-mx-6 lg:-mx-8">
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

      <div className="mx-auto w-full min-w-0 max-w-6xl px-3 py-4 dark:bg-[#003D62] sm:px-6 lg:px-8 lg:pt-4 lg:pb-6">
        {/* Mobile: Flutter-style full-width top/bottom dividers + category row */}
        <div className="-mx-3 mb-2 min-w-0 border-y-2 border-[#d2d2d3] px-5 pb-4 pt-[13px] dark:border-white/35 sm:-mx-6 lg:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={openFilterSheet}
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border border-gray-200 bg-[#E7E9EE] shadow-sm dark:border-white/25 dark:bg-darkBlue-203 dark:shadow-none"
              aria-label="Open filters"
            >
              <SlidersHorizontal className="h-4 w-4 text-darkBlue-003 dark:text-white/95" strokeWidth={2.2} />
              {getActiveFiltersCount() > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold text-white">
                  {getActiveFiltersCount()}
                </span>
              )}
            </button>
            <div className="category-scroll flex min-w-0 flex-1 items-center gap-[23px] overflow-x-auto py-1">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                  className={`max-w-[12rem] shrink-0 truncate text-left text-[15px] font-semibold transition-colors ${
                    selectedCategory === category
                      ? "text-red-600 dark:text-red-400"
                      : "text-darkBlue-003 dark:text-white"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile: Show Saved — own row, flush right (reference UI) */}
        <div className="mb-3 flex min-w-0 justify-end lg:hidden">
          <button
            type="button"
            onClick={() => setShowSaved(!showSaved)}
            aria-pressed={showSaved}
            aria-label={showSaved ? "Showing saved only" : "Show saved showcases only"}
            className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold shadow-sm transition-colors ${
              showSaved
                ? "border-red-600 bg-red-600 text-white dark:border-red-500 dark:bg-red-500"
                : "border-gray-300 bg-gray-100 text-darkBlue-003 hover:bg-gray-200 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            }`}
          >
            <Bookmark className={`h-4 w-4 shrink-0 ${showSaved ? "fill-white text-white" : "text-darkBlue-003 dark:text-white"}`} />
            <span>Show Saved</span>
          </button>
        </div>

        {/* Mobile: RATING + SORT BY — custom menus (open panel + active border match reference) */}
        <div ref={mobileExploreFiltersRef} className="mb-4 grid min-w-0 grid-cols-2 gap-2.5 lg:hidden">
          <MobileFilterDropdown
            label="Rating"
            value={ratingCodeToLabel(appliedClientFilters.rating)}
            options={ratingOptions}
            onChange={(next) =>
              setAppliedClientFilters((f: ClientExploreFilters) => ({
                ...f,
                rating: ratingLabelToCode(next),
              }))
            }
            ariaLabel="Filter by rating"
            isOpen={mobileRatingOpen}
            zOnOpen={mobileRatingOpen}
            onOpenChange={(open) => {
              setMobileRatingOpen(open);
              if (open) setMobileSortOpen(false);
            }}
          />
          <MobileFilterDropdown
            label="Sort By"
            value={selectedSort}
            options={sortOptions}
            onChange={setSelectedSort}
            ariaLabel="Sort results"
            isOpen={mobileSortOpen}
            zOnOpen={mobileSortOpen}
            onOpenChange={(open) => {
              setMobileSortOpen(open);
              if (open) setMobileRatingOpen(false);
            }}
          />
        </div>

        {/* Desktop: categories + Show Saved */}
        <div className="mb-6 hidden items-center justify-between gap-4 lg:flex">
          <div className="category-scroll flex flex-1 items-center gap-6 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                className={`whitespace-nowrap pb-1 text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? "border-b-2 border-red-500 text-red-500"
                    : "text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowSaved(!showSaved)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              showSaved
                ? "bg-red-600 text-white dark:bg-red-500"
                : "border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:border-blue-500/30 dark:bg-blue-500/20 dark:text-white dark:hover:bg-blue-500/30"
            }`}
          >
            <Bookmark className={`h-4 w-4 ${showSaved ? "fill-white" : ""}`} />
            Show Saved
          </button>
        </div>

        {/* Desktop: filter + dropdowns */}
        <div className="mb-6 hidden flex-wrap items-center gap-3 lg:flex">
          <button
            type="button"
            onClick={openFilterSheet}
            className="relative flex-shrink-0 rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-blue-500/20"
            aria-label="Open filters"
          >
            <SlidersHorizontal className="h-5 w-5 text-gray-700 dark:text-white" />
            {getActiveFiltersCount() > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                {getActiveFiltersCount()}
              </span>
            )}
          </button>

          <div className="relative">
            <select
              value={ratingCodeToLabel(appliedClientFilters.rating)}
              onChange={(e) =>
                setAppliedClientFilters((f: ClientExploreFilters) => ({
                  ...f,
                  rating: ratingLabelToCode(e.target.value),
                }))
              }
              className="cursor-pointer appearance-none rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 pr-8 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-blue-500/30 dark:bg-blue-500/20 dark:text-white"
            >
              {ratingOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-white" />
          </div>

          <div className="relative">
            <select
              value={selectedSort}
              onChange={(e) => setSelectedSort(e.target.value)}
              className="cursor-pointer appearance-none rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 pr-8 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-blue-500/30 dark:bg-blue-500/20 dark:text-white"
            >
              {sortOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-white" />
          </div>

          <div className="relative">
            <select
              value={appliedClientFilters.postingType}
              onChange={(e) => setAppliedClientFilters((f: ClientExploreFilters) => ({ ...f, postingType: e.target.value }))}
              className="cursor-pointer appearance-none rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 pr-8 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-blue-500/30 dark:bg-blue-500/20 dark:text-white"
            >
              {postingTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-white" />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-center py-12 text-red-500 dark:text-red-400">
            <p className="text-lg">{error}</p>
          </div>
        )}

        {/* Showcases Grid */}
        {loading ? (
          <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="aspect-[3/4] min-w-0 animate-pulse rounded-2xl bg-gray-100 dark:bg-[#003D62]"
              />
            ))}
          </div>
        ) : filteredAndSortedShowcases.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-white">
            <p className="text-lg">No showcase items found. Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
            {filteredAndSortedShowcases.map((item) => {
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
        )}
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
