"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, MapPin, Plus, X } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/lib/api/AuthContext";
import { getUserData, updateUserProfile, type UserData } from "@/lib/api/auth";
import { GhostOverlay } from "@/components/ui/GhostOverlay";
import {
  PROFILE_BIO_SUGGESTIONS,
  PROFILE_FULL_NAME_SUGGESTIONS,
  PROFILE_LOCATION_SUGGESTIONS,
  PROFILE_SKILL_SUGGESTIONS,
  PROFILE_USERNAME_SUGGESTIONS,
} from "@/lib/constants/profileFieldSuggestions";
import {
  JOB_EXTRA_WORD_SUGGESTIONS,
  JOB_EXTRA_WORD_SUGGESTIONS_FRENCH,
} from "@/lib/constants/jobFieldSuggestions";
import { acceptGhostOnTab, acceptGhostOnTouchTap } from "@/lib/utils/ghostInputHandlers";
import { findGhostSuggestion } from "@/lib/utils/ghostSuggestion";
import { useLanguage } from "@/lib/contexts/LanguageContext";
const BIO_MIN = 50;
const BIO_MAX = 1500;
const USERNAME_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
const LOCAL_FULLNAME_LOCK_KEY = "taskzing_fullname_lock_at";
const LOCAL_USERNAME_LOCK_KEY = "taskzing_username_lock_at";

function skillListsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].map((s) => s.trim()).filter(Boolean).sort();
  const sb = [...b].map((s) => s.trim()).filter(Boolean).sort();
  return sa.every((v, i) => v === sb[i]);
}

function isProviderUser(u: Pick<UserData, "role" | "currentRole">): boolean {
  const r = u.role;
  const cr = u.currentRole;
  return (
    r === "provider" ||
    r === "both" ||
    r === "client+provider" ||
    cr === "provider" ||
    cr === "both"
  );
}

export default function EditProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userData } = useAuth();
  const { language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    location: "",
    bio: "",
  });
  const [skills, setSkills] = useState<string[]>([]);
  const [skillDraft, setSkillDraft] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [lastUsernameChangeDate, setLastUsernameChangeDate] = useState<string | null>(null);
  const [lastFullNameChangeDate, setLastFullNameChangeDate] = useState<string | null>(null);
  const [localLastUsernameChangeDate, setLocalLastUsernameChangeDate] = useState<string | null>(null);
  const [localLastFullNameChangeDate, setLocalLastFullNameChangeDate] = useState<string | null>(null);
  const [pendingFullName, setPendingFullName] = useState<string | null>(null);
  const [loadedRole, setLoadedRole] = useState<UserData["role"] | undefined>(undefined);
  const [loadedCurrentRole, setLoadedCurrentRole] = useState<UserData["currentRole"] | undefined>(undefined);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState<{
    fullName: string;
    username: string;
    location: string;
    bio: string;
    skills: string[];
  } | null>(null);
  /** Replaces native `alert` — matches Flutter `AlertDialog` (primaryBackground + primaryText). */
  const [showPendingApprovalModal, setShowPendingApprovalModal] = useState(false);

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 1);
  };

  const roleForUi = useMemo(
    () => ({ role: loadedRole ?? userData?.role, currentRole: loadedCurrentRole ?? userData?.currentRole }),
    [loadedRole, loadedCurrentRole, userData?.role, userData?.currentRole]
  );

  const isProvider = isProviderUser(roleForUi);

  const ghostExtraWords = useMemo(
    () =>
      language === "french"
        ? [...JOB_EXTRA_WORD_SUGGESTIONS, ...JOB_EXTRA_WORD_SUGGESTIONS_FRENCH]
        : [...JOB_EXTRA_WORD_SUGGESTIONS],
    [language]
  );

  const fullNameGhost = useMemo(
    () =>
      findGhostSuggestion(
        formData.fullName,
        [...PROFILE_FULL_NAME_SUGGESTIONS, ...ghostExtraWords],
        "full"
      ),
    [formData.fullName, ghostExtraWords]
  );

  const usernameGhost = useMemo(
    () =>
      findGhostSuggestion(
        formData.username,
        [...PROFILE_USERNAME_SUGGESTIONS, ...ghostExtraWords],
        "full"
      ),
    [formData.username, ghostExtraWords]
  );

  const locationGhost = useMemo(
    () =>
      findGhostSuggestion(
        formData.location,
        [...PROFILE_LOCATION_SUGGESTIONS, ...ghostExtraWords],
        "full"
      ),
    [formData.location, ghostExtraWords]
  );

  const bioGhost = useMemo(
    () =>
      findGhostSuggestion(
        formData.bio,
        [...PROFILE_BIO_SUGGESTIONS, ...ghostExtraWords],
        "lastSegment"
      ),
    [formData.bio, ghostExtraWords]
  );

  const skillDraftGhost = useMemo(
    () =>
      findGhostSuggestion(
        skillDraft,
        [...PROFILE_SKILL_SUGGESTIONS, ...ghostExtraWords],
        "full"
      ),
    [skillDraft, ghostExtraWords]
  );

  const effectiveLastFullNameChangeDate = lastFullNameChangeDate || localLastFullNameChangeDate;
  const effectiveLastUsernameChangeDate = lastUsernameChangeDate || localLastUsernameChangeDate;
  const canChangeFullName = !effectiveLastFullNameChangeDate && !pendingFullName;

  const canChangeUsername = useMemo(() => {
    if (!effectiveLastUsernameChangeDate) return true;
    const last = new Date(effectiveLastUsernameChangeDate).getTime();
    if (!Number.isFinite(last)) return true;
    return Date.now() - last >= USERNAME_COOLDOWN_MS;
  }, [effectiveLastUsernameChangeDate]);

  const nextUsernameChangeDateLabel = useMemo(() => {
    if (!effectiveLastUsernameChangeDate) return null;
    const last = new Date(effectiveLastUsernameChangeDate).getTime();
    if (!Number.isFinite(last)) return null;
    const next = new Date(last + USERNAME_COOLDOWN_MS);
    const y = next.getFullYear();
    const m = String(next.getMonth() + 1).padStart(2, "0");
    const d = String(next.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [effectiveLastUsernameChangeDate]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setLocalLastFullNameChangeDate(localStorage.getItem(LOCAL_FULLNAME_LOCK_KEY));
    setLocalLastUsernameChangeDate(localStorage.getItem(LOCAL_USERNAME_LOCK_KEY));
  }, []);

  useEffect(() => {
    async function loadUserData() {
      const uid = user?.uid || userData?.uid;
      if (!uid) {
        setIsLoadingData(false);
        setSavedSnapshot({
          fullName: "",
          username: "",
          location: "",
          bio: "",
          skills: [],
        });
        return;
      }
      try {
        const profile = await getUserData(uid);
        if (profile) {
          const nextSkills = Array.isArray(profile.skills) ? profile.skills : [];
          const nextForm = {
            fullName: profile.fullName || userData?.fullName || "",
            username: profile.username || user?.email?.split("@")[0] || "",
            email: profile.email || user?.email || "",
            location: profile.location || "",
            bio: profile.description || profile.bio || "",
          };
          setFormData(nextForm);
          setSkills(nextSkills);
          setSavedSnapshot({
            fullName: nextForm.fullName.trim(),
            username: nextForm.username.trim(),
            location: nextForm.location.trim(),
            bio: nextForm.bio.trim(),
            skills: [...nextSkills],
          });
          setLoadedRole(profile.role);
          setLoadedCurrentRole(profile.currentRole);
          setLastUsernameChangeDate(profile.lastUsernameChangeDate || null);
          setLastFullNameChangeDate((profile as UserData & { lastFullNameChangeDate?: string }).lastFullNameChangeDate || null);
          setPendingFullName(profile.pendingFullName || null);
          if (profile.photoUrl || profile.profilePicture) {
            setPhotoPreview(profile.photoUrl || profile.profilePicture || null);
          }
        } else {
          const nextForm = {
            fullName: userData?.fullName || "",
            username: user?.email?.split("@")[0] || "",
            email: user?.email || "",
            location: "",
            bio: "",
          };
          setFormData(nextForm);
          setSkills([]);
          setSavedSnapshot({
            fullName: nextForm.fullName.trim(),
            username: nextForm.username.trim(),
            location: nextForm.location.trim(),
            bio: nextForm.bio.trim(),
            skills: [],
          });
        }
      } catch (e) {
        console.error("loadUserData", e);
      } finally {
        setIsLoadingData(false);
      }
    }
    loadUserData();
  }, [user, userData]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      setPhotoPreview(preview);
    }
  };

  const addSkill = () => {
    const s = skillDraft.trim();
    if (!s) return;
    if (skills.includes(s)) {
      setSkillDraft("");
      return;
    }
    setSkills((prev) => [...prev, s]);
    setSkillDraft("");
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            "User-Agent": "Taskzing-Website/1.0",
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch address");
      const data = await response.json();
      return data?.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation || isFetchingLocation) return;
    setIsFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const address = await reverseGeocode(position.coords.latitude, position.coords.longitude);
          setFormData((prev) => ({ ...prev, location: address }));
        } finally {
          setIsFetchingLocation(false);
        }
      },
      () => {
        setIsFetchingLocation(false);
        alert("Failed to get current location. Please enter it manually.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  };

  const bioLen = formData.bio.trim().length;
  const bioOk = bioLen >= BIO_MIN && bioLen <= BIO_MAX;
  const hasValidName =
    formData.fullName.trim().length >= 2 && /[a-zA-Z]/.test(formData.fullName.trim());
  const usernameTrimmed = formData.username.trim();
  const hasValidUsername =
    usernameTrimmed.length >= 3 &&
    usernameTrimmed.length <= 20 &&
    /^[a-zA-Z][a-zA-Z0-9_]*$/.test(usernameTrimmed);
  const hasBio = formData.bio.trim().length > 0;
  const skillsOk = !isProvider || skills.length > 0;

  const isDirty = useMemo(() => {
    if (!savedSnapshot) return false;
    return (
      formData.fullName.trim() !== savedSnapshot.fullName ||
      formData.username.trim() !== savedSnapshot.username ||
      formData.location.trim() !== savedSnapshot.location ||
      formData.bio.trim() !== savedSnapshot.bio ||
      !skillListsEqual(skills, savedSnapshot.skills)
    );
  }, [formData.fullName, formData.username, formData.location, formData.bio, skills, savedSnapshot]);

  const canSave =
    isDirty && bioOk && hasValidName && hasValidUsername && hasBio && skillsOk && !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) {
      alert("Please sign in to update your profile");
      return;
    }
    if (!bioOk) {
      alert(`Bio must be between ${BIO_MIN} and ${BIO_MAX} characters.`);
      return;
    }
    if (!hasValidName) {
      alert("Full name must be at least 2 characters and contain at least one letter.");
      return;
    }
    if (!hasValidUsername) {
      alert("Username must be 3-20 characters and use only letters, numbers, and underscores.");
      return;
    }
    if (savedSnapshot && !canChangeFullName && formData.fullName.trim() !== savedSnapshot.fullName) {
      alert("You can change your full name only once.");
      return;
    }
    if (savedSnapshot && !canChangeUsername && formData.username.trim() !== savedSnapshot.username) {
      if (nextUsernameChangeDateLabel) {
        alert(`You can change your username once every month. Next change available on ${nextUsernameChangeDateLabel}.`);
      } else {
        alert("You can change your username once every month.");
      }
      return;
    }
    if (!hasBio) {
      alert("Bio is required.");
      return;
    }

    setIsLoading(true);
    try {
      const fullNameChangedThisSave =
        !!savedSnapshot && formData.fullName.trim() !== savedSnapshot.fullName;
      const usernameChangedThisSave =
        !!savedSnapshot && formData.username.trim() !== savedSnapshot.username;

      const updatePayload: Parameters<typeof updateUserProfile>[1] = {
        fullName: formData.fullName.trim(),
        username: formData.username.trim(),
        location: formData.location.trim(),
        description: formData.bio.trim(),
        bio: formData.bio.trim(),
        ...(isProvider ? { skills } : {}),
      };

      const updated = await updateUserProfile(user.uid, updatePayload);

      setPendingFullName(updated.pendingFullName || null);
      const serverUsernameChangeDate = updated.lastUsernameChangeDate || null;
      const nowIso = new Date().toISOString();
      const resolvedUsernameLockDate =
        serverUsernameChangeDate || (usernameChangedThisSave ? nowIso : null);
      setLastUsernameChangeDate(
        resolvedUsernameLockDate
      );
      const serverFullNameChangeDate = (updated as UserData & { lastFullNameChangeDate?: string }).lastFullNameChangeDate || null;
      // Enforce one-time full name edit immediately after first successful change
      // even if legacy records don't return the timestamp yet.
      const resolvedFullNameLockDate =
        serverFullNameChangeDate || (fullNameChangedThisSave ? nowIso : null);
      setLastFullNameChangeDate(
        resolvedFullNameLockDate
      );
      if (typeof window !== "undefined") {
        if (resolvedFullNameLockDate) {
          localStorage.setItem(LOCAL_FULLNAME_LOCK_KEY, resolvedFullNameLockDate);
          setLocalLastFullNameChangeDate(resolvedFullNameLockDate);
        }
        if (resolvedUsernameLockDate) {
          localStorage.setItem(LOCAL_USERNAME_LOCK_KEY, resolvedUsernameLockDate);
          setLocalLastUsernameChangeDate(resolvedUsernameLockDate);
        }
      }
      setSavedSnapshot({
        fullName: formData.fullName.trim(),
        username: formData.username.trim(),
        location: formData.location.trim(),
        bio: formData.bio.trim(),
        skills: [...skills],
      });

      if (updated.pendingFullName) {
        setShowPendingApprovalModal(true);
      } else {
        const returnTo = searchParams.get("returnTo");
        if (returnTo) {
          router.push(returnTo);
        } else {
          router.push(`/profile/${user.uid}`);
        }
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to update profile. Please try again.";
      alert(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingData) {
    return (
      <DashboardLayout>
        <div className="flex min-h-screen items-center justify-center bg-white dark:bg-darkBlue-013">
          <div className="text-gray-600 dark:text-gray-300">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  const navigateAfterSave = () => {
    if (!user?.uid) return;
    const returnTo = searchParams.get("returnTo");
    if (returnTo) router.push(returnTo);
    else router.push(`/profile/${user.uid}`);
  };

  return (
    <DashboardLayout>
      {showPendingApprovalModal ? (
        <div
          className="fixed inset-0 z-[270] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pending-approval-dialog-title"
        >
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-darkBlue-013">
            <h2
              id="pending-approval-dialog-title"
              className="text-lg font-semibold text-gray-900 dark:text-white"
            >
              Profile saved
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-700 dark:text-white/95">
              Your profile was saved. Your new display name is pending admin approval because you are a
              provider.
            </p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowPendingApprovalModal(false);
                  navigateAfterSave();
                }}
                className="rounded-lg bg-[#F21A1A] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="min-h-screen bg-white pb-28 dark:bg-darkBlue-003 lg:bg-gray-50 lg:pb-12">
        <div className="mx-auto max-w-lg px-4 py-6 lg:max-w-2xl lg:py-10">
          <h1 className="mb-6 text-center text-xl font-bold text-gray-900 dark:text-white lg:text-2xl">
            Edit Your Profile
          </h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Photo + full name + provider notice */}
            <div className="flex gap-4">
              <div className="flex shrink-0 flex-col items-center">
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-3xl font-semibold text-gray-600 dark:bg-white/10 dark:text-white">
                  {photoPreview ? (
                    <img src={photoPreview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span>{getInitials(formData.fullName || user?.email?.split("@")[0] || "U")}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  Upload Photo here
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </div>
              <div className="min-w-0 flex-1 pt-1">
                <div className="relative">
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => {
                      if (!canChangeFullName) return;
                      setFormData({ ...formData, fullName: e.target.value });
                    }}
                    disabled={!canChangeFullName}
                    readOnly={!canChangeFullName}
                    tabIndex={canChangeFullName ? 0 : -1}
                    onFocus={(e) => {
                      if (!canChangeFullName) e.currentTarget.blur();
                    }}
                    onKeyDown={(e) =>
                      canChangeFullName &&
                      acceptGhostOnTab(e, fullNameGhost, (full) =>
                        setFormData((prev) => ({ ...prev, fullName: full }))
                      )
                    }
                    onPointerDown={(e) =>
                      canChangeFullName &&
                      acceptGhostOnTouchTap(e, fullNameGhost, (full) =>
                        setFormData((prev) => ({ ...prev, fullName: full }))
                      )
                    }
                    placeholder="Name"
                    className={cn(
                      "relative z-0 w-full rounded-[18px] border-0 bg-gray-100 px-4 py-3 text-base text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/40 dark:bg-darkBlue-013 dark:text-white dark:placeholder:text-white/70",
                      !canChangeFullName && "pointer-events-none cursor-not-allowed select-none opacity-80"
                    )}
                  />
                  {canChangeFullName ? (
                    <GhostOverlay
                      value={formData.fullName}
                      tail={fullNameGhost?.tail ?? ""}
                      paddingClassName="px-4 py-3"
                      radiusClassName="rounded-[18px]"
                    />
                  ) : null}
                </div>
                {isProvider ? (
                  <p className="mt-2 text-sm font-medium leading-snug text-red-600 dark:text-red-400">
                    As a provider, further name changes require admin approval. Contact support for assistance.
                  </p>
                ) : null}
                <p className="mt-2 text-sm text-gray-800 dark:text-gray-200">
                  Full name can be changed once. After first change, this field becomes non-editable.
                </p>
                {!canChangeFullName ? (
                  <p className="mt-1.5 text-sm font-medium text-red-600 dark:text-red-400">
                    Full name cannot be edited now.
                  </p>
                ) : null}
                {pendingFullName ? (
                  <p className="mt-2 text-xs leading-snug text-red-600 dark:text-red-400">
                    Name change pending review: &quot;{pendingFullName}&quot;
                  </p>
                ) : null}
              </div>
            </div>

            {/* Username */}
            <div>
              <div className="relative">
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => {
                    if (!canChangeUsername) return;
                    setFormData({ ...formData, username: e.target.value });
                  }}
                  disabled={!canChangeUsername}
                  readOnly={!canChangeUsername}
                  tabIndex={canChangeUsername ? 0 : -1}
                  onFocus={(e) => {
                    if (!canChangeUsername) e.currentTarget.blur();
                  }}
                  onKeyDown={(e) =>
                    canChangeUsername &&
                    acceptGhostOnTab(e, usernameGhost, (full) =>
                      setFormData((prev) => ({ ...prev, username: full }))
                    )
                  }
                  onPointerDown={(e) =>
                    canChangeUsername &&
                    acceptGhostOnTouchTap(e, usernameGhost, (full) =>
                      setFormData((prev) => ({ ...prev, username: full }))
                    )
                  }
                  placeholder="Username"
                  className={cn(
                    "relative z-0 w-full rounded-[24px] border-0 bg-gray-100 px-4 py-3.5 text-base text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/40 dark:bg-darkBlue-013 dark:text-white dark:placeholder:text-white/70",
                    !canChangeUsername && "pointer-events-none cursor-not-allowed select-none opacity-80"
                  )}
                />
                {canChangeUsername ? (
                  <GhostOverlay
                    value={formData.username}
                    tail={usernameGhost?.tail ?? ""}
                    paddingClassName="px-4 py-3.5"
                    radiusClassName="rounded-[24px]"
                  />
                ) : null}
              </div>
              <p className="mt-2 text-sm text-gray-800 dark:text-gray-200">
                Username is unique. You can change it again after 1 month.
              </p>
              {!canChangeUsername && nextUsernameChangeDateLabel ? (
                <p className="mt-1.5 text-sm font-medium text-red-600 dark:text-red-400">
                  You can change your username once every month. Next change available on {nextUsernameChangeDateLabel}.
                </p>
              ) : null}
              {!hasValidUsername ? (
                <p className="mt-1.5 text-sm font-medium text-red-600 dark:text-red-400">
                  Username must be 3-20 chars, start with a letter, and contain only letters, numbers, and _.
                </p>
              ) : null}
            </div>

            {/* Email */}
            <div>
              <input
                type="email"
                value={formData.email}
                readOnly
                className="w-full cursor-not-allowed rounded-[24px] border-0 bg-gray-100 px-4 py-3.5 text-base text-gray-700 dark:bg-darkBlue-013 dark:text-white/80"
              />
            </div>

            {/* Location */}
            <div className="relative">
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                onKeyDown={(e) =>
                  acceptGhostOnTab(e, locationGhost, (full) =>
                    setFormData((prev) => ({ ...prev, location: full }))
                  )
                }
                onPointerDown={(e) =>
                  acceptGhostOnTouchTap(e, locationGhost, (full) =>
                    setFormData((prev) => ({ ...prev, location: full }))
                  )
                }
                placeholder="Location"
                className="relative z-0 w-full rounded-[24px] border-0 bg-gray-100 py-3.5 pl-4 pr-12 text-base text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/40 dark:bg-darkBlue-013 dark:text-white dark:placeholder:text-white/70"
              />
              <GhostOverlay
                value={formData.location}
                tail={locationGhost?.tail ?? ""}
                paddingClassName="py-3.5 pl-4 pr-12"
                radiusClassName="rounded-[24px]"
              />
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={isFetchingLocation}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-500 hover:bg-gray-200 disabled:cursor-not-allowed dark:text-white/80 dark:hover:bg-white/10"
                aria-label="Use current location"
              >
                {isFetchingLocation ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <MapPin className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Skills */}
            {isProvider ? <div>
              <div className="relative flex rounded-2xl border border-black bg-white dark:border-white dark:bg-darkBlue-203/50">
                <div className="relative min-w-0 flex-1">
                  <input
                    type="text"
                    value={skillDraft}
                    onChange={(e) => setSkillDraft(e.target.value)}
                    onKeyDown={(e) => {
                      acceptGhostOnTab(e, skillDraftGhost, setSkillDraft);
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                    onPointerDown={(e) =>
                      acceptGhostOnTouchTap(e, skillDraftGhost, setSkillDraft)
                    }
                    placeholder="Skills"
                    className="relative z-0 min-w-0 flex-1 rounded-[24px] border-0 bg-transparent px-4 py-3.5 text-base text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-0 dark:text-white"
                  />
                  <GhostOverlay
                    value={skillDraft}
                    tail={skillDraftGhost?.tail ?? ""}
                    paddingClassName="px-4 py-3.5"
                    radiusClassName="rounded-[24px]"
                  />
                </div>
                <button
                  type="button"
                  onClick={addSkill}
                  className="flex w-12 shrink-0 items-center justify-center text-gray-800 hover:bg-gray-50 dark:text-white dark:hover:bg-white/10"
                  aria-label="Add skill"
                >
                  <Plus className="h-5 w-5" strokeWidth={2.5} />
                </button>
              </div>
              {skills.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-darkBlue-003 dark:border-white/15 dark:bg-white/10 dark:text-white"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => setSkills((s) => s.filter((x) => x !== skill))}
                        className="rounded p-0.5 hover:bg-black/5 dark:hover:bg-white/10"
                        aria-label={`Remove ${skill}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
              {!skillsOk ? (
                <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">
                  Skills cannot be empty. Please select at least one skill.
                </p>
              ) : null}
            </div> : null}

            {/* Bio */}
            <div>
              <div className="relative">
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  onKeyDown={(e) =>
                    acceptGhostOnTab(e, bioGhost, (full) =>
                      setFormData((prev) => ({ ...prev, bio: full }))
                    )
                  }
                  onPointerDown={(e) =>
                    acceptGhostOnTouchTap(e, bioGhost, (full) =>
                      setFormData((prev) => ({ ...prev, bio: full }))
                    )
                  }
                  rows={bioExpanded ? 10 : 5}
                  maxLength={BIO_MAX}
                  placeholder="Tell clients about your experience…"
                  className="relative z-0 w-full resize-none rounded-[24px] border-0 bg-gray-100 px-4 py-3.5 text-base text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/40 dark:bg-darkBlue-013 dark:text-white dark:placeholder:text-white/70"
                />
                <GhostOverlay
                  value={formData.bio}
                  tail={bioGhost?.tail ?? ""}
                  paddingClassName="px-4 py-3.5"
                  radiusClassName="rounded-[24px]"
                  multiline
                />
              </div>
              {formData.bio.length > 180 ? (
                <button
                  type="button"
                  onClick={() => setBioExpanded((x) => !x)}
                  className="mt-1 text-sm font-semibold text-red-600 dark:text-red-400"
                >
                  {bioExpanded ? "Less" : "More"}
                </button>
              ) : null}
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {bioLen} / {BIO_MAX} characters (min: {BIO_MIN})
              </p>
              {!bioOk ? (
                <p className="mt-1.5 text-sm font-medium text-red-600 dark:text-red-400">
                  Description must be between {BIO_MIN} and {BIO_MAX} characters.
                </p>
              ) : null}
              {!hasValidName ? (
                <p className="mt-1.5 text-sm font-medium text-red-600 dark:text-red-400">
                  Full name must be at least 2 characters and include a letter.
                </p>
              ) : null}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 rounded-full border border-gray-200 bg-gray-100 py-3.5 text-sm font-semibold text-gray-900 transition hover:bg-gray-200 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSave}
                className={cn(
                  "flex-1 rounded-full py-3.5 text-sm font-semibold transition",
                  canSave
                    ? "bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                    : "cursor-not-allowed bg-gray-400 text-white/95 dark:bg-gray-600 dark:text-gray-200",
                )}
              >
                {isLoading ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
