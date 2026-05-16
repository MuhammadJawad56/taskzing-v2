"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Send,
  Sparkles,
  Menu,
  MapPin,
  ChevronRight,
  Filter,
  X,
  Plus,
  ChevronDown,
  Check,
  Image as ImageIcon,
} from "lucide-react";
import { Task } from "@/lib/types/task";
import { getOpenJobs, searchJobs, getJobsNearLocation, getJobsByCategory } from "@/lib/api/jobs";
import { useAuth } from "@/lib/api/AuthContext";
import { cn } from "@/lib/utils/cn";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { JobProposalApplyModal } from "@/components/task/JobProposalApplyModal";
import { ExploreJobCard } from "@/components/task/ExploreJobCard";
import { ExploreHeroSection } from "@/components/explore/ExploreHeroSection";
import { getUserLikedJobIds, likeJob, unlikeJob } from "@/lib/api/likes";

// Project types
const projectTypes = ["All", "Fixed Price", "Hourly Rate"];

// Poster types
const posterTypes = ["All", "Individual", "Company", "In Store"];

// Day posted options
const dayPostedOptions = ["Any time", "Last 24 hours", "Last 7 days", "Last 30 days"];

// Price ranges
const priceRanges = ["Any", "$0 - $50", "$50 - $100", "$100 - $500", "$500+"];

// Urgency levels
const urgencyLevels = ["Any", "Urgent", "High", "Normal", "Low"];

// Job status
const jobStatuses = ["All", "Open", "In Progress"];

export default function ExplorePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Task[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isSearching, setIsSearching] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  // Filter sidebar state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterLocation, setFilterLocation] = useState("");
  const [filterArea, setFilterArea] = useState("");
  const [filterProjectType, setFilterProjectType] = useState("All");
  const [filterPosterType, setFilterPosterType] = useState("All");
  const [filterDayPosted, setFilterDayPosted] = useState("Any time");
  const [filterPriceRange, setFilterPriceRange] = useState("Any");
  const [filterUrgency, setFilterUrgency] = useState("Any");
  const [filterSubCategory, setFilterSubCategory] = useState("All");
  const [filterJobStatus, setFilterJobStatus] = useState("All");

  // Expanded filter sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [selectedJobForProposal, setSelectedJobForProposal] = useState<Task | null>(null);
  const [likedJobIds, setLikedJobIds] = useState<Set<string>>(new Set());
  const [likingJobId, setLikingJobId] = useState<string | null>(null);

  const mainCategories = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach((j) => {
      if (j.category) set.add(j.category);
    });
    return ["All", ...Array.from(set).sort()];
  }, [jobs]);

  const allSubCategories = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach((j) => {
      if (j.subCategory) set.add(j.subCategory);
    });
    return Array.from(set).sort();
  }, [jobs]);

  // Active filters count
  const getActiveFiltersCount = () => {
    let count = 0;
    if (filterLocation) count++;
    if (filterArea) count++;
    if (filterProjectType !== "All") count++;
    if (filterPosterType !== "All") count++;
    if (filterDayPosted !== "Any time") count++;
    if (filterPriceRange !== "Any") count++;
    if (filterUrgency !== "Any") count++;
    if (filterSubCategory !== "All") count++;
    if (filterJobStatus !== "All") count++;
    return count;
  };

  // Load jobs from API
  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) {
      setLikedJobIds(new Set());
      return;
    }
    let alive = true;
    void getUserLikedJobIds(uid).then((ids) => {
      if (!alive) return;
      setLikedJobIds(new Set(ids));
    });
    return () => {
      alive = false;
    };
  }, [user?.uid]);

  // Filter jobs when category changes
  useEffect(() => {
    if (selectedCategory === "All") {
      setFilteredJobs(jobs);
    } else {
      const filtered = jobs.filter(job => 
        job.category === selectedCategory || 
        job.subCategory === selectedCategory
      );
      setFilteredJobs(filtered);
    }
  }, [selectedCategory, jobs]);

  const loadJobs = async () => {
    try {
      setIsLoading(true);
      const openJobs = await getOpenJobs();
      setJobs(openJobs);
      setFilteredJobs(openJobs);
    } catch (error) {
      console.error("Error loading jobs:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to load jobs. Check your connection and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setFilteredJobs(jobs);
      return;
    }
    setIsSearching(true);
    const results = await searchJobs(searchQuery);
    setFilteredJobs(results);
    setIsSearching(false);
  };

  const handleNearMe = async () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsFetchingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const nearbyJobs = await getJobsNearLocation(latitude, longitude, 10);
          setFilteredJobs(nearbyJobs);
          setIsFetchingLocation(false);
        } catch (error) {
          console.error("Error getting nearby jobs:", error);
          alert("Failed to get nearby jobs. Please try again.");
          setIsFetchingLocation(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Please allow location access to find jobs near you.");
        setIsFetchingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const applyFilters = () => {
    let filtered = [...jobs];

    // Filter by main category
    if (selectedCategory !== "All") {
      filtered = filtered.filter((job) =>
        job.category === selectedCategory || job.subCategory === selectedCategory
      );
    }

    // Filter by sub-category
    if (filterSubCategory !== "All") {
      filtered = filtered.filter((job) => job.subCategory === filterSubCategory);
    }

    // Filter by project type
    if (filterProjectType !== "All") {
      filtered = filtered.filter((job) => {
        if (filterProjectType === "Fixed Price") return job.jobType === "fixed";
        if (filterProjectType === "Hourly Rate") return job.jobType === "hourly";
        return true;
      });
    }

    // Filter by poster type
    if (filterPosterType !== "All") {
      filtered = filtered.filter((job) => {
        const posterMap: Record<string, string> = {
          "Individual": "individual",
          "Company": "company",
          "In Store": "instore",
        };
        return job.posterType === posterMap[filterPosterType];
      });
    }

    // Filter by day posted
    if (filterDayPosted !== "Any time") {
      const now = new Date();
      filtered = filtered.filter((job) => {
        const jobDate = new Date(job.createdAt);
        const diffHours = (now.getTime() - jobDate.getTime()) / (1000 * 60 * 60);
        if (filterDayPosted === "Last 24 hours") return diffHours <= 24;
        if (filterDayPosted === "Last 7 days") return diffHours <= 168;
        if (filterDayPosted === "Last 30 days") return diffHours <= 720;
        return true;
      });
    }

    // Filter by price range
    if (filterPriceRange !== "Any") {
      filtered = filtered.filter((job) => {
        const price = job.fixedPrice || job.hourlyRate || job.price || 0;
        if (filterPriceRange === "$0 - $50") return price >= 0 && price <= 50;
        if (filterPriceRange === "$50 - $100") return price > 50 && price <= 100;
        if (filterPriceRange === "$100 - $500") return price > 100 && price <= 500;
        if (filterPriceRange === "$500+") return price > 500;
        return true;
      });
    }

    // Filter by urgency
    if (filterUrgency !== "Any") {
      filtered = filtered.filter((job) => {
        const urgencyMap: Record<string, string> = {
          "Urgent": "urgent",
          "High": "high",
          "Normal": "normal",
          "Low": "low",
        };
        return job.urgency === urgencyMap[filterUrgency];
      });
    }

    // Filter by job status
    if (filterJobStatus !== "All") {
      filtered = filtered.filter((job) => {
        if (filterJobStatus === "Open") return job.completionStatus === "open";
        if (filterJobStatus === "In Progress") return job.completionStatus === "in_progress";
        return true;
      });
    }

    // Filter by location (if entered)
    if (filterLocation.trim()) {
      const locationLower = filterLocation.toLowerCase();
      filtered = filtered.filter((job) =>
        job.address?.toLowerCase().includes(locationLower)
      );
    }

    // Filter by area (if entered)
    if (filterArea.trim()) {
      const areaLower = filterArea.toLowerCase();
      filtered = filtered.filter((job) =>
        job.address?.toLowerCase().includes(areaLower)
      );
    }

    setFilteredJobs(filtered);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setFilterLocation("");
    setFilterArea("");
    setFilterProjectType("All");
    setFilterPosterType("All");
    setFilterDayPosted("Any time");
    setFilterPriceRange("Any");
    setFilterUrgency("Any");
    setFilterSubCategory("All");
    setFilterJobStatus("All");
    setSelectedCategory("All");
    setFilteredJobs(jobs);
  };

  // Proposal modal functions
  const openProposalModal = (job: Task) => {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent("/explore")}`);
      return;
    }
    setSelectedJobForProposal(job);
    setIsProposalModalOpen(true);
  };

  const closeProposalModal = () => {
    setIsProposalModalOpen(false);
    setSelectedJobForProposal(null);
  };

  const adjustJobLikesInLists = useCallback((jobId: string, delta: number) => {
    const bump = (current: number | undefined) => Math.max(0, Number(current ?? 0) + delta);
    setJobs((prev) =>
      prev.map((item) =>
        item.jobId === jobId ? { ...item, likesCount: bump(item.likesCount) } : item,
      ),
    );
    setFilteredJobs((prev) =>
      prev.map((item) =>
        item.jobId === jobId ? { ...item, likesCount: bump(item.likesCount) } : item,
      ),
    );
  }, []);

  const handleLikeToggle = async (job: Task) => {
    if (!user) {
      alert("Please sign in to like jobs.");
      return;
    }
    const id = job.jobId;
    const wasLiked = likedJobIds.has(id);
    setLikedJobIds((prev) => {
      const next = new Set(prev);
      if (wasLiked) next.delete(id);
      else next.add(id);
      return next;
    });
    adjustJobLikesInLists(id, wasLiked ? -1 : 1);
    setLikingJobId(id);
    try {
      if (wasLiked) await unlikeJob(user.uid, id);
      else await likeJob(user.uid, id, job.clientId);
    } catch (error) {
      console.error("Error toggling job like:", error);
      adjustJobLikesInLists(id, wasLiked ? 1 : -1);
      setLikedJobIds((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.add(id);
        else next.delete(id);
        return next;
      });
    } finally {
      setLikingJobId(null);
    }
  };

  // Filter option component
  const FilterOption = ({
    label,
    isExpanded,
    onToggle,
    children,
  }: {
    label: string;
    isExpanded: boolean;
    onToggle: () => void;
    children?: React.ReactNode;
  }) => (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-darkBlue-003 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-gray-500" />
        ) : (
          <Plus className="h-5 w-5 text-gray-500" />
        )}
      </button>
      {isExpanded && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-darkBlue-013 border-t border-gray-200 dark:border-gray-700">
          {children}
        </div>
      )}
    </div>
  );

  // Radio option component
  const RadioOption = ({
    label,
    selected,
    onSelect,
  }: {
    label: string;
    selected: boolean;
    onSelect: () => void;
  }) => (
    <button
      onClick={onSelect}
      className={cn(
        "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors",
        selected
          ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
          : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
      )}
    >
      <div
        className={cn(
          "w-4 h-4 rounded-full border-2 flex items-center justify-center",
          selected ? "border-red-500 bg-red-500" : "border-gray-300 dark:border-gray-600"
        )}
      >
        {selected && <Check className="h-2.5 w-2.5 text-white" />}
      </div>
      {label}
    </button>
  );

  return (
    <DashboardLayout>
      {/* Filter Sidebar Overlay */}
      {isFilterOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[100]"
          onClick={() => setIsFilterOpen(false)}
        />
      )}

      <JobProposalApplyModal
        job={selectedJobForProposal}
        open={isProposalModalOpen}
        onClose={closeProposalModal}
        loginRedirectPath="/explore"
      />

      {/* Filter Sidebar */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-full sm:w-96 bg-white dark:bg-darkBlue-003 z-[101] transform transition-transform duration-300 ease-in-out flex flex-col",
          isFilterOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Filter Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Filter your Choice</h2>
          <button
            onClick={() => setIsFilterOpen(false)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Filter Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {/* Location */}
          <FilterOption
            label="Location"
            isExpanded={expandedSections.location}
            onToggle={() => toggleSection("location")}
          >
            <input
              type="text"
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              placeholder="Enter city or address"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-darkBlue-003 dark:text-white text-sm"
            />
          </FilterOption>

          {/* Area */}
          <FilterOption
            label="Area"
            isExpanded={expandedSections.area}
            onToggle={() => toggleSection("area")}
          >
            <input
              type="text"
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
              placeholder="Enter area or neighborhood"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-darkBlue-003 dark:text-white text-sm"
            />
          </FilterOption>

          {/* Project Type */}
          <FilterOption
            label="Project Type"
            isExpanded={expandedSections.projectType}
            onToggle={() => toggleSection("projectType")}
          >
            <div className="space-y-1">
              {projectTypes.map((type) => (
                <RadioOption
                  key={type}
                  label={type}
                  selected={filterProjectType === type}
                  onSelect={() => setFilterProjectType(type)}
                />
              ))}
            </div>
          </FilterOption>

          {/* Poster Type */}
          <FilterOption
            label="Poster Type"
            isExpanded={expandedSections.posterType}
            onToggle={() => toggleSection("posterType")}
          >
            <div className="space-y-1">
              {posterTypes.map((type) => (
                <RadioOption
                  key={type}
                  label={type}
                  selected={filterPosterType === type}
                  onSelect={() => setFilterPosterType(type)}
                />
              ))}
            </div>
          </FilterOption>

          {/* Sub-Category */}
          <FilterOption
            label="Sub-Category"
            isExpanded={expandedSections.subCategory}
            onToggle={() => toggleSection("subCategory")}
          >
            <div className="space-y-1 max-h-48 overflow-y-auto">
              <RadioOption
                label="All"
                selected={filterSubCategory === "All"}
                onSelect={() => setFilterSubCategory("All")}
              />
              {allSubCategories.map((subCat) => (
                <RadioOption
                  key={subCat}
                  label={subCat}
                  selected={filterSubCategory === subCat}
                  onSelect={() => setFilterSubCategory(subCat)}
                />
              ))}
            </div>
          </FilterOption>

          {/* Day Posted */}
          <FilterOption
            label="Day Posted"
            isExpanded={expandedSections.dayPosted}
            onToggle={() => toggleSection("dayPosted")}
          >
            <div className="space-y-1">
              {dayPostedOptions.map((option) => (
                <RadioOption
                  key={option}
                  label={option}
                  selected={filterDayPosted === option}
                  onSelect={() => setFilterDayPosted(option)}
                />
              ))}
            </div>
          </FilterOption>

          {/* Price Range */}
          <FilterOption
            label="Price Range"
            isExpanded={expandedSections.priceRange}
            onToggle={() => toggleSection("priceRange")}
          >
            <div className="space-y-1">
              {priceRanges.map((range) => (
                <RadioOption
                  key={range}
                  label={range}
                  selected={filterPriceRange === range}
                  onSelect={() => setFilterPriceRange(range)}
                />
              ))}
            </div>
          </FilterOption>

          {/* Urgency */}
          <FilterOption
            label="Urgency"
            isExpanded={expandedSections.urgency}
            onToggle={() => toggleSection("urgency")}
          >
            <div className="space-y-1">
              {urgencyLevels.map((level) => (
                <RadioOption
                  key={level}
                  label={level}
                  selected={filterUrgency === level}
                  onSelect={() => setFilterUrgency(level)}
                />
              ))}
            </div>
          </FilterOption>

          {/* Job Status */}
          <FilterOption
            label="Job Status"
            isExpanded={expandedSections.jobStatus}
            onToggle={() => toggleSection("jobStatus")}
          >
            <div className="space-y-1">
              {jobStatuses.map((status) => (
                <RadioOption
                  key={status}
                  label={status}
                  selected={filterJobStatus === status}
                  onSelect={() => setFilterJobStatus(status)}
                />
              ))}
            </div>
          </FilterOption>
        </div>

        {/* Filter Actions */}
        <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
          <button
            onClick={clearFilters}
            className="w-full py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={applyFilters}
            className="w-full py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
          >
            Apply Filter
          </button>
        </div>
      </div>

      {/* Page Content */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 -my-8">
        <ExploreHeroSection
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onSearchSubmit={handleSearch}
          onNearMe={handleNearMe}
          isFetchingLocation={isFetchingLocation}
          isSearching={isSearching}
        />

        {/* Category Filters */}
        <div className="bg-white dark:bg-darkBlue-003 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setIsFilterOpen(true)}
              className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
            >
              <Filter className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              {getActiveFiltersCount() > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {getActiveFiltersCount()}
                </span>
              )}
            </button>
            {mainCategories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0 transition-colors",
                  selectedCategory === category
                    ? "bg-red-500 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                )}
              >
                {category}
              </button>
            ))}
            <Link
              href="/googlemap?focus=showcases"
              className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            >
              <MapPin className="h-4 w-4" />
              Map
            </Link>
          </div>
        </div>

        {/* Jobs Grid */}
        <main className="px-4 py-4 bg-gray-50 dark:bg-darkBlue-013 min-h-screen">
          {/* Results Count */}
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {filteredJobs.length} {filteredJobs.length === 1 ? "job" : "jobs"} found
              {selectedCategory !== "All" && ` in ${selectedCategory}`}
            </p>
            {getActiveFiltersCount() > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-red-500 hover:text-red-600 font-medium"
              >
                Clear filters
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 dark:text-gray-400 text-lg">No jobs found</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                Try adjusting your search or filters
              </p>
              <button
                onClick={clearFilters}
                className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredJobs.map((job) => (
                <ExploreJobCard
                  key={job.jobId}
                  job={job}
                  onApply={openProposalModal}
                  liked={likedJobIds.has(job.jobId)}
                  likesCount={job.likesCount ?? 0}
                  likePending={likingJobId === job.jobId}
                  onLike={handleLikeToggle}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </DashboardLayout>
  );
}
