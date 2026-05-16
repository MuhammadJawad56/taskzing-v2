"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, MapPin, X, Plus } from "lucide-react";
import { useAuth } from "@/lib/api/AuthContext";
import {
  getUserData,
  updateUserProfile,
  isOnboardingFlowCompleteForNav,
  type UserData,
} from "@/lib/api/auth";
import { SKILL_SUGGESTIONS } from "@/lib/constants/skillsCatalog";

export default function InitialProfilePage() {
  const router = useRouter();
  const { user, userData, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [isUsernameReadOnly, setIsUsernameReadOnly] = useState(false);
  const [isRoleReadOnly, setIsRoleReadOnly] = useState(false);
  const [isLocationReadOnly, setIsLocationReadOnly] = useState(false);
  const [signUpAs, setSignUpAs] = useState<"client" | "provider">("client");
  const [location, setLocation] = useState("");
  const [aboutYou, setAboutYou] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [showSkillSuggestions, setShowSkillSuggestions] = useState(false);
  const skillsDropdownRef = useRef<HTMLDivElement>(null);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);
  const [showLegalConfirmModal, setShowLegalConfirmModal] = useState(false);
  const [pendingProfileData, setPendingProfileData] = useState<
    (Partial<UserData> & { username: string; profileCompleted: boolean }) | null
  >(null);
  const MIN_WORDS = 50; // Minimum word count for About You
  const MAX_WORDS = 1500; // Maximum word count for About You

  // Helper function to count words (counts each character including spaces as a word)
  const countWords = React.useCallback((text: string): number => {
    if (!text || typeof text !== 'string') return 0;
    
    // Count every character (including spaces, letters, numbers, punctuation) as a word
    return text.length;
  }, []);

  // Memoize word count to avoid recalculating on every render
  const wordCount = React.useMemo(() => countWords(aboutYou), [aboutYou, countWords]);
  const filteredSkillSuggestions = useMemo(() => {
    const query = skillInput.trim().toLowerCase();
    if (!query) {
      return SKILL_SUGGESTIONS.slice(0, 150);
    }

    return SKILL_SUGGESTIONS.filter((skill) => !skills.includes(skill))
      .filter((skill) => skill.toLowerCase().includes(query))
      .sort((a, b) => {
        const aStarts = a.toLowerCase().startsWith(query) ? 0 : 1;
        const bStarts = b.toLowerCase().startsWith(query) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return a.localeCompare(b);
      })
      .slice(0, 200);
  }, [skillInput, skills]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        skillsDropdownRef.current &&
        !skillsDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSkillSuggestions(false);
      }
      if (
        roleDropdownRef.current &&
        !roleDropdownRef.current.contains(event.target as Node)
      ) {
        setShowRoleDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Check if user signed up with Google/Apple
  useEffect(() => {
    if (user) {
      setUsername(user.email?.split("@")[0] || "");
      setFullName(user.displayName || "");

      // Load existing user data
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;

    try {
      const data = await getUserData(user.uid);
      if (data) {
        if (data.fullName) setFullName(data.fullName);
        if ((data as UserData & { username?: string }).username) {
          setUsername((data as UserData & { username?: string }).username || "");
          setIsUsernameReadOnly(true);
        }
        if (data.location) setLocation(data.location);
        if (data.bio || data.about) setAboutYou(data.bio || data.about || "");
        if (data.skills && Array.isArray(data.skills)) setSkills(data.skills);
        if (data.role === "provider" || data.role === "client+provider" || data.role === "both") {
          setSignUpAs("provider");
        }
        // Keep role editable while user is still completing initial profile.
        // Lock only after profile has already been completed.
        setIsRoleReadOnly(Boolean(data.role && data.profileCompleted));
        setIsLocationReadOnly(Boolean(data.location?.trim()));
        if (!data.profileCompleted && !isOnboardingFlowCompleteForNav(data)) {
          router.replace("/initial-profile-steps");
          return;
        }
      }
    } catch (err) {
      console.error("Error loading user data:", err);
    }
  };

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput("");
      setShowSkillSuggestions(false);
    }
  };

  const addSuggestedSkill = (skill: string) => {
    if (!skills.includes(skill)) {
      setSkills([...skills, skill]);
      setSkillInput("");
      setShowSkillSuggestions(false);
    }
  };

  const removeSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const resolveAddressFromCoordinates = async (
    latitude: number,
    longitude: number
  ): Promise<string | null> => {
    const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    // First try Google geocoding when API key is configured.
    if (googleKey) {
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${googleKey}`
        );
        const data = await response.json();
        if (data?.results?.length > 0) {
          return data.results[0].formatted_address as string;
        }
      } catch {
        // Try fallback provider below.
      }
    }

    // Fallback: OpenStreetMap reverse geocoding (no API key required).
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
      );
      const data = await response.json();
      if (data?.display_name) {
        return data.display_name as string;
      }
    } catch {
      // Ignore and return null.
    }

    return null;
  };

  const handleLocationClick = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const resolvedAddress = await resolveAddressFromCoordinates(latitude, longitude);
          if (resolvedAddress) {
            setLocation(resolvedAddress);
            return;
          }
          setLocation(`${latitude}, ${longitude}`);
        },
        (error) => {
          console.error("Geolocation error:", error);
          alert("Unable to get your location. Please enter it manually.");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  const buildProfileUpdateData = () => {
    setError("");

    // Validation
    const normalizedUsername = username.trim().toLowerCase();
    if (!normalizedUsername) {
      setError("Username is required");
      return null;
    }
    if (normalizedUsername.length < 3 || normalizedUsername.length > 20) {
      setError("Username must be between 3 and 20 characters");
      return null;
    }
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(normalizedUsername)) {
      setError("Only letters, numbers, and _ are allowed, and it must start with a letter.");
      return null;
    }

    if (!location.trim()) {
      setError("Location is required");
      return null;
    }

    if (!aboutYou.trim()) {
      setError("About You is required");
      return null;
    }

    const currentWordCount = countWords(aboutYou);
    if (currentWordCount < MIN_WORDS) {
      setError(`About You must have at least ${MIN_WORDS} words. You have ${currentWordCount} ${currentWordCount === 1 ? 'word' : 'words'}.`);
      return null;
    }

    if (currentWordCount > MAX_WORDS) {
      setError(`About You must not exceed ${MAX_WORDS} words. You have ${currentWordCount} words.`);
      return null;
    }

    const effectiveName = fullName.trim() || user?.displayName || "";
    if (!effectiveName.trim()) {
      setError("Full name is required");
      return null;
    }
    if (effectiveName.trim().length < 2 || !/[a-zA-Z]/.test(effectiveName.trim())) {
      setError("Full name must be at least 2 characters and contain at least one letter.");
      return null;
    }
    if (signUpAs === "provider" && skills.length === 0) {
      setError("Please add at least one skill for Client + Provider.");
      return null;
    }

    if (!user) {
      setError("Please sign in to continue");
      return null;
    }

    const updateData: Partial<UserData> & {
      username: string;
      profileCompleted: boolean;
    } = {
      fullName: effectiveName.trim(),
      username: normalizedUsername,
      location: location.trim(),
      bio: aboutYou.trim(),
      about: aboutYou.trim(),
      skills: signUpAs === "provider" ? skills : [],
      role: signUpAs,
      currentRole: signUpAs,
      profileCompleted: true,
      providerProfileCompleted: signUpAs === "provider",
    };
    return updateData;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updateData = buildProfileUpdateData();
    if (!updateData) return;
    setPendingProfileData(updateData);
    setShowLegalConfirmModal(true);
  };

  const handleConfirmAndContinue = async () => {
    if (!user) {
      setError("Please sign in to continue");
      setShowLegalConfirmModal(false);
      return;
    }
    if (!pendingProfileData) return;

    setIsLoading(true);
    try {
      await updateUserProfile(user.uid, pendingProfileData);
      // Redirect based on role
      if (signUpAs === "provider") {
        // Redirect to provider dashboard for Client + Provider
        router.push("/provider-dashboard");
      } else {
        // Redirect to client home page for Client only
        router.push("/client-home");
      }
    } catch (err: any) {
      console.error("Error saving profile:", err);
      const message = String(err?.message || "");
      setError(message || "Failed to save profile. Please try again.");
    } finally {
      setIsLoading(false);
      setShowLegalConfirmModal(false);
      setPendingProfileData(null);
    }
  };

  if (authLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#FFE5E5" }}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F21A1A]"></div>
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  // First word of the user's name to display in the red "Hey {name}" highlight,
  // mirroring the Flutter `currentUserFullName` slot.
  const heyName = (fullName || user.displayName || "").trim().split(/\s+/)[0] || "";

  return (
    <div
      className="min-h-screen flex flex-col bg-[#FFE5E5] dark:bg-[#013453]"
    >
      {/* Header bar with logo, rounded bottom corners + shadow (Flutter parity) */}
      <header
        className="bg-white dark:bg-[#013453] relative"
        style={{
          borderBottomLeftRadius: 20,
          borderBottomRightRadius: 20,
          boxShadow: "0 3px 6px rgba(0,0,0,0.2)",
        }}
      >
        <div className="flex h-[80px] items-center justify-center px-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700 dark:text-white" />
          </button>
          <Link href="/" className="inline-flex items-center" aria-label="TaskZing home">
            <Image
              src="/images/logos/Taskzing-Logo-light-mode_1.png"
              alt="TaskZing"
              width={300}
              height={78}
              className="h-[26px] w-auto sm:h-[34px] md:h-[42px] dark:hidden"
              priority
            />
            <Image
              src="/images/logos/Taskzing-Logo-dark-mode_1.png"
              alt="TaskZing"
              width={300}
              height={78}
              className="hidden h-[26px] w-auto sm:h-[34px] md:h-[42px] dark:block"
              priority
            />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="mx-auto w-full max-w-2xl rounded-[18px] bg-white p-6 sm:p-8 dark:bg-[#003d62]">
          {/* Heading */}
          <div className="text-center">
            <h1 className="text-[26px] sm:text-[30px] font-semibold text-gray-900 dark:text-white leading-tight">
              Hey{" "}
              {heyName ? (
                <span className="text-[#F21A1A]">{heyName}</span>
              ) : null}{" "}
              we are almost done
            </h1>
            <p className="mt-2 text-base sm:text-[17px] text-gray-700 dark:text-gray-200">
              Fill up the information below to create your profile
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div
              className="mt-6 p-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 dark:bg-red-900/30 dark:border-red-800/60 dark:text-red-200"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {/* Full Name (only when missing — same as Flutter `needsFullName`) */}
            {!fullName.trim() && (
              <div>
                <label className="block mb-2 text-base font-semibold text-gray-900 dark:text-white">
                  Full Name (required)
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="We couldn't get your name. Please enter it to complete your profile."
                  className="w-full rounded-2xl border-0 bg-gray-100 px-4 py-3 text-base text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#F21A1A]/40 dark:bg-[#1a3550] dark:text-white dark:placeholder:text-gray-400"
                />
              </div>
            )}

            {/* Username */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <label className="text-base font-semibold text-gray-900 dark:text-white">
                  Username
                </label>
                {isUsernameReadOnly && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full dark:bg-white/10 dark:text-gray-200">
                    Read Only
                  </span>
                )}
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => !isUsernameReadOnly && setUsername(e.target.value)}
                placeholder="Username"
                disabled={isUsernameReadOnly}
                required
                className={`w-full rounded-2xl border-0 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#F21A1A]/40 ${
                  isUsernameReadOnly
                    ? "bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-white/5 dark:text-gray-400"
                    : "bg-gray-100 text-gray-900 placeholder:text-gray-500 dark:bg-[#1a3550] dark:text-white dark:placeholder:text-gray-400"
                }`}
              />
            </div>

            {/* Sign Up as */}
            <div>
              <label className="mb-2 block text-base font-semibold text-gray-900 dark:text-white">
                Sign Up as
              </label>
              <div className="relative" ref={roleDropdownRef}>
                <button
                  type="button"
                  onClick={() =>
                    !isRoleReadOnly && setShowRoleDropdown((prev) => !prev)
                  }
                  disabled={isRoleReadOnly}
                  aria-haspopup="listbox"
                  aria-expanded={showRoleDropdown}
                  className={`flex w-full items-center justify-between rounded-2xl border-0 bg-gray-100 px-4 py-3 text-left text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#F21A1A]/40 dark:bg-[#1a3550] dark:text-white ${
                    isRoleReadOnly
                      ? "cursor-not-allowed opacity-70"
                      : "cursor-pointer"
                  }`}
                >
                  <span>
                    {signUpAs === "provider" ? "Client + Provider" : "Client"}
                  </span>
                  <svg
                    className={`h-5 w-5 text-gray-500 transition-transform dark:text-gray-300 ${
                      showRoleDropdown ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {showRoleDropdown && !isRoleReadOnly && (
                  <ul
                    role="listbox"
                    className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-gray-200 dark:bg-[#013453] dark:ring-white/10"
                  >
                    {(
                      [
                        { value: "client", label: "Client" },
                        { value: "provider", label: "Client + Provider" },
                      ] as const
                    ).map((option) => {
                      const isSelected = signUpAs === option.value;
                      return (
                        <li key={option.value} role="option" aria-selected={isSelected}>
                          <button
                            type="button"
                            onClick={() => {
                              setSignUpAs(option.value);
                              setShowRoleDropdown(false);
                            }}
                            className={`w-full px-4 py-3 text-left text-base transition-colors ${
                              isSelected
                                ? "bg-[#F21A1A]/10 font-semibold text-[#F21A1A] dark:bg-[#F21A1A]/20"
                                : "text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-white/5"
                            }`}
                          >
                            {option.label}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="mb-2 block text-base font-semibold text-gray-900 dark:text-white">
                Location
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => !isLocationReadOnly && setLocation(e.target.value)}
                  placeholder="Address e.g ABC324 State Canada"
                  required
                  readOnly={isLocationReadOnly}
                  className={`w-full rounded-2xl border-0 bg-gray-100 px-4 py-3 pr-24 text-base text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#F21A1A]/40 dark:bg-[#1a3550] dark:text-white dark:placeholder:text-gray-400 ${
                    isLocationReadOnly ? "cursor-not-allowed opacity-70" : ""
                  }`}
                />
                <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2">
                  {location && !isLocationReadOnly && (
                    <button
                      type="button"
                      onClick={() => setLocation("")}
                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10"
                      aria-label="Clear location"
                    >
                      <X className="h-4 w-4 text-gray-500 dark:text-gray-300" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleLocationClick}
                    disabled={isLocationReadOnly}
                    className="rounded-xl bg-[#F21A1A] p-2 text-white transition-colors hover:bg-[#d91515] disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label="Use current location"
                  >
                    <MapPin className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Your Skills - Only visible for Client + Provider */}
            {signUpAs === "provider" && (
              <div>
                <label className="mb-2 block text-base font-semibold text-gray-900 dark:text-white">
                  Your Skills
                </label>
                <p className="mb-2 text-xs text-gray-600 dark:text-gray-300">
                  Type to search from 1000+ household and engineering skills.
                </p>
                <div className="relative mb-2" ref={skillsDropdownRef}>
                  <div className="flex gap-2 rounded-2xl dark:border dark:border-white dark:p-1">
                    <input
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onFocus={() => setShowSkillSuggestions(true)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSkill();
                        }
                      }}
                      placeholder="Enter a skill (e.g. Developer)"
                      className="flex-1 rounded-2xl border-0 bg-gray-100 px-4 py-3 text-base text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#F21A1A]/40 dark:bg-[#1a3550] dark:text-white dark:placeholder:text-gray-400"
                    />
                    <button
                      type="button"
                      onClick={addSkill}
                      className="flex items-center justify-center rounded-2xl bg-gray-900 px-4 py-3 text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                      aria-label="Add skill"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                  {showSkillSuggestions && (
                    <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-gray-200 dark:bg-[#013453] dark:ring-white/10">
                      <div className="border-b border-gray-100 px-3 py-2 text-xs text-gray-500 dark:border-white/10 dark:text-gray-300">
                        Showing {filteredSkillSuggestions.length} matches from{" "}
                        {SKILL_SUGGESTIONS.length}+ skills
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {filteredSkillSuggestions.length > 0 ? (
                          filteredSkillSuggestions.map((suggestedSkill) => (
                            <button
                              key={suggestedSkill}
                              type="button"
                              onClick={() => addSuggestedSkill(suggestedSkill)}
                              className="w-full border-b border-gray-50 px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50 last:border-b-0 dark:border-white/5 dark:text-gray-100 dark:hover:bg-white/5"
                            >
                              {suggestedSkill}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-3 text-sm text-gray-500 dark:text-gray-300">
                            No matching skills found. You can still add a custom skill.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-800 dark:bg-white/10 dark:text-white"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(index)}
                          className="hover:text-[#F21A1A]"
                          aria-label={`Remove ${skill}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* About You */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-base font-semibold text-gray-900 dark:text-white">
                  About You
                </label>
                <span
                  className={`text-xs ${
                    wordCount < MIN_WORDS || wordCount > MAX_WORDS
                      ? "text-red-600 dark:text-red-300"
                      : "text-gray-500 dark:text-gray-300"
                  }`}
                >
                  {wordCount}/{MAX_WORDS}
                  {wordCount < MIN_WORDS && ` (min: ${MIN_WORDS})`}
                </span>
              </div>
              <textarea
                value={aboutYou}
                onChange={(e) => {
                  const newValue = e.target.value;
                  const newWordCount = countWords(newValue);
                  if (
                    newWordCount <= MAX_WORDS ||
                    newValue.length < aboutYou.length
                  ) {
                    setAboutYou(newValue);
                  }
                }}
                placeholder="Tell us about yourself… (Minimum 50 characters required)"
                required
                rows={5}
                className={`w-full resize-none rounded-2xl border-0 bg-gray-100 px-4 py-3 text-base text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 dark:bg-[#1a3550] dark:text-white dark:placeholder:text-gray-400 ${
                  wordCount < MIN_WORDS || wordCount > MAX_WORDS
                    ? "ring-2 ring-white focus:ring-white"
                    : "focus:ring-[#F21A1A]/40"
                }`}
              />
              {wordCount < MIN_WORDS && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-300">
                  Minimum {MIN_WORDS} characters required. You have {wordCount}.
                </p>
              )}
              {wordCount > MAX_WORDS && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-300">
                  Maximum {MAX_WORDS} characters allowed. You have {wordCount}.
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex justify-center">
              <button
                type="submit"
                disabled={isLoading}
                className="flex h-12 w-full max-w-[260px] items-center justify-center gap-2 rounded-2xl bg-[#F21A1A] text-base font-semibold text-white transition-colors hover:bg-[#d91515] disabled:cursor-not-allowed disabled:opacity-50 sm:h-14 sm:text-lg"
              >
                {isLoading ? (
                  <>
                    <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Saving…
                  </>
                ) : (
                  "Complete Profile"
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      {showLegalConfirmModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-[560px] rounded-[20px] bg-white p-6 shadow-2xl dark:bg-[#0a3f5f]">
            <h2 className="text-[28px] font-semibold leading-tight text-gray-900 dark:text-white">
              Confirm Legal Information
            </h2>
            <p className="mt-5 text-base leading-relaxed text-gray-800 dark:text-gray-100 sm:text-lg">
              I confirm that all information I have provided is true, legal, and
              accurate. I understand that providing incorrect or false information
              may result in account restriction.
            </p>

            <div className="mt-8 flex items-center justify-end gap-6">
              <button
                type="button"
                onClick={() => setShowLegalConfirmModal(false)}
                className="text-base font-medium text-gray-800 hover:underline dark:text-gray-100 sm:text-lg"
              >
                Review &amp; Edit
              </button>
              <button
                type="button"
                onClick={handleConfirmAndContinue}
                disabled={isLoading}
                className="min-w-[230px] rounded-2xl bg-[#F21A1A] px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-[#d91515] disabled:cursor-not-allowed disabled:opacity-60 sm:text-lg"
              >
                {isLoading ? "Saving..." : "Confirm & Continue"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


